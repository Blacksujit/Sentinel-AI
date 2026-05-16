from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.storage.usage_models import AuditLog

class AuditService:
    @staticmethod
    def log(
        db: Session,
        org_id: Optional[int],
        actor_user_id: Optional[int],
        actor_type: str,
        action: str,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        event_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        entry = AuditLog(
            org_id=org_id,
            actor_user_id=actor_user_id,
            actor_type=actor_type,
            action=action,
            target_type=target_type,
            target_id=target_id,
            ip=ip,
            user_agent=user_agent,
            event_metadata=event_metadata or {},
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.flush()
        return entry
