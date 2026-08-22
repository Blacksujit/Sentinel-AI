"""
Database Models for SentinelAI

This module contains SQLAlchemy models for settings, baselines, and audit logs.
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from datetime import datetime
from typing import Optional

from app.storage.db import Base

class SettingsModel(Base):
    """Settings model for storing SentinelAI configuration"""
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    warn_threshold = Column(Float, nullable=False, default=0.3)
    escalate_threshold = Column(Float, nullable=False, default=0.7)
    confidence_floor = Column(Float, nullable=False, default=0.5)
    
    # Signal weights stored as JSON
    prompt_anomaly_weight = Column(Float, nullable=False, default=0.3)
    jailbreak_attempt_weight = Column(Float, nullable=False, default=0.4)
    unsafe_output_weight = Column(Float, nullable=False, default=0.3)
    
    # Configuration
    enforcement_mode = Column(String(20), nullable=False, default="warn")
    pii_redaction_enabled = Column(Boolean, nullable=False, default=True)
    version = Column(Integer, nullable=False, default=1)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by = Column(String(100), nullable=True, default="system")
    
    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "warn_threshold": self.warn_threshold,
            "escalate_threshold": self.escalate_threshold,
            "confidence_floor": self.confidence_floor,
            "signal_weights": {
                "prompt_anomaly": self.prompt_anomaly_weight,
                "jailbreak_attempt": self.jailbreak_attempt_weight,
                "unsafe_output": self.unsafe_output_weight
            },
            "enforcement_mode": self.enforcement_mode,
            "pii_redaction_enabled": bool(self.pii_redaction_enabled),
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "updated_by": self.updated_by
        }

class GameScoreModel(Base):
    """Public leaderboard entry for the 'Hack the Sentinel' prompt-injection game."""
    __tablename__ = "game_scores"

    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String(100), nullable=False)
    levels_completed = Column(Integer, nullable=False, default=0)
    attempts = Column(Integer, nullable=False, default=0)
    ip_hash = Column(String(64), nullable=True, default=None)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "player_name": self.player_name,
            "levels_completed": self.levels_completed,
            "attempts": self.attempts,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SettingsVersionLog(Base):
    """Audit log for settings changes with version tracking"""
    __tablename__ = "settings_version_log"
    
    id = Column(Integer, primary_key=True, index=True)
    settings_id = Column(Integer, nullable=False)  # Foreign key to settings
    version = Column(Integer, nullable=False)
    
    # Complete settings snapshot at time of change
    settings_snapshot = Column(JSON, nullable=False)
    
    # What thresholds were applied
    thresholds_applied = Column(JSON, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by = Column(String(100), nullable=True, default="system")
    
    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "settings_id": self.settings_id,
            "version": self.version,
            "settings_snapshot": self.settings_snapshot,
            "thresholds_applied": self.thresholds_applied,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_by": self.updated_by
        }
