import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.auth.dependencies import require_authenticated_user
from app.storage.db import get_db
from app.storage.org_models import Organization, PlanTier
from app.storage.billing_models import Subscription, SubscriptionStatus, Invoice, InvoiceStatus
from app.billing.stripe_service import (
    create_checkout_session as stripe_create_checkout,
    create_portal_session as stripe_create_portal,
    get_or_create_customer,
    verify_webhook_signature,
    handle_checkout_completed,
    handle_invoice_paid,
    handle_subscription_updated,
)
from app.billing.topup_service import (
    get_credit_packs,
    create_topup_payment_intent,
    confirm_topup,
    handle_topup_webhook,
)
from app.services.wallet_service import (
    get_wallet,
    ensure_wallet,
    get_org_token_usage,
    get_org_credit_topups,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/config")
async def billing_config():
    return {
        "stripe_publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        "prices": {
            "pro": os.getenv("STRIPE_PRICE_PRO", ""),
            "team": os.getenv("STRIPE_PRICE_TEAM", ""),
            "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE", ""),
        },
        "credit_packs": get_credit_packs(),
    }


class CreateCheckoutRequest(BaseModel):
    org_id: str
    price_id: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CreateCheckoutResponse(BaseModel):
    url: Optional[str] = None
    error: Optional[str] = None


class CreatePortalRequest(BaseModel):
    org_id: str
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


class WalletResponse(BaseModel):
    balance_credits: int
    total_purchased: int
    total_consumed: int


class TokenUsageResponse(BaseModel):
    id: int
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_credits: int
    source: str
    created_at: str


class TopUpResponse(BaseModel):
    client_secret: str
    intent_id: str
    amount_cents: int
    credits: int


class CreditPackResponse(BaseModel):
    id: str
    credits: int
    amount_cents: int
    label: str


PLAN_LIMITS = {
    PlanTier.FREE: 1000,
    PlanTier.PRO: 50000,
    PlanTier.TEAM: 500000,
    PlanTier.ENTERPRISE: 999999999,
}


@router.post("/create-checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    req: CreateCheckoutRequest,
    request: Request,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    org = _resolve_org(req.org_id, db)

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
    org = _resolve_org(req.org_id, db)
    sub = db.query(Subscription).filter(
        Subscription.org_id == org.id,
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
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
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
    elif event_type == "payment_intent.succeeded":
        handle_topup_webhook(event, db)

    return {"received": True}


def _resolve_org(org_id: str, db: DBSession) -> Organization:
    """Resolve a Clerk org ID string to an Organization row."""
    org = db.query(Organization).filter(Organization.clerk_org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    org_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    org = _resolve_org(org_id, db)
    sub = db.query(Subscription).filter(
        Subscription.org_id == org.id,
        Subscription.status.in_([
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.TRIALING,
        ]),
    ).first()

    if not sub:
        return SubscriptionResponse(
            plan_tier=org.plan_tier.value,
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
    org_id: str,
    limit: int = 12,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    org = _resolve_org(org_id, db)
    invoices = db.query(Invoice).filter(
        Invoice.org_id == org.id,
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
    org_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    from app.services.usage_service import UsageService

    org = _resolve_org(org_id, db)

    used = UsageService.get_monthly_count(db, org.id)
    limit = PLAN_LIMITS.get(org.plan_tier, 1000)

    return UsageResponse(
        used=used,
        limit=limit,
        plan=org.plan_tier.value,
        remaining=max(0, limit - used),
    )


@router.get("/wallet", response_model=WalletResponse)
async def get_wallet_balance(
    org_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    org = _resolve_org(org_id, db)
    wallet = ensure_wallet(org.id, db)
    return WalletResponse(
        balance_credits=wallet.balance_credits,
        total_purchased=wallet.total_purchased,
        total_consumed=wallet.total_consumed,
    )


class CreateTopUpRequest(BaseModel):
    org_id: str
    pack_id: str


@router.post("/create-topup-intent", response_model=TopUpResponse)
async def create_topup_intent(
    req: CreateTopUpRequest,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    org = _resolve_org(req.org_id, db)

    from app.billing.stripe_service import _ensure_stripe
    _ensure_stripe()

    from app.storage.billing_models import Subscription as SubModel
    sub = db.query(SubModel).filter(
        SubModel.org_id == org.id,
        SubModel.status == SubscriptionStatus.ACTIVE,
    ).first()
    customer_id = sub.stripe_customer_id if sub else None

    result = create_topup_payment_intent(org.id, req.pack_id, customer_id=customer_id)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create payment intent")

    return TopUpResponse(**result)


@router.get("/token-usage", response_model=list[TokenUsageResponse])
async def list_token_usage(
    org_id: str,
    limit: int = 50,
    offset: int = 0,
    db: DBSession = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    org = _resolve_org(org_id, db)
    records = get_org_token_usage(org.id, db, limit=limit, offset=offset)
    return [
        TokenUsageResponse(
            id=r.id,
            model=r.model,
            input_tokens=r.input_tokens,
            output_tokens=r.output_tokens,
            total_tokens=r.total_tokens,
            cost_credits=r.cost_credits,
            source=r.source,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in records
    ]


@router.get("/credit-packs", response_model=list[CreditPackResponse])
async def list_credit_packs():
    packs = get_credit_packs()
    return [
        CreditPackResponse(id=k, **v)
        for k, v in packs.items()
    ]
