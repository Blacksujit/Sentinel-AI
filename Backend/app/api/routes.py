"""
FastAPI Routes for Sentinel AI Analysis

This module defines the API routes for analyzing AI prompts and responses
to detect potential risks and anomalies.
"""
print("ROUTES.PY LOADED")

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from sqlalchemy.orm import Session
import json
from datetime import datetime

# Import API key authentication
from app.middleware.auth import get_api_key_dependency

# Import centralized risk configuration
from app.config.risk_config import (
    ALLOW_MAX,
    WARN_MIN, 
    BLOCK_MIN,
    ESCALATE_MIN
)

from app.api.schemas import AnalyzeRequest, AnalyzeResponse, RiskLogResponse, ExternalAnalyzeRequest, ExternalAnalyzeResponse
from app.monitors.prompt_anomaly import detect_prompt_anomaly
from app.scoring.output_risk import score_output_risk
from app.scoring.aggregator import aggregate_risk_signals
from app.storage.crud import log_risk_event, get_recent_risk_logs, get_risk_log_by_id
from app.storage.db import SessionLocal
from app.signals.registry import SignalRegistry
from app.services.settings_service_db import settings_service
from app.agent.reasoner import RiskReasoner
from app.policy.engine import PolicyEngine
from app.actions.executor import ActionExecutor
from app.monitors.jailbreak_rag import detect_jailbreak_rag

# Create router instance
router = APIRouter()

# Create and configure signal registry
signal_registry = SignalRegistry()
signal_registry.register("prompt_anomaly", detect_prompt_anomaly, "prompt")
signal_registry.register("jailbreak_rag", detect_jailbreak_rag, "prompt")
signal_registry.register("output_risk", score_output_risk, "output")

# Create agentic pipeline components
risk_reasoner = RiskReasoner()
policy_engine = PolicyEngine()
action_executor = ActionExecutor()


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_interaction(request: AnalyzeRequest, db: Session = Depends(get_db)) -> AnalyzeResponse:
    """
    Analyze AI interaction for potential risks and anomalies.
    
    This endpoint performs comprehensive risk analysis by:
    1. Detecting prompt anomalies using similarity analysis
    2. Scoring output risk using rule-based heuristics  
    3. Aggregating signals into a unified risk assessment
    
    Args:
        request: Analysis request containing prompt and response
        
    Returns:
        Analysis results with final risk score and triggered flags
    """
    # Reload settings if changed
    settings_service.reload_settings()
    
    # Get current settings version for logging
    settings_version = settings_service.get_settings_version()
    # Step 1: Run prompt signal detectors
    prompt_signals = signal_registry.run_detectors("prompt", prompt=request.prompt)
    
    # Step 2: Run output signal detectors
    output_signals = signal_registry.run_detectors("output", text=request.response)
    
    # Debug print to show signal propagation
    print(f"DEBUG: prompt_signals = {prompt_signals}")
    print(f"DEBUG: output_signals = {output_signals}")
    
    # Step 3: Normalize detector outputs into stable signal envelope
    # Create normalized structure before calling aggregate_risk_signals
    prompt_anomaly_result = prompt_signals.get("prompt_anomaly", {})
    jailbreak_result = prompt_signals.get("jailbreak_rag", {})
    output_risk_result = output_signals.get("output_risk", {})
    
    normalized_prompt = {
        "present": prompt_anomaly_result.get("is_anomalous") is True
    }
    
    normalized_jailbreak = {
        "present": jailbreak_result.get("jailbreak_detected") is True
    }
    
    normalized_output = {
        "present": "unsafe_output" in output_risk_result.get("flags", []),
        "flags": output_risk_result.get("flags", [])
    }
    
    # Step 4: Use aggregator with normalized signal envelope
    aggregated_result = aggregate_risk_signals(
        prompt_signals=normalized_prompt,
        jailbreak_signals=normalized_jailbreak,
        output_signals=normalized_output
    )
    
    # Debug print to show merged flags
    print(f"DEBUG: merged flags = {aggregated_result['flags']}")
    
    # Step 4: Use risk reasoner to analyze aggregated results
    risk_summary = risk_reasoner.analyze_aggregated_result(
        final_risk_score=aggregated_result["final_score"],
        flags=aggregated_result["flags"],
        confidence=aggregated_result.get("confidence", 1.0)
    )
    
    # Step 5: Use policy engine to make decision
    policy_decision = policy_engine.evaluate(risk_summary)
    
    # Step 6: Use action executor to carry out decision
    action_result = action_executor.execute(policy_decision)
    
    # Step 7: Align final_risk_score with decision if needed
    # This ensures score-decision consistency for edge cases where signals produce 0/None
    # Final score alignment happens here because this is the orchestration layer that
    # has access to both the aggregated score and the final policy decision
    aligned_final_score = aggregated_result["final_score"]
    if aligned_final_score <= 0:
        # Apply decision-based alignment using centralized thresholds
        # These scores represent the midpoint of each decision range for consistency
        decision_scores = {
            "allow": ALLOW_MAX,                                    # 0.1 - max allow score
            "warn": (WARN_MIN + BLOCK_MIN) / 2,                   # 0.45 - midpoint of warn range
            "block": (BLOCK_MIN + ESCALATE_MIN) / 2,              # 0.725 - midpoint of block range  
            "escalate": ESCALATE_MIN                               # 0.85 - min escalate score
        }
        aligned_final_score = decision_scores.get(policy_decision.action.value.lower(), ALLOW_MAX)
    
    # Step 8: Log the analysis result to database (non-blocking)
    # Audit log for post-hoc safety analysis
    try:
        log_risk_event(
            db=db,
            prompt=request.prompt,
            response=request.response,
            final_risk_score=aligned_final_score,
            flags=aggregated_result["flags"],  # Legacy flags field
            confidence=aggregated_result.get("confidence"),
            decision=policy_decision.action.value,  # Audit field
            decision_reason=policy_decision.explanation,  # Audit field
            signals=aggregated_result["flags"],  # Audit field - store flags as signals
            settings_version=settings_version,  # Traceability field
            thresholds_applied=settings_service.get_thresholds()  # Traceability field
        )
    except Exception as e:
        # Logging failure should not affect API response
        print(f"Failed to log risk event: {e}")
        # Continue with API response - logging failures are non-blocking
    
    # Step 9: Return final analysis results with decision and action
    return AnalyzeResponse(
        final_risk_score=aligned_final_score,
        flags=aggregated_result["flags"],
        confidence=aggregated_result.get("confidence"),
        decision=policy_decision.action.value,
        action_taken=action_result.action.value,
        decision_reason=policy_decision.explanation,
        settings_version=settings_version,
        thresholds_applied=settings_service.get_thresholds(),
    )


