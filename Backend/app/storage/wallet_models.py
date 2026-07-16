import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, Enum, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.storage.db import Base


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True, unique=True)
    balance_credits = Column(Integer, nullable=False, default=0)
    total_purchased = Column(Integer, nullable=False, default=0)
    total_consumed = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    org = relationship("Organization", backref="wallet")


class TopUpStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class CreditTopUp(Base):
    __tablename__ = "credit_topups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    amount_cents = Column(Integer, nullable=False)
    credits = Column(Integer, nullable=False)
    stripe_payment_intent_id = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(20), nullable=False, default=TopUpStatus.PENDING.value)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    org = relationship("Organization", backref="credit_topups")


class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    usage_event_id = Column(Integer, ForeignKey("usage_events.id"), nullable=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True, index=True)
    model = Column(String(50), nullable=False)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    cost_credits = Column(Integer, nullable=False, default=0)
    source = Column(String(20), nullable=False, default="api")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
