"""Database service layer for SentinelAI.

Provides small CRUD helpers around SQLAlchemy sessions for Settings.
Baselines already use `app.storage.prompt_baselines.PromptBaseline` + `app.storage.baseline_crud`.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.storage.db import SessionLocal
from app.utils.models import SettingsModel, SettingsVersionLog


class DatabaseService:
    @staticmethod
    @contextmanager
    def get_session() -> Session:
        session = SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


class SettingsRepository:
    @staticmethod
    def get_current(db: Session) -> Optional[SettingsModel]:
        return db.query(SettingsModel).order_by(SettingsModel.version.desc()).first()

    @staticmethod
    def create_default(db: Session, updated_by: str = "system") -> SettingsModel:
        settings = SettingsModel(
            warn_threshold=0.3,
            escalate_threshold=0.7,
            confidence_floor=0.5,
            prompt_anomaly_weight=0.3,
            jailbreak_attempt_weight=0.4,
            unsafe_output_weight=0.3,
            enforcement_mode="warn",
            version=1,
            updated_by=updated_by,
        )
        db.add(settings)
        db.flush()
        SettingsRepository._write_audit_log(db, settings, updated_by=updated_by)
        return settings

    @staticmethod
    def update(db: Session, patch: Dict[str, Any], updated_by: str = "system") -> SettingsModel:
        logger.debug("Database update called with patch: %s", patch)
        logger.debug("Updated by: %s", updated_by)

        current = SettingsRepository.get_current(db)
        if current is None:
            logger.info("No current settings found, creating default...")
            current = SettingsRepository.create_default(db, updated_by=updated_by)
        else:
            logger.debug("Current settings before update: %s", current.to_dict())

        current.warn_threshold = float(patch.get("warn_threshold", current.warn_threshold))
        current.escalate_threshold = float(patch.get("escalate_threshold", current.escalate_threshold))
        current.confidence_floor = float(patch.get("confidence_floor", current.confidence_floor))

        signal_weights = patch.get("signal_weights") or {}
        if isinstance(signal_weights, dict):
            logger.debug("Processing signal_weights: %s", signal_weights)
            if "prompt_anomaly" in signal_weights:
                current.prompt_anomaly_weight = float(signal_weights["prompt_anomaly"])
            if "jailbreak_attempt" in signal_weights:
                current.jailbreak_attempt_weight = float(signal_weights["jailbreak_attempt"])
            if "unsafe_output" in signal_weights:
                current.unsafe_output_weight = float(signal_weights["unsafe_output"])
        else:
            if "prompt_anomaly_weight" in patch:
                current.prompt_anomaly_weight = float(patch["prompt_anomaly_weight"])
            if "jailbreak_attempt_weight" in patch:
                current.jailbreak_attempt_weight = float(patch["jailbreak_attempt_weight"])
            if "unsafe_output_weight" in patch:
                current.unsafe_output_weight = float(patch["unsafe_output_weight"])

        if "enforcement_mode" in patch:
            current.enforcement_mode = str(patch["enforcement_mode"])

        current.version = int(current.version) + 1
        current.updated_at = datetime.utcnow()
        current.updated_by = updated_by

        logger.debug("Settings after update: %s", current.to_dict())

        SettingsRepository._write_audit_log(db, current, updated_by=updated_by)
        logger.debug("Audit log written successfully")
        
        return current

    @staticmethod
    def history(db: Session, limit: int = 10) -> List[SettingsVersionLog]:
        return (
            db.query(SettingsVersionLog)
            .order_by(SettingsVersionLog.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def _write_audit_log(db: Session, settings: SettingsModel, updated_by: str) -> None:
        snapshot = settings.to_dict()
        thresholds = {
            "warn_threshold": float(settings.warn_threshold),
            "escalate_threshold": float(settings.escalate_threshold),
            "confidence_floor": float(settings.confidence_floor),
        }

        entry = SettingsVersionLog(
            settings_id=int(settings.id or 0),
            version=int(settings.version),
            settings_snapshot=snapshot,
            thresholds_applied=thresholds,
            updated_by=updated_by,
        )
        db.add(entry)
