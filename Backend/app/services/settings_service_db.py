"""Settings service backed by the database."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.services.database_service import DatabaseService, SettingsRepository
from app.utils.models import SettingsModel, SettingsVersionLog


class SettingsService:
    _instance = None
    _current: Optional[SettingsModel] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load(self) -> SettingsModel:
        with DatabaseService.get_session() as db:
            settings = SettingsRepository.get_current(db)
            if settings is None:
                settings = SettingsRepository.create_default(db)
            self._current = settings
            return settings

    def reload_settings(self) -> bool:
        with DatabaseService.get_session() as db:
            latest = SettingsRepository.get_current(db)
            if latest is None:
                latest = SettingsRepository.create_default(db)

            if self._current is None or latest.version != self._current.version:
                self._current = latest
                return True
        return False

    def get_settings(self) -> Dict[str, Any]:
        if self._current is None:
            self._load()
        return self._current.to_dict()

    def update_settings(self, settings_data: Dict[str, Any], updated_by: str = "system") -> Dict[str, Any]:
        with DatabaseService.get_session() as db:
            updated = SettingsRepository.update(db, settings_data, updated_by=updated_by)
            self._current = updated
            return updated.to_dict()

    def get_signal_weights(self) -> Dict[str, float]:
        if self._current is None:
            self._load()
        return {
            "prompt_anomaly": float(self._current.prompt_anomaly_weight),
            "jailbreak_attempt": float(self._current.jailbreak_attempt_weight),
            "unsafe_output": float(self._current.unsafe_output_weight),
        }

    def get_thresholds(self) -> Dict[str, float]:
        if self._current is None:
            self._load()
        return {
            "warn_threshold": float(self._current.warn_threshold),
            "escalate_threshold": float(self._current.escalate_threshold),
            "confidence_floor": float(self._current.confidence_floor),
        }

    def get_enforcement_mode(self) -> str:
        if self._current is None:
            self._load()
        return str(self._current.enforcement_mode)

    def get_pii_redaction_enabled(self) -> bool:
        if self._current is None:
            self._load()
        return bool(getattr(self._current, "pii_redaction_enabled", True))

    def get_settings_version(self) -> int:
        if self._current is None:
            self._load()
        return int(self._current.version)

    def get_settings_history(self, limit: int = 10, offset: int = 0) -> List[SettingsVersionLog]:
        if self._current is None:
            self._load()
        with DatabaseService.get_session() as db:
            return db.query(SettingsVersionLog)\
                   .order_by(SettingsVersionLog.created_at.desc())\
                   .offset(offset)\
                   .limit(limit)\
                   .all()

settings_service = SettingsService()
