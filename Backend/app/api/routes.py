"""
FastAPI Routes for Sentinel AI Analysis

This module defines the API routes for analyzing AI prompts and responses
to detect potential risks and anomalies.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, List, Optional
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

from app.api.schemas import (
    AnalyzeRequest, AnalyzeResponse, RiskLogResponse,
    ExternalAnalyzeRequest, ExternalAnalyzeResponse,
    ReviewRequest, ReviewResponse, ReviewQueueItem,
)
from app.storage.models import RiskLog
from app.storage.workspace_models import Workspace
from app.signals.registry import build_default_registry
from app.monitors.pii_detector import detect_pii
from app.scoring.aggregator import aggregate_risk_signals
from app.storage.crud import log_risk_event, get_recent_risk_logs, get_risk_log_by_id
from app.storage.db import SessionLocal
from app.services.settings_service_db import settings_service
from app.agent.reasoner import RiskReasoner
from app.policy.engine import PolicyEngine
from app.actions.executor import ActionExecutor
from app.learning.compliance_monitor import ResponseComplianceMonitor
from app.learning.feedback_service import FeedbackService
from app.services.llm_service import analyze_with_llm, estimate_tokens
from app.services.wallet_service import (
    ensure_wallet, deduct_credits, calculate_call_cost,
    record_token_usage, has_sufficient_credits,
)
from app.storage.org_models import Organization, PlanTier

router = APIRouter()

signal_registry = build_default_registry()

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


def _pii_flags(categories: Dict[str, int]) -> List[str]:
    """Build informational PII flags (never affects the risk score)."""
    if not categories:
        return []
    return ["pii_detected"] + [f"pii:{cat}" for cat in categories]


def _detect_pii_for_request(prompt: str, response: str, enabled: bool) -> Dict[str, Any]:
    """Run PII detection on prompt+response when enabled.

    Returns a dict with redacted_prompt/redacted_response (only set when PII
    was found), pii (detection summary), and flags (informational only).
    """
    if not enabled:
        return {"redacted_prompt": None, "redacted_response": None, "pii": None, "flags": []}

    prompt_result = detect_pii(prompt)
    response_result = detect_pii(response)

    categories: Dict[str, int] = {}
    for result in (prompt_result, response_result):
        for cat, count in result["categories"].items():
            categories[cat] = categories.get(cat, 0) + count

    if not categories:
        return {"redacted_prompt": None, "redacted_response": None, "pii": None, "flags": []}

    return {
        "redacted_prompt": prompt_result["redacted_text"] if prompt_result["pii_detected"] else None,
        "redacted_response": response_result["redacted_text"] if response_result["pii_detected"] else None,
        "pii": {
            "pii_detected": True,
            "categories": categories,
            "count": prompt_result["count"] + response_result["count"],
        },
        "flags": _pii_flags(categories),
    }


def _serialize_risk_log(log: RiskLog) -> RiskLogResponse:
    """Serialize a RiskLog row into the API response shape."""
    try:
        signals = json.loads(log.signals) if getattr(log, 'signals', None) else None
    except Exception:
        signals = getattr(log, 'signals', None)

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
        org_id=getattr(log, 'org_id', None),
        workspace_id=getattr(log, 'workspace_id', None),
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_interaction(
    request: AnalyzeRequest,
    request_http: Request,
    db: Session = Depends(get_db),
    user = Depends(require_authenticated_user)
) -> AnalyzeResponse:
    settings_service.reload_settings()
    settings_version = settings_service.get_settings_version()

    try:
        from app.storage.org_models import OrgMembership

        # Resolve the active org from the X-Org-Id header when present.
        # The header must reference an org the user actually belongs to;
        # without it, fall back to the user's first membership (legacy).
        org_id = None
        org_id_header = request_http.headers.get("x-org-id")
        if org_id_header:
            try:
                header_org_id = int(org_id_header)
            except (TypeError, ValueError):
                header_org_id = None
            if header_org_id is not None:
                membership = db.query(OrgMembership).filter(
                    OrgMembership.user_id == user.id,
                    OrgMembership.org_id == header_org_id,
                ).first()
                if membership:
                    org_id = header_org_id
        if org_id is None:
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
    llm_path = bool(llm_result and llm_result.model != "fallback")

    if llm_path:
        final_risk_score = llm_result.risk_score / 100.0
        flags = llm_result.flags or []
        confidence = llm_result.confidence
        decision_reason = llm_result.decision_reason
        input_tokens = llm_result.input_tokens
        output_tokens = llm_result.output_tokens

        # Run the policy engine and action executor for LLM results too,
        # so decision/action_taken always reflect an actually-executed action.
        risk_summary = risk_reasoner.analyze_aggregated_result(
            final_risk_score=final_risk_score,
            flags=flags,
            confidence=confidence,
        )
        policy_decision = policy_engine.evaluate(risk_summary)
        action_result = action_executor.execute(policy_decision)
        decision = policy_decision.action.value
        decision_reason = decision_reason or policy_decision.explanation
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

    pii_result = _detect_pii_for_request(
        request.prompt,
        request.response,
        settings_service.get_pii_redaction_enabled(),
    )
    if pii_result["flags"]:
        flags = list(flags) + pii_result["flags"]

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
        redacted_prompt=pii_result["redacted_prompt"],
        redacted_response=pii_result["redacted_response"],
        pii=pii_result["pii"],
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

    return [_serialize_risk_log(log) for log in logs]


@router.get("/logs/review-queue", response_model=list[ReviewQueueItem])
async def get_review_queue(
    limit: int = 50,
    db: Session = Depends(get_db),
    user = Depends(require_authenticated_user)
):
    """Get risk logs awaiting human review (block/escalate decisions)."""
    logs = (
        db.query(RiskLog)
        .filter(
            RiskLog.user_id == user.clerk_user_id,
            RiskLog.decision.in_(["block", "escalate"]),
        )
        .order_by(RiskLog.created_at.desc())
        .limit(limit)
        .all()
    )

    reviewed_ids = FeedbackService(db).get_reviewed_log_ids()
    items = []
    for log in logs:
        item = _serialize_risk_log(log)
        item.reviewed = log.id in reviewed_ids
        items.append(item)
    return items


@router.post("/logs/{id}/review", response_model=ReviewResponse)
async def review_risk_log(
    id: int,
    request: ReviewRequest,
    db: Session = Depends(get_db),
    user = Depends(require_authenticated_user)
):
    """Submit a human review disposition for a flagged risk log."""
    log = db.query(RiskLog).filter(
        RiskLog.id == id,
        RiskLog.user_id == user.clerk_user_id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Risk log not found")

    result = FeedbackService(db).submit_review(
        log=log,
        disposition=request.disposition,
        notes=request.notes,
        user_id=user.clerk_user_id,
    )
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)

    return ReviewResponse(
        success=True,
        feedback_id=result.feedback_id,
        log_id=id,
        disposition=request.disposition,
        message=result.message,
    )


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

    return _serialize_risk_log(log)


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
    llm_path = bool(llm_result and llm_result.model != "fallback")

    if llm_path:
        final_risk_score = llm_result.risk_score / 100.0
        flags = llm_result.flags or []
        confidence = llm_result.confidence
        decision_reason = llm_result.decision_reason
        input_tokens = llm_result.input_tokens
        output_tokens = llm_result.output_tokens

        # Run the policy engine and action executor for LLM results too,
        # so decision/action_taken always reflect an actually-executed action.
        risk_summary = risk_reasoner.analyze_aggregated_result(
            final_risk_score=final_risk_score,
            flags=flags,
            confidence=confidence,
        )
        policy_decision = policy_engine.evaluate(risk_summary)
        action_result = action_executor.execute(policy_decision)
        decision = policy_decision.action.value
        decision_reason = decision_reason or policy_decision.explanation
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

    pii_result = _detect_pii_for_request(
        request.prompt,
        request.response,
        request.redact and settings_service.get_pii_redaction_enabled(),
    )
    if pii_result["flags"]:
        flags = list(flags) + pii_result["flags"]

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
        redacted_prompt=pii_result["redacted_prompt"],
        redacted_response=pii_result["redacted_response"],
        pii=pii_result["pii"],
    )

