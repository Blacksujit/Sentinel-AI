from sqlalchemy.orm import Session
from app.storage.models import RiskLog
import json
from typing import List, Optional


def log_risk_event(
    db: Session,
    prompt: str,
    response: str,
    final_risk_score: float,
    flags: List[str],
    confidence: Optional[float] = None,
    decision: str = None,
    decision_reason: str = None,
    signals: List[str] = None,
    settings_version: Optional[int] = None,
    thresholds_applied: Optional[dict] = None,
    source: Optional[str] = None,  # New: External source identification
    user_id: Optional[str] = None,  # New: User tracking
    session_id: Optional[str] = None,  # New: Session tracking
    client_metadata: Optional[dict] = None,  # New: Client metadata
):
    """Log a risk analysis event to the database with full audit information."""
    try:
        risk_log = RiskLog(
            prompt=prompt,
            response=response,
            final_risk_score=final_risk_score,  # Keep existing field
            flags=json.dumps(flags),        # Legacy field
            confidence=confidence,            # Keep existing field
            # created_at is auto-managed by database
            decision=decision or "unknown",  # New audit field
            decision_reason=decision_reason or "No reason provided",  # New audit field
            signals=json.dumps(signals or []),  # New audit field - as JSON
            settings_version=settings_version,
            thresholds_applied=json.dumps(thresholds_applied) if thresholds_applied is not None else None,
            # New external integration fields
            source=source,
            user_id=user_id,
            session_id=session_id,
            client_metadata=client_metadata,
        )
        db.add(risk_log)
        db.commit()
        db.refresh(risk_log)
        return risk_log
    except Exception as e:
        # On failure: rollback and re-raise
        db.rollback()
        raise e


def get_recent_risk_logs(db: Session, limit: int = 50):
    """Fetch recent risk logs from the database."""
    return (
        db.query(RiskLog)
        .order_by(RiskLog.created_at.desc())
        .limit(limit)
        .all()
    )


def get_risk_log_by_id(db: Session, log_id: int) -> Optional[RiskLog]:
    """Fetch a single risk log by ID."""
    return db.query(RiskLog).filter(RiskLog.id == log_id).first()
