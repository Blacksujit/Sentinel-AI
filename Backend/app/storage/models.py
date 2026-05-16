from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from .db import Base


class RiskLog(Base):
    __tablename__ = "risk_logs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    prompt = Column(Text)
    response = Column(Text)
    final_risk_score = Column(Float)
    flags = Column(Text)  # JSON string storing risk flags (legacy)
    confidence = Column(Float, nullable=True)
    
    # Audit logging columns for full traceability
    decision = Column(String, nullable=False)  # allow/warn/block/escalate
    decision_reason = Column(String, nullable=False)  # Human-readable explanation
    signals = Column(Text, nullable=False)  # JSON string storing structured signal data for auditability

    # Settings traceability
    settings_version = Column(Integer, nullable=True)
    thresholds_applied = Column(Text, nullable=True)  # JSON string
    
    # External integration fields
    source = Column(String, nullable=True)  # Source application identifier (e.g., "customer-support-chatbot")
    user_id = Column(String, nullable=True)  # End user identifier from client application
    session_id = Column(String, nullable=True)  # Session identifier for tracking conversations
    client_metadata = Column(JSON, nullable=True)  # Client-specific metadata as JSON

    # Multi-tenant scoping
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)