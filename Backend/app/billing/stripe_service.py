"""
Stripe billing service for SentinelAI.

Handles subscription lifecycle, checkout sessions, customer portal,
and webhook event processing.
"""

import os
import logging
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from app.storage.billing_models import Subscription, SubscriptionStatus, Invoice, InvoiceStatus
from app.storage.org_models import Organization, PlanTier

logger = logging.getLogger(__name__)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

stripe = None


def _ensure_stripe():
    global stripe
    if stripe is None:
        import stripe as _stripe
        _stripe.api_key = STRIPE_SECRET_KEY
        stripe = _stripe
    return stripe


# ── Price IDs from env ──────────────────────────────────────────

def _price_id_for_tier(tier: PlanTier) -> Optional[str]:
    mapping = {
        PlanTier.PRO: os.getenv("STRIPE_PRICE_PRO"),
        PlanTier.ENTERPRISE: os.getenv("STRIPE_PRICE_ENTERPRISE"),
    }
    return mapping.get(tier)


# ── Checkout Session ────────────────────────────────────────────

def create_checkout_session(
    org_id: int,
    price_id: str,
    customer_id: Optional[str] = None,
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
) -> Optional[str]:
    """Create a Stripe Checkout session and return the URL."""
    stripe_ = _ensure_stripe()
    if not stripe_:
        logger.error("Stripe not configured — missing STRIPE_SECRET_KEY")
        return None

    try:
        session_params = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url or f"{FRONTEND_BASE_URL}/billing?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": cancel_url or f"{FRONTEND_BASE_URL}/billing",
            "metadata": {"org_id": str(org_id)},
            "subscription_data": {"metadata": {"org_id": str(org_id)}},
        }

        if customer_id:
            session_params["customer"] = customer_id

        session = stripe_.checkout.Session.create(**session_params)
        return session.url

    except Exception as e:
        logger.error("Failed to create checkout session: %s", e)
        return None


# ── Customer Portal ─────────────────────────────────────────────

def create_portal_session(
    customer_id: str,
    return_url: Optional[str] = None,
) -> Optional[str]:
    """Create a Stripe Customer Portal session and return the URL."""
    stripe_ = _ensure_stripe()
    if not stripe_:
        return None

    try:
        session = stripe_.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url or f"{FRONTEND_BASE_URL}/billing",
        )
        return session.url
    except Exception as e:
        logger.error("Failed to create portal session: %s", e)
        return None


# ── Customer Lookup / Creation ──────────────────────────────────

def get_or_create_customer(org: Organization, db: DBSession) -> Optional[str]:
    """Get existing Stripe customer ID or create a new customer."""
    stripe_ = _ensure_stripe()
    if not stripe_:
        return None

    existing_sub = db.query(Subscription).filter(
        Subscription.org_id == org.id,
        Subscription.status == SubscriptionStatus.ACTIVE,
    ).first()

    if existing_sub and existing_sub.stripe_customer_id:
        return existing_sub.stripe_customer_id

    try:
        customer = stripe_.Customer.create(
            name=org.name,
            metadata={"org_id": str(org.id), "org_slug": org.slug},
        )
        return customer.id
    except Exception as e:
        logger.error("Failed to create Stripe customer: %s", e)
        return None


# ── Webhook Handling ────────────────────────────────────────────

def verify_webhook_signature(payload: bytes, sig_header: str) -> Optional[dict]:
    """Verify Stripe webhook signature and return the event."""
    stripe_ = _ensure_stripe()
    if not stripe_ or not STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured — skipping webhook verification")
        return None

    try:
        event = stripe_.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        return event
    except Exception as e:
        logger.error("Webhook signature verification failed: %s", e)
        return None


