import logging
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from app.storage.wallet_models import Wallet, CreditTopUp, TopUpStatus, TokenUsage
from app.storage.org_models import Organization

logger = logging.getLogger(__name__)

INITIAL_FREE_CREDITS = 1000


def ensure_wallet(org_id: int, db: DBSession) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.org_id == org_id).first()
    if not wallet:
        wallet = Wallet(
            org_id=org_id,
            balance_credits=INITIAL_FREE_CREDITS,
            total_purchased=0,
            total_consumed=0,
        )
        db.add(wallet)
        db.commit()
        logger.info("Created wallet for org %s with %s credits", org_id, INITIAL_FREE_CREDITS)
    return wallet


def get_wallet(org_id: int, db: DBSession) -> Optional[Wallet]:
    return db.query(Wallet).filter(Wallet.org_id == org_id).first()


def get_balance(org_id: int, db: DBSession) -> int:
    wallet = db.query(Wallet).filter(Wallet.org_id == org_id).first()
    return wallet.balance_credits if wallet else 0


def add_credits(org_id: int, credits: int, db: DBSession) -> Wallet:
    wallet = ensure_wallet(org_id, db)
    wallet.balance_credits += credits
    wallet.total_purchased += credits
    wallet.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Added %s credits to org %s (balance: %s)", credits, org_id, wallet.balance_credits)
    return wallet


def deduct_credits(org_id: int, credits: int, db: DBSession) -> bool:
    wallet = db.query(Wallet).filter(Wallet.org_id == org_id).first()
    if not wallet:
        logger.warning("No wallet for org %s", org_id)
        return False
    if wallet.balance_credits < credits:
        logger.warning("Insufficient credits for org %s: need %s, have %s", org_id, credits, wallet.balance_credits)
        return False
    wallet.balance_credits -= credits
    wallet.total_consumed += credits
    wallet.updated_at = datetime.now(timezone.utc)
    db.commit()
    return True


def has_sufficient_credits(org_id: int, required: int, db: DBSession) -> bool:
    wallet = db.query(Wallet).filter(Wallet.org_id == org_id).first()
    if not wallet:
        return False
    return wallet.balance_credits >= required


def record_token_usage(
    org_id: int,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cost_credits: int,
    usage_event_id: Optional[int] = None,
    api_key_id: Optional[int] = None,
    source: str = "api",
    db: Optional[DBSession] = None,
) -> TokenUsage:
    usage = TokenUsage(
        org_id=org_id,
        usage_event_id=usage_event_id,
        api_key_id=api_key_id,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        cost_credits=cost_credits,
        source=source,
    )
    if db:
        db.add(usage)
        db.commit()
    return usage


def get_org_token_usage(
    org_id: int,
    db: DBSession,
    limit: int = 50,
    offset: int = 0,
) -> list[TokenUsage]:
    return (
        db.query(TokenUsage)
        .filter(TokenUsage.org_id == org_id)
        .order_by(TokenUsage.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )


def get_org_credit_topups(
    org_id: int,
    db: DBSession,
    limit: int = 20,
) -> list[CreditTopUp]:
    return (
        db.query(CreditTopUp)
        .filter(CreditTopUp.org_id == org_id)
        .order_by(CreditTopUp.created_at.desc())
        .limit(limit)
        .all()
    )


MODEL_CREDIT_COST = {
    "claude-3-haiku": {"input_per_1k": 0.025, "output_per_1k": 0.125},
    "claude-3-sonnet": {"input_per_1k": 0.3, "output_per_1k": 1.5},
    "claude-3-opus": {"input_per_1k": 1.5, "output_per_1k": 7.5},
    "gpt-4o": {"input_per_1k": 0.5, "output_per_1k": 1.5},
    "gpt-4o-mini": {"input_per_1k": 0.015, "output_per_1k": 0.075},
    "sentinel-default": {"input_per_1k": 0.05, "output_per_1k": 0.25},
}

BASE_COST_PER_CALL = 1


def calculate_call_cost(input_tokens: int, output_tokens: int, model: str = "sentinel-default") -> int:
    rates = MODEL_CREDIT_COST.get(model, MODEL_CREDIT_COST["sentinel-default"])
    cost = BASE_COST_PER_CALL
    cost += (input_tokens / 1000) * rates["input_per_1k"]
    cost += (output_tokens / 1000) * rates["output_per_1k"]
    return max(1, round(cost))
