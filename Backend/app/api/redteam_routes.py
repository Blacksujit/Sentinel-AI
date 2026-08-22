from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from app.auth.dependencies import require_authenticated_user, get_db
from app.tenancy.org_context import resolve_org, require_org_membership
from app.rbac.permissions import user_permissions_for_org
from app.services.audit_service import AuditService
from app.storage.org_models import Organization
from app.storage.user_models import User
from app.redteam.executor import (
    execute_run,
    list_runs,
    get_run,
    get_run_cases,
    get_run_findings,
)
from app.redteam.attacks import ATTACK_CASES

router = APIRouter(prefix="/redteam", tags=["redteam"])


def _require_redteam_permission(db: Session, user_id: int, org_id: int, permission_key: str) -> None:
    """Check if user has a redteam-related permission in the org."""
    perms = user_permissions_for_org(db, user_id=user_id, org_id=org_id)
    if permission_key not in perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission_key}",
        )


# Pydantic schemas
class RedTeamRunCreate(BaseModel):
    name: str = "Red team evaluation"
    classes: Optional[List[str]] = None
    max_cases: int = 100
    config: Optional[dict] = None


class RedTeamRunResponse(BaseModel):
    id: int
    org_id: int
    name: str
    mode: str
    status: str
    config: dict
    attack_classes: Optional[List[str]]
    metrics: Optional[dict]
    summary: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    duration_ms: Optional[int]
    tokens_used: Optional[int]
    error: Optional[str]
    created_by: Optional[int]

    class Config:
        from_attributes = True


class RedTeamCaseResponse(BaseModel):
    id: int
    run_id: int
    org_id: int
    attack_class: str
    technique: Optional[str]
    prompt: str
    final_prompt: Optional[str]
    expected_outcome: str
    detected: bool
    decision: Optional[str]
    risk_score: Optional[int]
    confidence: Optional[float]
    detector_hits: Optional[dict]
    mutation_rounds: int
    tokens_used: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class RedTeamFindingResponse(BaseModel):
    id: int
    run_id: int
    case_id: int
    finding_type: str
    severity: str
    title: str
    summary: Optional[str]
    recommended_action: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class RedTeamRunDetailResponse(RedTeamRunResponse):
    cases: List[RedTeamCaseResponse] = []
    findings: List[RedTeamFindingResponse] = []