def handle_checkout_completed(event: dict, db: DBSession) -> bool:
    """Handle checkout.session.completed event."""
    session = event["data"]["object"]
    org_id = int(session.get("metadata", {}).get("org_id", 0))
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not org_id or not customer_id or not subscription_id:
        logger.error("Missing data in checkout.session.completed event")
        return False

    stripe_ = _ensure_stripe()
    try:
        sub_data = stripe_.Subscription.retrieve(subscription_id)
        plan_tier = PlanTier.PRO

        existing = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first()

        if existing:
            existing.status = SubscriptionStatus(sub_data.status)
            existing.current_period_start = datetime.fromtimestamp(sub_data.current_period_start, tz=timezone.utc) if sub_data.current_period_start else None
            existing.current_period_end = datetime.fromtimestamp(sub_data.current_period_end, tz=timezone.utc) if sub_data.current_period_end else None
        else:
            sub = Subscription(
                org_id=org_id,
                stripe_subscription_id=subscription_id,
                stripe_customer_id=customer_id,
                plan_tier=plan_tier.value,
                status=SubscriptionStatus(sub_data.status),
                current_period_start=datetime.fromtimestamp(sub_data.current_period_start, tz=timezone.utc) if sub_data.current_period_start else None,
                current_period_end=datetime.fromtimestamp(sub_data.current_period_end, tz=timezone.utc) if sub_data.current_period_end else None,
            )
            db.add(sub)

        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org:
            org.plan_tier = plan_tier

        db.commit()
        logger.info("Subscription activated: org=%s, sub=%s", org_id, subscription_id)
        return True

    except Exception as e:
        db.rollback()
        logger.error("Failed to handle checkout completed: %s", e)
        return False


def handle_invoice_paid(event: dict, db: DBSession) -> bool:
    """Handle invoice.paid event."""
    invoice = event["data"]["object"]
    stripe_invoice_id = invoice.get("id")
    subscription_id = invoice.get("subscription")
    amount_due = invoice.get("amount_due", 0)
    amount_paid = invoice.get("amount_paid", 0)
    status = invoice.get("status", "paid")
    period_start = invoice.get("period_start")
    period_end = invoice.get("period_end")
    invoice_url = invoice.get("hosted_invoice_url")
    currency = invoice.get("currency", "usd")

    sub = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first() if subscription_id else None

    existing = db.query(Invoice).filter(
        Invoice.stripe_invoice_id == stripe_invoice_id
    ).first()

    if existing:
        return True

    inv = Invoice(
        org_id=sub.org_id if sub else 0,
        stripe_invoice_id=stripe_invoice_id,
        subscription_id=sub.id if sub else None,
        amount_due=amount_due,
        amount_paid=amount_paid,
        currency=currency,
        status=InvoiceStatus(status) if status in InvoiceStatus._value2member_map_ else InvoiceStatus.PAID,
        period_start=datetime.fromtimestamp(period_start, tz=timezone.utc) if period_start else None,
        period_end=datetime.fromtimestamp(period_end, tz=timezone.utc) if period_end else None,
        paid_at=datetime.now(timezone.utc),
        invoice_url=invoice_url,
    )
    db.add(inv)
    db.commit()
    logger.info("Invoice recorded: %s, amount=%s", stripe_invoice_id, amount_paid)
    return True


def handle_subscription_updated(event: dict, db: DBSession) -> bool:
    """Handle customer.subscription.updated event."""
    sub_data = event["data"]["object"]
    subscription_id = sub_data.get("id")
    status = sub_data.get("status")

    if not subscription_id:
        return False

    sub = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()

    if sub:
        sub.status = SubscriptionStatus(status) if status in SubscriptionStatus._value2member_map_ else SubscriptionStatus.ACTIVE
        sub.current_period_end = datetime.fromtimestamp(sub_data.get("current_period_end"), tz=timezone.utc) if sub_data.get("current_period_end") else None
        sub.cancel_at_period_end = sub_data.get("cancel_at_period_end", False)

        if status in ("canceled", "incomplete_expired", "unpaid"):
            org = db.query(Organization).filter(Organization.id == sub.org_id).first()
            if org:
                org.plan_tier = PlanTier.FREE

        db.commit()
        logger.info("Subscription updated: %s -> %s", subscription_id, status)

    return True