@router.get("/logs", response_model=list[RiskLogResponse])
async def get_risk_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = get_recent_risk_logs(db=db, limit=limit)

    return [
        RiskLogResponse(
            id=log.id,
            created_at=log.created_at,
            final_risk_score=log.final_risk_score,
            prompt=log.prompt,
            response=log.response,
            flags=json.loads(log.flags) if log.flags else [],
            signals=json.loads(log.signals) if getattr(log, 'signals', None) else None,
            confidence=log.confidence,
            decision=log.decision,
            action_taken=log.decision,
            decision_reason=log.decision_reason,
            settings_version=getattr(log, 'settings_version', None),
            thresholds_applied=(
                json.loads(getattr(log, 'thresholds_applied', None))
                if getattr(log, 'thresholds_applied', None)
                else None
            ),
            source=getattr(log, 'source', None),  # Add external source
            client_metadata=getattr(log, 'client_metadata', None),  # Add client metadata
            user_id=getattr(log, 'user_id', None),  # Add user ID
            session_id=getattr(log, 'session_id', None),  # Add session ID
        )
        for log in logs
    ]


@router.get("/logs/{id}", response_model=RiskLogResponse)
async def get_risk_log_detail(id: int, db: Session = Depends(get_db)):
    log = get_risk_log_by_id(db=db, log_id=id)
    if not log:
        # Keep consistent with FastAPI default style
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Risk log not found")

    try:
        signals = json.loads(log.signals) if getattr(log, 'signals', None) else None
    except Exception:
        signals = log.signals

    try:
        thresholds_applied = (
            json.loads(getattr(log, 'thresholds_applied', None))
            if getattr(log, 'thresholds_applied', None)
            else None
        )
    except Exception:
        thresholds_applied = getattr(log, 'thresholds_applied', None)

    try:
        flags = json.loads(log.flags) if log.flags else []
    except Exception:
        flags = []

    return RiskLogResponse(
        id=log.id,
        created_at=log.created_at,
        final_risk_score=log.final_risk_score,
        prompt=log.prompt,
        response=log.response,
        flags=flags,
        signals=signals,
        confidence=log.confidence,
        decision=log.decision,
        action_taken=log.decision,
        decision_reason=log.decision_reason,
        settings_version=getattr(log, 'settings_version', None),
        thresholds_applied=thresholds_applied,
        source=getattr(log, 'source', None),  # Add external source
        client_metadata=getattr(log, 'client_metadata', None),  # Add client metadata
        user_id=getattr(log, 'user_id', None),  # Add user ID
        session_id=getattr(log, 'session_id', None),  # Add session ID
    )