@router.post("/runs", response_model=RedTeamRunResponse)
async def create_redteam_run(
    org_id: str,
    payload: RedTeamRunCreate,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Create and execute a red team evaluation run for the organization.

    Requires the `redteam.run` permission.
    """
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_redteam_permission(db, user.id, org.id, "redteam.run")

    # Validate classes if provided
    if payload.classes:
        unknown = set(payload.classes) - set(ATTACK_CASES.keys())
        if unknown:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown attack classes: {sorted(unknown)}",
            )

    config = payload.config or {}
    config.setdefault("llm_enabled", True)
    config.setdefault("max_mutation_rounds", 3)
    config.setdefault("max_llm_calls", 30)

    run = execute_run(
        db=db,
        org_id=org.id,
        created_by=user.id,
        name=payload.name,
        classes=payload.classes,
        max_cases=payload.max_cases,
        config=config,
    )

    AuditService.log(
        db,
        org_id=org.id,
        actor_user_id=user.id,
        actor_type="user",
        action="redteam.run_created",
        target_type="redteam_run",
        target_id=run.id,
        event_metadata={"name": payload.name, "classes": payload.classes, "max_cases": payload.max_cases},
    )

    return RedTeamRunResponse(
        id=run.id,
        org_id=run.org_id,
        name=run.name,
        mode=run.mode,
        status=run.status,
        config=run.config,
        attack_classes=run.attack_classes,
        metrics=run.metrics,
        summary=run.summary,
        started_at=run.started_at,
        completed_at=run.completed_at,
        duration_ms=run.duration_ms,
        tokens_used=run.tokens_used,
        error=run.error,
        created_by=run.created_by,
    )


@router.get("/runs", response_model=List[RedTeamRunResponse])
async def list_redteam_runs(
    org_id: str,
    limit: int = 20,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """List red team runs for the organization.

    Requires the `redteam.view` permission.
    """
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_redteam_permission(db, user.id, org.id, "redteam.view")

    runs = list_runs(db, org.id, limit=limit)
    return [
        RedTeamRunResponse(
            id=r.id,
            org_id=r.org_id,
            name=r.name,
            mode=r.mode,
            status=r.status,
            config=r.config,
            attack_classes=r.attack_classes,
            metrics=r.metrics,
            summary=r.summary,
            started_at=r.started_at,
            completed_at=r.completed_at,
            duration_ms=r.duration_ms,
            tokens_used=r.tokens_used,
            error=r.error,
            created_by=r.created_by,
        )
        for r in runs
    ]


@router.get("/runs/{run_id}", response_model=RedTeamRunDetailResponse)
async def get_redteam_run(
    org_id: str,
    run_id: int,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get a red team run with cases and findings.

    Requires the `redteam.view` permission.
    """
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_redteam_permission(db, user.id, org.id, "redteam.view")

    run = get_run(db, org.id, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    cases = get_run_cases(db, run_id)
    findings = get_run_findings(db, run_id)

    return RedTeamRunDetailResponse(
        id=run.id,
        org_id=run.org_id,
        name=run.name,
        mode=run.mode,
        status=run.status,
        config=run.config,
        attack_classes=run.attack_classes,
        metrics=run.metrics,
        summary=run.summary,
        started_at=run.started_at,
        completed_at=run.completed_at,
        duration_ms=run.duration_ms,
        tokens_used=run.tokens_used,
        error=run.error,
        created_by=run.created_by,
        cases=[
            RedTeamCaseResponse(
                id=c.id,
                run_id=c.run_id,
                org_id=c.org_id,
                attack_class=c.attack_class,
                technique=c.technique,
                prompt=c.prompt,
                final_prompt=c.final_prompt,
                expected_outcome=c.expected_outcome,
                detected=c.detected,
                decision=c.decision,
                risk_score=c.risk_score,
                confidence=c.confidence,
                detector_hits=c.detector_hits,
                mutation_rounds=c.mutation_rounds,
                tokens_used=c.tokens_used,
                created_at=c.created_at,
            )
            for c in cases
        ],
        findings=[
            RedTeamFindingResponse(
                id=f.id,
                run_id=f.run_id,
                case_id=f.case_id,
                finding_type=f.finding_type,
                severity=f.severity,
                title=f.title,
                summary=f.summary,
                recommended_action=f.recommended_action,
                status=f.status,
                created_at=f.created_at,
            )
            for f in findings
        ],
    )


@router.get("/runs/{run_id}/cases", response_model=List[RedTeamCaseResponse])
async def list_redteam_cases(
    org_id: str,
    run_id: int,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """List cases for a red team run.

    Requires the `redteam.view` permission.
    """
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_redteam_permission(db, user.id, org.id, "redteam.view")

    run = get_run(db, org.id, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    cases = get_run_cases(db, run_id)
    return [
        RedTeamCaseResponse(
            id=c.id,
            run_id=c.run_id,
            org_id=c.org_id,
            attack_class=c.attack_class,
            technique=c.technique,
            prompt=c.prompt,
            final_prompt=c.final_prompt,
            expected_outcome=c.expected_outcome,
            detected=c.detected,
            decision=c.decision,
            risk_score=c.risk_score,
            confidence=c.confidence,
            detector_hits=c.detector_hits,
            mutation_rounds=c.mutation_rounds,
            tokens_used=c.tokens_used,
            created_at=c.created_at,
        )
        for c in cases
    ]


@router.get("/runs/{run_id}/findings", response_model=List[RedTeamFindingResponse])
async def list_redteam_findings(
    org_id: str,
    run_id: int,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """List findings for a red team run.

    Requires the `redteam.view` permission.
    """
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_redteam_permission(db, user.id, org.id, "redteam.view")

    run = get_run(db, org.id, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    findings = get_run_findings(db, run_id)
    return [
        RedTeamFindingResponse(
            id=f.id,
            run_id=f.run_id,
            case_id=f.case_id,
            finding_type=f.finding_type,
            severity=f.severity,
            title=f.title,
            summary=f.summary,
            recommended_action=f.recommended_action,
            status=f.status,
            created_at=f.created_at,
        )
        for f in findings
    ]


@router.get("/runs/{run_id}/report")
async def get_redteam_report(
    org_id: str,
    run_id: int,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get the full markdown report for a red team run.

    Requires the `redteam.view` permission.
    """
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_redteam_permission(db, user.id, org.id, "redteam.view")

    run = get_run(db, org.id, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    cases = get_run_cases(db, run_id)
    findings = get_run_findings(db, run_id)

    from app.redteam.report import build_full_report
    report = build_full_report(run, cases, findings)

    return {"run_id": run_id, "report": report}


@router.get("/attack-classes")
async def list_attack_classes(
    user: User = Depends(require_authenticated_user),
):
    """List available attack classes and their techniques."""
    return {
        "classes": {
            cls: [t for t, _, _ in techniques]
            for cls, techniques in ATTACK_CASES.items()
        },
        "benign_controls": [t for t, _, _ in ATTACK_CASES.get("benign_control", [])] if "benign_control" in ATTACK_CASES else [],
    }