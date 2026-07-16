import os
import logging
from typing import Optional

from sqlalchemy.orm import Session as DBSession

from app.storage.wallet_models import CreditTopUp, TopUpStatus
from app.storage.org_models import Organization
from app.services.wallet_service import add_credits

logger = logging.getLogger(__name__)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

stripe = None


def _ensure_stripe():
    global stripe
    if stripe is None:
        import stripe as _stripe
        _stripe.api_key = STRIPE_SECRET_KEY
        stripe = _stripe
    return stripe


CREDIT_PACKS = {
    "credits_1000": {"credits": 1000, "amount_cents": 1000, "label": "1,000 Credits"},
    "credits_5000": {"credits": 5000, "amount_cents": 5000, "label": "5,000 Credits"},
    "credits_10000": {"credits": 10000, "amount_cents": 10000, "label": "10,000 Credits"},
    "credits_25000": {"credits": 25000, "amount_cents": 25000, "label": "25,000 Credits"},
}


def get_credit_packs():
    return CREDIT_PACKS


def create_topup_payment_intent(
    org_id: int,
    pack_id: str,
    customer_id: Optional[str] = None,
) -> Optional[dict]:
    stripe_ = _ensure_stripe()
    if not stripe_:
        logger.error("Stripe not configured")
        return None

    pack = CREDIT_PACKS.get(pack_id)
    if not pack:
        logger.error("Unknown credit pack: %s", pack_id)
        return None

    try:
        intent_params = {
            "amount": pack["amount_cents"],
            "currency": "usd",
            "metadata": {
                "org_id": str(org_id),
                "purpose": "credit_topup",
                "pack_id": pack_id,
                "credits": str(pack["credits"]),
            },
            "description": f"SentinelAI top-up — {pack['label']}",
        }
        if customer_id:
            intent_params["customer"] = customer_id

        intent = stripe_.PaymentIntent.create(**intent_params)
        return {
            "client_secret": intent.client_secret,
            "intent_id": intent.id,
            "amount_cents": pack["amount_cents"],
            "credits": pack["credits"],
        }

    except Exception as e:
        logger.error("Failed to create payment intent: %s", e)
        return None


def confirm_topup(
    payment_intent_id: str,
    db: DBSession,
) -> bool:
    stripe_ = _ensure_stripe()
    if not stripe_:
        return False

    try:
        intent = stripe_.PaymentIntent.retrieve(payment_intent_id)
        if intent.status != "succeeded":
            logger.warning("PaymentIntent %s status: %s", payment_intent_id, intent.status)
            return False

        org_id = int(intent.metadata.get("org_id", 0))
        credits = int(intent.metadata.get("credits", 0))
        amount_cents = intent.amount

        if not org_id or not credits:
            logger.error("Missing metadata on PaymentIntent %s", payment_intent_id)
            return False

        existing = db.query(CreditTopUp).filter(
            CreditTopUp.stripe_payment_intent_id == payment_intent_id
        ).first()
        if existing:
            return True

        topup = CreditTopUp(
            org_id=org_id,
            amount_cents=amount_cents,
            credits=credits,
            stripe_payment_intent_id=payment_intent_id,
            status=TopUpStatus.COMPLETED.value,
        )
        db.add(topup)

        add_credits(org_id, credits, db)

        logger.info(
            "Credit top-up completed: org=%s, credits=%s, amount=%s",
            org_id, credits, amount_cents,
        )
        return True

    except Exception as e:
        logger.error("Failed to confirm top-up: %s", e)
        return False


def handle_topup_webhook(event: dict, db: DBSession) -> bool:
    intent = event["data"]["object"]
    payment_intent_id = intent.get("id")
    status = intent.get("status")

    if status == "succeeded" and intent.get("metadata", {}).get("purpose") == "credit_topup":
        return confirm_topup(payment_intent_id, db)

    return False
