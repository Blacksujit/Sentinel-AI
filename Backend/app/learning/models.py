"""
Database models for jailbreak detection learning loop.
Stores feedback, patterns, and detection history for continuous improvement.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, JSON, Integer
from app.storage.db import Base


class FeedbackEntry(Base):
    """Stores user-reported and auto-detected missed jailbreaks."""
    __tablename__ = "detection_feedback"
    
    id = Column(String(36), primary_key=True)
    prompt_hash = Column(String(64), index=True)  # SHA256 hash for deduplication
    prompt_text = Column(Text)
    response_text = Column(Text)
    detection_score = Column(Float)
    final_risk_score = Column(Float)
    user_reported = Column(Boolean, default=False)
    auto_detected = Column(Boolean, default=False)  # Detected by response monitor
    timestamp = Column(DateTime, default=datetime.utcnow)
    conversation_id = Column(String(36), index=True)
    user_id = Column(String(100), index=True)
    compliance_detected = Column(Boolean, default=False)
    attack_category = Column(String(50))  # jailbreak, prompt_injection, etc.
    flags = Column(JSON, default=list)  # Existing flags that triggered
    metadata_json = Column(JSON, default=dict)  # Additional context (renamed from metadata to avoid SQLAlchemy reserved name)
    reviewed = Column(Boolean, default=False)  # Admin reviewed
    used_for_training = Column(Boolean, default=False)


class ExtractedPattern(Base):
    """Extracted patterns from missed detections."""
    __tablename__ = "extracted_patterns"
    
    id = Column(String(36), primary_key=True)
    feedback_id = Column(String(36), index=True)
    semantic_intent = Column(String(200))
    key_phrases = Column(JSON, default=list)
    embedding_vector = Column(JSON)  # Stored as JSON array
    pattern_type = Column(String(50))  # semantic, syntactic, contextual
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    occurrence_count = Column(Integer, default=1)
    variations = Column(JSON, default=list)


class DetectionLog(Base):
    """Logs every prompt/response for analysis."""
    __tablename__ = "detection_logs"
    
    id = Column(String(36), primary_key=True)
    prompt_hash = Column(String(64), index=True)
    prompt_text = Column(Text)
    response_text = Column(Text)
    user_id = Column(String(100), index=True)
    conversation_id = Column(String(36), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    detection_score = Column(Float)
    final_risk_score = Column(Float)
    flags_triggered = Column(JSON, default=list)
    action_taken = Column(String(50))  # blocked, warned, allowed
    processing_time_ms = Column(Float)
    model_version = Column(String(20))


# Pydantic models for API
class FeedbackSubmission(BaseModel):
    """Model for submitting feedback about missed detection."""
    log_id: Optional[str] = None
    prompt_text: str
    response_text: Optional[str] = None
    feedback_type: str = Field(..., pattern="^(missed_jailbreak|false_positive|compliance_issue)$")
    notes: Optional[str] = None
    conversation_id: Optional[str] = None
    attack_category: Optional[str] = "unknown"


class FeedbackResponse(BaseModel):
    """Response after submitting feedback."""
    success: bool
    feedback_id: str
    message: str
    extracted_patterns: List[Dict[str, Any]] = []


class PatternSubmission(BaseModel):
    """Model for submitting new patterns."""
    pattern_text: str
    pattern_type: str = Field(..., pattern="^(regex|semantic|embedding)$")
    severity: float = Field(..., ge=0.0, le=1.0)
    description: Optional[str] = None


class FeedbackStats(BaseModel):
    """Statistics about feedback."""
    total_feedback: int
    user_reported: int
    auto_detected: int
    reviewed: int
    used_for_training: int
    by_category: Dict[str, int]
    recent_trend: List[Dict[str, Any]]


class DetectionMetrics(BaseModel):
    """Real-time detection performance metrics."""
    detection_rate: float
    false_negative_rate: float
    false_positive_rate: float
    avg_detection_time_ms: float
    new_patterns_last_24h: int
    pending_review: int
