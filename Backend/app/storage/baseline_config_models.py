"""
Baseline configuration models for organization risk settings.
Versioned configuration management with audit trail.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.storage.db import Base


class BaselineConfiguration(Base):
    """Organization-specific risk baseline configuration."""
    __tablename__ = "baseline_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Risk thresholds (0-100 scale)
    risk_threshold_low = Column(Float, default=30.0)
    risk_threshold_medium = Column(Float, default=60.0)
    risk_threshold_high = Column(Float, default=85.0)
    risk_threshold_critical = Column(Float, default=95.0)
    
    # Model sensitivity
    model_sensitivity = Column(String(20), default="medium")  # low, medium, high, critical
    
    # Alert configuration
    alert_on_block = Column(Boolean, default=True)
    alert_on_high_risk = Column(Boolean, default=True)
    alert_on_critical = Column(Boolean, default=True)
    alert_email = Column(String(255), nullable=True)
    alert_webhook_url = Column(String(500), nullable=True)
    
    # Detection flags configuration
    enabled_detectors = Column(JSON, default=list)  # ["prompt_anomaly", "jailbreak_rag", ...]
    custom_rules = Column(JSON, default=list)  # Organization-specific rules
    
    # Versioning
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization")
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    updated_by = relationship("User", foreign_keys=[updated_by_user_id])


class BaselineConfigurationHistory(Base):
    """Historical record of baseline configuration changes."""
    __tablename__ = "baseline_configuration_history"
    
    id = Column(Integer, primary_key=True, index=True)
    baseline_config_id = Column(Integer, ForeignKey("baseline_configurations.id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Snapshot of configuration
    config_snapshot = Column(JSON, nullable=False)
    
    # Change details
    change_type = Column(String(50), nullable=False)  # created, updated, activated, deactivated
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    change_reason = Column(String(500), nullable=True)
    
    # Diff tracking
    previous_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    baseline_config = relationship("BaselineConfiguration")
    organization = relationship("Organization")
    changed_by = relationship("User")


# Default baseline configuration for new organizations
DEFAULT_BASELINE_CONFIG = {
    "risk_threshold_low": 30.0,
    "risk_threshold_medium": 60.0,
    "risk_threshold_high": 85.0,
    "risk_threshold_critical": 95.0,
    "model_sensitivity": "medium",
    "alert_on_block": True,
    "alert_on_high_risk": True,
    "alert_on_critical": True,
    "enabled_detectors": [
        "prompt_anomaly",
        "jailbreak_rag",
        "output_risk",
        "pattern_match"
    ],
    "custom_rules": []
}
