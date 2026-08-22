from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime


class AnalyzeRequest(BaseModel):
    prompt: str
    response: str


class AnalyzeResponse(BaseModel):
    final_risk_score: float
    flags: List[str]
    confidence: Optional[float] = None
    decision: Optional[str] = None
    action_taken: Optional[str] = None
    decision_reason: Optional[str] = None
    settings_version: Optional[int] = None
    thresholds_applied: Optional[Any] = None
    log_id: Optional[str] = None  # ID for feedback reporting
    redacted_prompt: Optional[str] = None  # PII-redacted prompt (only when PII found)
    redacted_response: Optional[str] = None  # PII-redacted response (only when PII found)
    pii: Optional[Dict[str, Any]] = None  # PII detection summary


class RiskLogResponse(BaseModel):
    id: int
    created_at: datetime
    final_risk_score: float
    prompt: Optional[str] = None
    response: Optional[str] = None
    flags: List[str]
    signals: Optional[Any] = None
    confidence: Optional[float] = None
    decision: Optional[str] = None
    action_taken: Optional[str] = None
    decision_reason: Optional[str] = None
    settings_version: Optional[int] = None
    thresholds_applied: Optional[Any] = None
    source: Optional[str] = None  # New field for external source identification
    client_metadata: Optional[Dict[str, Any]] = None  # New field for client app metadata
    user_id: Optional[str] = None  # New field for user identification
    session_id: Optional[str] = None  # New field for session identification
    org_id: Optional[int] = None
    workspace_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class ExternalAnalyzeRequest(BaseModel):
    prompt: str
    response: str
    source: str  # Client application identifier (e.g., "customer-support-chatbot")
    user_id: Optional[str] = None  # End user identifier
    session_id: Optional[str] = None  # Session identifier for tracking
    client_metadata: Optional[Dict[str, Any]] = {}  # Additional client-specific data
    api_key: Optional[str] = None  # For future authentication
    redact: bool = False  # Request PII-redacted prompt/response in the response


class ExternalAnalyzeResponse(BaseModel):
    final_risk_score: float
    flags: List[str]
    confidence: Optional[float] = None
    decision: Optional[str] = None
    action_taken: Optional[str] = None
    decision_reason: Optional[str] = None
    settings_version: Optional[int] = None
    thresholds_applied: Optional[Any] = None
    analysis_id: Optional[int] = None  # ID for tracking this analysis
    timestamp: Optional[datetime] = None
    redacted_prompt: Optional[str] = None  # PII-redacted prompt (only when redact=True)
    redacted_response: Optional[str] = None  # PII-redacted response (only when redact=True)
    pii: Optional[Dict[str, Any]] = None  # PII detection summary (only when redact=True)


class ReviewRequest(BaseModel):
    disposition: Literal["confirmed_threat", "false_positive", "compliance_issue"]
    notes: Optional[str] = None


class ReviewResponse(BaseModel):
    success: bool
    feedback_id: str
    log_id: int
    disposition: str
    message: str


class ReviewQueueItem(RiskLogResponse):
    reviewed: bool = False
