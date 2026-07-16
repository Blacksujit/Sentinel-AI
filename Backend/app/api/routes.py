"""
FastAPI Routes for Sentinel AI Analysis

This module defines the API routes for analyzing AI prompts and responses
to detect potential risks and anomalies.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from sqlalchemy.orm import Session
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# Import API key authentication
from app.middleware.auth import get_api_key_dependency
from app.auth.dependencies import require_authenticated_user

# Import centralized risk configuration
from app.config.risk_config import (
    ALLOW_MAX,
    WARN_MIN, 
    BLOCK_MIN,
    ESCALATE_MIN
)

from app.api.schemas import AnalyzeRequest, AnalyzeResponse, RiskLogResponse, ExternalAnalyzeRequest, ExternalAnalyzeResponse
from app.storage.models import RiskLog
from app.storage.workspace_models import Workspace
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
from app.learning.compliance_monitor import ResponseComplianceMonitor
from app.learning.feedback_service import FeedbackService
from app.services.llm_service import analyze_with_llm, estimate_tokens
from app.services.wallet_service import (
    ensure_wallet, deduct_credits, calculate_call_cost,
    record_token_usage, has_sufficient_credits,
)
from app.storage.org_models import Organization, PlanTier

router = APIRouter()

signal_registry = SignalRegistry()
signal_registry.register("prompt_anomaly", detect_prompt_anomaly, "prompt")
signal_registry.register("jailbreak_rag", detect_jailbreak_rag, "prompt")
signal_registry.register("output_risk", score_output_risk, "output")

risk_reasoner = RiskReasoner()
policy_engine = PolicyEngine()
action_executor = ActionExecutor()
compliance_monitor = ResponseComplianceMonitor()
feedback_service = None


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_interaction(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    user = Depends(require_authenticated_user)
) -> AnalyzeResponse:
    settings_service.reload_settings()
    settings_version = settings_service.get_settings_version()

    try:
        from app.storage.org_models import OrgMembership
        membership = db.query(OrgMembership).filter(
            OrgMembership.user_id == user.id
        ).first()
        org_id = membership.org_id if membership else None
        user_org = db.query(Organization).filter(Organization.id == org_id).first() if org_id else None
        plan_tier = user_org.plan_tier.value if user_org else "free"
    except Exception:
        plan_tier = "free"
        org_id = None

    llm_result = analyze_with_llm(request.prompt, request.response, plan_tier)

    if llm_result and llm_result.model != "fallback":
        final_risk_score = llm_result.risk_score / 100.0
        flags = llm_result.flags
        confidence = llm_result.confidence
        decision = llm_result.decision
        decision_reason = llm_result.decision_reason
        input_tokens = llm_result.input_tokens
        output_tokens = llm_result.output_tokens
    else:
        prompt_signals = signal_registry.run_detectors("prompt", prompt=request.prompt)
        output_signals = signal_registry.run_detectors("output", text=request.response)

        prompt_anomaly_result = prompt_signals.get("prompt_anomaly", {})
        jailbreak_result = prompt_signals.get("jailbreak_rag", {})
        output_risk_result = output_signals.get("output_risk", {})

        aggregated_result = aggregate_risk_signals(
            prompt_signals={"present": prompt_anomaly_result.get("is_anomalous") is True},
            jailbreak_signals={"present": jailbreak_result.get("jailbreak_detected") is True},
            output_signals={"present": "unsafe_output" in output_risk_result.get("flags", []), "flags": output_risk_result.get("flags", [])},
        )

        risk_summary = risk_reasoner.analyze_aggregated_result(
            final_risk_score=aggregated_result["final_score"],
            flags=aggregated_result["flags"],
            confidence=aggregated_result.get("confidence", 1.0),
        )

        policy_decision = policy_engine.evaluate(risk_summary)
        action_result = action_executor.execute(policy_decision)

        final_risk_score = aggregated_result["final_score"]
        if final_risk_score <= 0:
            decision_scores = {"allow": ALLOW_MAX, "warn": (WARN_MIN + BLOCK_MIN) / 2, "block": (BLOCK_MIN + ESCALATE_MIN) / 2, "escalate": ESCALATE_MIN}
            final_risk_score = decision_scores.get(policy_decision.action.value.lower(), ALLOW_MAX)

        flags = aggregated_result["flags"]
        confidence = aggregated_result.get("confidence", 1.0)
        decision = policy_decision.action.value
        decision_reason = policy_decision.explanation
        input_tokens = estimate_tokens(request.prompt)
        output_tokens = estimate_tokens(request.response)

    if org_id:
        cost_credits = calculate_call_cost(input_tokens, output_tokens)
        has_credits = has_sufficient_credits(org_id, cost_credits, db)
        if has_credits:
            deduct_credits(org_id, cost_credits, db)
        record_token_usage(
            org_id=org_id,
            model=llm_result.model if llm_result else "fallback",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_credits=cost_credits if has_credits else 0,
            source="playground",
            db=db,
        )

    try:
        log_risk_event(
            db=db,
            prompt=request.prompt,
            response=request.response,
            final_risk_score=final_risk_score,
            flags=flags,
            confidence=confidence,
            decision=decision,
            decision_reason=decision_reason,
            signals=flags,
            settings_version=settings_version,
            thresholds_applied=settings_service.get_thresholds(),
            user_id=user.clerk_user_id,
            source="web_playground",
        )
    except Exception as e:
        logger.error("Failed to log risk event: %s", e)

    if org_id:
        from app.services.usage_service import UsageService
        try:
            UsageService.record_event(
                db=db,
                org_id=org_id,
                endpoint="/analyze",
                api_key_id=None,
                initiator_user_id=user.id,
                latency_ms=None,
                risk_score=int(final_risk_score * 100),
                success=True,
            )
        except Exception as e:
            logger.error("Failed to record usage event: %s", e)

    log_id = None
    try:
        feedback_svc = FeedbackService(db)
        log_id = feedback_svc.log_detection(
            user_id=user.clerk_user_id,
            prompt=request.prompt,
            response=request.response,
            detection_score=final_risk_score,
            final_risk_score=final_risk_score,
            flags=flags,
            action_taken=decision,
            processing_time_ms=0.0,
            conversation_id=None,
            model_version="1.0",
        )
    except Exception as e:
        logger.error("Failed to log detection: %s", e)

    if final_risk_score < 0.7:
        try:
            compliance_result = compliance_monitor.check_compliance(
                prompt=request.prompt, response=request.response, risk_score=final_risk_score,
            )
            if compliance_result.is_complying and compliance_result.level.value in ["medium", "high"]:
                feedback_svc = FeedbackService(db)
                feedback_svc.report_compliance_issue(log_id=str(log_id) if log_id else None, user_id="system_auto_detect")
        except Exception as e:
            logger.error("Compliance check failed: %s", e)

    return AnalyzeResponse(
        final_risk_score=final_risk_score,
        flags=flags,
        confidence=confidence,
        decision=decision,
        action_taken=decision,
        decision_reason=decision_reason,
        settings_version=settings_version,
        thresholds_applied=settings_service.get_thresholds(),
        log_id=str(log_id) if log_id else None,
    )


@router.get("/logs", response_model=list[RiskLogResponse])
async def get_risk_logs(
    limit: int = 50, 
    db: Session = Depends(get_db),
    user = Depends(require_authenticated_user)
):
    """Get risk logs for the authenticated user only."""
    logs = (
        db.query(RiskLog)
        .filter(RiskLog.user_id == user.clerk_user_id)
        .order_by(RiskLog.created_at.desc())
        .limit(limit)
        .all()
    )

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
async def get_risk_log_detail(
    id: int, 
    db: Session = Depends(get_db),
    user = Depends(require_authenticated_user)
):
    """Get a specific risk log - only if it belongs to the authenticated user."""
    log = db.query(RiskLog).filter(
        RiskLog.id == id,
        RiskLog.user_id == user.clerk_user_id
    ).first()
    
    if not log:
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
        source=getattr(log, 'source', None),
        client_metadata=getattr(log, 'client_metadata', None),
        user_id=getattr(log, 'user_id', None),
        session_id=getattr(log, 'session_id', None),
    )


@router.post("/analyze/external", response_model=ExternalAnalyzeResponse)
async def analyze_external_interaction(
    request: ExternalAnalyzeRequest,
    db: Session = Depends(get_db),
    api_key_ctx: dict = Depends(get_api_key_dependency()),
) -> ExternalAnalyzeResponse:
    logger.info("External API call: source=%s user=%s session=%s key_prefix=%s",
                 request.source, request.user_id, request.session_id, api_key_ctx.get("prefix"))

    settings_service.reload_settings()
    settings_version = settings_service.get_settings_version()

    org_id = api_key_ctx.get("org_id")
    plan_tier = "free"
    if org_id is not None:
        org = db.query(Organization).filter(Organization.id == int(org_id)).first()
        if org:
            plan_tier = org.plan_tier.value

    llm_result = analyze_with_llm(request.prompt, request.response, plan_tier)

    if llm_result and llm_result.model != "fallback":
        final_risk_score = llm_result.risk_score / 100.0
        flags = llm_result.flags
        confidence = llm_result.confidence
        decision = llm_result.decision
        decision_reason = llm_result.decision_reason
        input_tokens = llm_result.input_tokens
        output_tokens = llm_result.output_tokens
    else:
        prompt_signals = signal_registry.run_detectors("prompt", prompt=request.prompt)
        output_signals = signal_registry.run_detectors("output", text=request.response)

        prompt_anomaly_result = prompt_signals.get("prompt_anomaly", {})
        jailbreak_result = prompt_signals.get("jailbreak_rag", {})
        output_risk_result = output_signals.get("output_risk", {})

        aggregated_result = aggregate_risk_signals(
            prompt_signals={"present": prompt_anomaly_result.get("is_anomalous") is True},
            jailbreak_signals={"present": jailbreak_result.get("jailbreak_detected") is True},
            output_signals={"present": "unsafe_output" in output_risk_result.get("flags", []), "flags": output_risk_result.get("flags", [])},
        )

        risk_summary = risk_reasoner.analyze_aggregated_result(
            final_risk_score=aggregated_result["final_score"],
            flags=aggregated_result["flags"],
            confidence=aggregated_result.get("confidence", 1.0),
        )

        policy_decision = policy_engine.evaluate(risk_summary)
        action_result = action_executor.execute(policy_decision)

        final_risk_score = aggregated_result["final_score"]
        if final_risk_score <= 0:
            decision_scores = {"allow": ALLOW_MAX, "warn": (WARN_MIN + BLOCK_MIN) / 2, "block": (BLOCK_MIN + ESCALATE_MIN) / 2, "escalate": ESCALATE_MIN}
            final_risk_score = decision_scores.get(policy_decision.action.value.lower(), ALLOW_MAX)

        flags = aggregated_result["flags"]
        confidence = aggregated_result.get("confidence", 1.0)
        decision = policy_decision.action.value
        decision_reason = policy_decision.explanation
        input_tokens = estimate_tokens(request.prompt)
        output_tokens = estimate_tokens(request.response)

    if org_id is not None:
        cost_credits = calculate_call_cost(input_tokens, output_tokens)
        has_credits = has_sufficient_credits(int(org_id), cost_credits, db)
        if has_credits:
            deduct_credits(int(org_id), cost_credits, db)
        record_token_usage(
            org_id=int(org_id),
            model=llm_result.model if llm_result else "fallback",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_credits=cost_credits if has_credits else 0,
            source="api",
            usage_event_id=None,
            api_key_id=api_key_ctx.get("api_key_id"),
            db=db,
        )

    analysis_id = None
    try:
        workspace_id = None
        if org_id is not None:
            default_ws = (
                db.query(Workspace)
                .filter(Workspace.org_id == int(org_id))
                .filter(Workspace.is_default.is_(True))
                .order_by(Workspace.id.asc())
                .first()
            )
            if default_ws:
                workspace_id = default_ws.id

        logged_event = log_risk_event(
            db=db,
            prompt=request.prompt,
            response=request.response,
            final_risk_score=final_risk_score,
            flags=flags,
            confidence=confidence,
            decision=decision,
            decision_reason=decision_reason,
            signals=flags,
            settings_version=settings_version,
            thresholds_applied=settings_service.get_thresholds(),
            source=request.source,
            user_id=request.user_id,
            session_id=request.session_id,
            client_metadata=request.client_metadata,
            org_id=org_id,
            workspace_id=workspace_id,
        )
        analysis_id = logged_event.id if logged_event else None

        from app.services.usage_service import UsageService
        UsageService.record_event(
            db=db,
            org_id=api_key_ctx["org_id"],
            endpoint="/analyze/external",
            api_key_id=api_key_ctx["api_key_id"],
            initiator_user_id=None,
            latency_ms=None,
            risk_score=int(final_risk_score * 100),
            success=True,
        )
    except Exception as e:
        logger.error("Failed to log external risk event: %s", e)

    return ExternalAnalyzeResponse(
        final_risk_score=final_risk_score,
        flags=flags,
        confidence=confidence,
        decision=decision,
        action_taken=decision,
        decision_reason=decision_reason,
        settings_version=settings_version,
        thresholds_applied=settings_service.get_thresholds(),
        analysis_id=analysis_id,
        timestamp=datetime.utcnow(),
    )

