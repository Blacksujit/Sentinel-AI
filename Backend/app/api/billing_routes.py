"""Billing API routes — Stripe checkout, portal, and webhook handling."""

import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.auth.dependencies import require_authenticated_user
from app.storage.db import get_db
from app.storage.org_models import Organization, PlanTier
from app.storage.billing_models import Subscription, SubscriptionStatus, Invoice
from app.billing.stripe_service import (
    create_checkout_session as stripe_create_checkout,
    create_portal_session as stripe_create_portal,
    get_or_create_customer,
    verify_webhook_signature,
    handle_checkout_completed,
    handle_invoice_paid,
    handle_subscription_updated,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


# ── Config ──────────────────────────────────────────────────────

@router.get("/config")
async def billing_config():
    """Return Stripe publishable key and price IDs for the frontend."""
    return {
        "stripe_publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        "prices": {
            "pro": os.getenv("STRIPE_PRICE_PRO", ""),
            "team": os.getenv("STRIPE_PRICE_TEAM", ""),
            "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE", ""),
        },
    }


# ── Schemas ─────────────────────────────────────────────────────

class CreateCheckoutRequest(BaseModel):
    org_id: int
    price_id: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CreateCheckoutResponse(BaseModel):
    url: Optional[str] = None
    error: Optional[str] = None


class CreatePortalRequest(BaseModel):
    org_id: int
    return_url: Optional[str] = None


class CreatePortalResponse(BaseModel):
    url: Optional[str] = None
    error: Optional[str] = None


class SubscriptionResponse(BaseModel):
    plan_tier: str
    status: str
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False
    trial_end: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: int
    amount_due: int
    amount_paid: int
    currency: str
    status: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    paid_at: Optional[str] = None
    invoice_url: Optional[str] = None
    created_at: Optional[str] = None


class UsageResponse(BaseModel):
    used: int
    limit: int
    plan: str
    remaining: int


PLAN_LIMITS = {
    PlanTier.FREE: 1000,
    PlanTier.PRO: 50000,
    PlanTier.ENTERPRISE: 999999999,
}


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/create-checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    req: CreateCheckoutRequest,
    request: Request,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    """Create a Stripe Checkout session for subscription upgrade."""
    org = db.query(Organization).filter(Organization.id == req.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    customer_id = get_or_create_customer(org, db)

    url = stripe_create_checkout(
        org_id=req.org_id,
        price_id=req.price_id,
        customer_id=customer_id,
        success_url=req.success_url,
        cancel_url=req.cancel_url,
    )

    if not url:
        return CreateCheckoutResponse(error="Failed to create checkout session")

    return CreateCheckoutResponse(url=url)


@router.post("/create-portal", response_model=CreatePortalResponse)
async def create_portal(
    req: CreatePortalRequest,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    """Create a Stripe Customer Portal session for managing billing."""
    sub = db.query(Subscription).filter(
        Subscription.org_id == req.org_id,
        Subscription.status == SubscriptionStatus.ACTIVE,
    ).first()

    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    url = stripe_create_portal(
        customer_id=sub.stripe_customer_id,
        return_url=req.return_url,
    )

    if not url:
        return CreatePortalResponse(error="Failed to create portal session")

    return CreatePortalResponse(url=url)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: DBSession = Depends(get_db)):
    """Handle Stripe webhook events (checkout completed, invoice paid, subscription updated)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        logger.warning("Missing stripe-signature header")
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    event = verify_webhook_signature(payload, sig_header)
    if event is None:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event.get("type", "")
    logger.info("Stripe webhook received: %s", event_type)

    if event_type == "checkout.session.completed":
        handle_checkout_completed(event, db)

    elif event_type == "invoice.paid":
        handle_invoice_paid(event, db)

    elif event_type == "customer.subscription.updated":
        handle_subscription_updated(event, db)

    elif event_type == "customer.subscription.deleted":
        handle_subscription_updated(event, db)

    return {"received": True}


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    org_id: int,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    """Get current subscription details for an organization."""
    sub = db.query(Subscription).filter(
        Subscription.org_id == org_id,
        Subscription.status.in_([
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.TRIALING,
        ]),
    ).first()

    if not sub:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        return SubscriptionResponse(
            plan_tier=org.plan_tier.value if org else "free",
            status="none",
        )

    return SubscriptionResponse(
        plan_tier=sub.plan_tier,
        status=sub.status.value,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_end=sub.trial_end.isoformat() if sub.trial_end else None,
    )


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    org_id: int,
    limit: int = 12,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    """List recent invoices for an organization."""
    invoices = db.query(Invoice).filter(
        Invoice.org_id == org_id,
    ).order_by(Invoice.created_at.desc()).limit(limit).all()

    return [
        InvoiceResponse(
            id=inv.id,
            amount_due=inv.amount_due,
            amount_paid=inv.amount_paid or 0,
            currency=inv.currency or "usd",
            status=inv.status.value,
            period_start=inv.period_start.isoformat() if inv.period_start else None,
            period_end=inv.period_end.isoformat() if inv.period_end else None,
            paid_at=inv.paid_at.isoformat() if inv.paid_at else None,
            invoice_url=inv.invoice_url,
            created_at=inv.created_at.isoformat() if inv.created_at else None,
        )
        for inv in invoices
    ]


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    org_id: int,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    """Get current billing period usage for an organization."""
    from app.services.usage_service import UsageService

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    used = UsageService.get_monthly_count(db, org_id)
    limit = PLAN_LIMITS.get(org.plan_tier, 1000)

    return UsageResponse(
        used=used,
        limit=limit,
        plan=org.plan_tier.value,
        remaining=max(0, limit - used),
    )
