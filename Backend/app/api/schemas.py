from pydantic import BaseModel
from typing import List, Optional, Dict, Any
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