@router.post("/analyze/external", response_model=ExternalAnalyzeResponse)
async def analyze_external_interaction(
    request: ExternalAnalyzeRequest, 
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key_dependency())
) -> ExternalAnalyzeResponse:
    """
    External API endpoint for client applications to analyze AI interactions in real-time.
    
    This endpoint allows external client applications (like customer support chatbots)
    to send prompt/response pairs for real-time risk analysis and monitoring.
    
    Features:
    - Real-time risk analysis with same engine as internal analysis
    - Source identification for tracking which client application sent the data
    - User and session tracking for comprehensive monitoring
    - Client metadata support for custom application data
    - Immediate response with risk assessment and recommended actions
    
    Args:
        request: External analysis request with prompt, response, and metadata
        db: Database session for logging
        
    Returns:
        Real-time analysis results with risk scores, flags, and recommendations
    """
    print(f"🔥 EXTERNAL API CALL: Source={request.source}, User={request.user_id}, Session={request.session_id}, API Key Prefix={api_key}")
    
    # Reload settings if changed
    settings_service.reload_settings()
    
    # Get current settings version for logging
    settings_version = settings_service.get_settings_version()
    
    # Step 1: Run prompt signal detectors (same as internal analysis)
    prompt_signals = signal_registry.run_detectors("prompt", prompt=request.prompt)
    
    # Step 2: Run output signal detectors
    output_signals = signal_registry.run_detectors("output", text=request.response)
    
    # Debug print to show signal propagation
    print(f"DEBUG EXTERNAL: prompt_signals = {prompt_signals}")
    print(f"DEBUG EXTERNAL: output_signals = {output_signals}")
    
    # Step 3: Normalize detector outputs into stable signal envelope
    prompt_anomaly_result = prompt_signals.get("prompt_anomaly", {})
    jailbreak_result = prompt_signals.get("jailbreak_rag", {})
    output_risk_result = output_signals.get("output_risk", {})
    
    normalized_prompt = {
        "present": prompt_anomaly_result.get("is_anomalous") is True
    }
    
    normalized_jailbreak = {
        "present": jailbreak_result.get("jailbreak_detected") is True
    }
    
    normalized_output = {
        "present": "unsafe_output" in output_risk_result.get("flags", []),
        "flags": output_risk_result.get("flags", [])
    }
    
    # Step 4: Use aggregator with normalized signal envelope
    aggregated_result = aggregate_risk_signals(
        prompt_signals=normalized_prompt,
        jailbreak_signals=normalized_jailbreak,
        output_signals=normalized_output
    )
    
    # Step 5: Use risk reasoner to analyze aggregated results
    risk_summary = risk_reasoner.analyze_aggregated_result(
        final_risk_score=aggregated_result["final_score"],
        flags=aggregated_result["flags"],
        confidence=aggregated_result.get("confidence", 1.0)
    )
    
    # Step 6: Use policy engine to make decision
    policy_decision = policy_engine.evaluate(risk_summary)
    
    # Step 7: Use action executor to carry out decision
    action_result = action_executor.execute(policy_decision)
    
    # Step 8: Align final_risk_score with decision if needed
    aligned_final_score = aggregated_result["final_score"]
    if aligned_final_score <= 0:
        decision_scores = {
            "allow": ALLOW_MAX,
            "warn": (WARN_MIN + BLOCK_MIN) / 2,
            "block": (BLOCK_MIN + ESCALATE_MIN) / 2,
            "escalate": ESCALATE_MIN
        }
        aligned_final_score = decision_scores.get(policy_decision.action.value.lower(), ALLOW_MAX)
    
    # Step 9: Log the analysis result to database with external source information
    analysis_id = None
    try:
        # Create enhanced log entry with external source information
        logged_event = log_risk_event(
            db=db,
            prompt=request.prompt,
            response=request.response,
            final_risk_score=aligned_final_score,
            flags=aggregated_result["flags"],
            confidence=aggregated_result.get("confidence"),
            decision=policy_decision.action.value,
            decision_reason=policy_decision.explanation,
            signals=aggregated_result["flags"],
            settings_version=settings_version,
            thresholds_applied=settings_service.get_thresholds(),
            source=request.source,  # New: External source identification
            user_id=request.user_id,  # New: User tracking
            session_id=request.session_id,  # New: Session tracking
            client_metadata=request.client_metadata  # New: Client metadata
        )
        analysis_id = logged_event.id if logged_event else None
        
    except Exception as e:
        print(f"❌ Failed to log external risk event: {e}")
        # Continue with API response - logging failures are non-blocking
    
    # Step 10: Return final analysis results for real-time client response
    print(f"✅ EXTERNAL ANALYSIS COMPLETE: Score={aligned_final_score:.3f}, Decision={policy_decision.action.value}, ID={analysis_id}")
    
    return ExternalAnalyzeResponse(
        final_risk_score=aligned_final_score,
        flags=aggregated_result["flags"],
        confidence=aggregated_result.get("confidence"),
        decision=policy_decision.action.value,
        action_taken=action_result.action.value,
        decision_reason=policy_decision.explanation,
        settings_version=settings_version,
        thresholds_applied=settings_service.get_thresholds(),
        analysis_id=analysis_id,
        timestamp=datetime.utcnow()
    )

