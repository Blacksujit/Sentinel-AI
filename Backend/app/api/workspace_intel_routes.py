"""Workspace Intelligence API routes.

Endpoints for incidents, deployments, timeline, integrations,
AI memory, escalations, summaries, activity feed, and postmortems.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.auth.dependencies import require_authenticated_user, get_db
from app.storage.user_models import User
from app.storage.workspace_intel_models import (
    IncidentSeverity, IncidentStatus, IncidentSource,
    DeploymentStatus, TimelineEventType, TimelineSeverity,
    MemoryType, SummaryType, IntegrationProvider,
    EscalationTriggerType, AgentType, ActivityType,
)
from app.services.intelligence_service import (
    IntelligenceEngine, IncidentService, DeploymentService,
    TimelineService, IntegrationService, AIMemoryService,
    EscalationService, SummaryService, ActivityFeedService,
    PostmortemService,
)
from app.api.ws_manager import ws_manager

router = APIRouter(prefix="/workspaces/{workspace_id}/intel", tags=["workspace-intelligence"])
engine = IntelligenceEngine()


# ─── Pydantic Schemas ───────────────────────────────────────────────────────────

class IncidentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "MEDIUM"
    source: str = "ANOMALY"
    assignee_id: Optional[int] = None
    affected_services: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class IncidentUpdateRequest(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    assignee_id: Optional[int] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None


class IncidentResponse(BaseModel):
    id: int
    workspace_id: int
    title: str
    description: Optional[str]
    severity: str
    status: str
    source: str
    detected_at: datetime
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    assignee_id: Optional[int]
    reporter_id: Optional[int]
    root_cause: Optional[str]
    impact: Optional[str]
    resolution: Optional[str]
    affected_services: List
    slack_channel_name: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


class DeploymentCreateRequest(BaseModel):
    service_name: str
    version: str
    environment: str = "PRODUCTION"
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    repository: Optional[str] = None
    pull_request_url: Optional[str] = None
    triggered_by: Optional[str] = None
    changelog: Optional[str] = None


class DeploymentUpdateRequest(BaseModel):
    status: str
    duration_seconds: Optional[int] = None
    risk_score: Optional[float] = None
    risk_factors: Optional[List[str]] = None
    rollback_reason: Optional[str] = None


class DeploymentResponse(BaseModel):
    id: int
    workspace_id: int
    service_name: str
    environment: str
    version: str
    commit_sha: Optional[str]
    branch: Optional[str]
    repository: Optional[str]
    status: str
    triggered_by: Optional[str]
    duration_seconds: Optional[int]
    risk_score: Optional[float]
    risk_factors: List
    rollback_reason: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime


class TimelineEventResponse(BaseModel):
    id: int
    event_type: str
    title: str
    description: Optional[str]
    severity: str
    source: str
    source_id: Optional[str]
    metadata: Dict
    related_entity_type: Optional[str]
    related_entity_id: Optional[int]
    ai_summary: Optional[str]
    event_time: datetime


class TimelineGroupResponse(BaseModel):
    time_start: str
    time_end: str
    event_count: int
    max_severity: str
    events: List[TimelineEventResponse]


class IntegrationCreateRequest(BaseModel):
    provider: str
    name: str
    description: Optional[str] = None
    config: Dict[str, Any]


class IntegrationResponse(BaseModel):
    id: int
    provider: str
    name: str
    description: Optional[str]
    is_active: bool
    last_sync_at: Optional[datetime]
    last_error: Optional[str]
    created_at: datetime


class MemoryStoreRequest(BaseModel):
    memory_type: str
    title: str
    content: str
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None


class MemoryResponse(BaseModel):
    id: int
    memory_type: str
    title: str
    content: str
    tags: List
    confidence: Optional[float]
    source_incident_id: Optional[int]
    created_at: datetime


class EscalationPolicyCreateRequest(BaseModel):
    name: str
    trigger_type: str
    trigger_config: Dict[str, Any]
    actions: List[Dict[str, Any]]
    target_role: Optional[str] = None
    target_user_ids: Optional[List[int]] = None
    timeout_minutes: Optional[int] = None


class SummaryCreateRequest(BaseModel):
    summary_type: str
    title: str
    content: str
    period_start: datetime
    period_end: datetime
    summary_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class SummaryResponse(BaseModel):
    id: int
    summary_type: str
    title: str
    content: str
    generated_by: str
    period_start: datetime
    period_end: datetime
    created_at: datetime


class ActivityFeedResponse(BaseModel):
    id: int
    activity_type: str
    title: str
    description: Optional[str]
    actor_name: Optional[str]
    related_entity_type: Optional[str]
    related_entity_id: Optional[int]
    metadata: Dict
    activity_time: datetime


class PostmortemResponse(BaseModel):
    id: int
    incident_id: int
    title: str
    overview: Optional[str]
    timeline: List
    impact: Dict
    root_cause: Optional[str]
    resolution: Optional[str]
    responders: List
    action_items: List
    lessons_learned: List
    time_to_detect_minutes: Optional[int]
    time_to_resolve_minutes: Optional[int]
    created_at: datetime


class IntelligenceSummaryResponse(BaseModel):
    active_incidents: int
    recent_events_7d: int
    recent_deployments_7d: int
    failed_deployments_7d: int
    critical_events_7d: int
    member_count: int
    memory_entries: int
    activities_today: int
    health_score: float


# ─── Incidents ──────────────────────────────────────────────────────────────────

@router.get("/incidents", response_model=List[IncidentResponse])
async def list_incidents(
    workspace_id: int,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        incidents = IncidentService.get_incidents(
            db=db,
            workspace_id=workspace_id,
            status=IncidentStatus(status) if status else None,
            severity=IncidentSeverity(severity) if severity else None,
            limit=limit,
            offset=offset,
        )
        return [_incident_to_response(i) for i in incidents]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/incidents", response_model=IncidentResponse, status_code=201)
async def create_incident(
    workspace_id: int,
    req: IncidentCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        incident = IncidentService.create_incident(
            db=db,
            workspace_id=workspace_id,
            title=req.title,
            description=req.description,
            severity=IncidentSeverity(req.severity.upper()),
            source=IncidentSource(req.source.upper()),
            reporter_id=user.id,
            assignee_id=req.assignee_id,
            affected_services=req.affected_services,
            metadata=req.metadata,
        )
        await ws_manager.broadcast(workspace_id, {
            "type": "incident.created",
            "payload": _incident_to_dict(incident),
        })
        return _incident_to_response(incident)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    workspace_id: int,
    incident_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    incident = IncidentService.get_incident_by_id(db, incident_id)
    if not incident or incident.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _incident_to_response(incident)


@router.patch("/incidents/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    workspace_id: int,
    incident_id: int,
    req: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    incident = IncidentService.get_incident_by_id(db, incident_id)
    if not incident or incident.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    try:
        if req.status:
            incident = IncidentService.update_incident_status(
                db=db, incident_id=incident_id,
                status=IncidentStatus(req.status.upper()),
                user_id=user.id,
            )
        if req.title is not None:
            incident.title = req.title
        if req.description is not None:
            incident.description = req.description
        if req.severity is not None:
            incident.severity = IncidentSeverity(req.severity.upper())
        if req.assignee_id is not None:
            incident.assignee_id = req.assignee_id
        if req.root_cause is not None:
            incident.root_cause = req.root_cause
        if req.resolution is not None:
            incident.resolution = req.resolution
        db.commit()

        await ws_manager.broadcast(workspace_id, {
            "type": "incident.updated",
            "payload": _incident_to_dict(incident),
        })
        return _incident_to_response(incident)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Deployments ────────────────────────────────────────────────────────────────

@router.get("/deployments", response_model=List[DeploymentResponse])
async def list_deployments(
    workspace_id: int,
    service_name: Optional[str] = Query(None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        deployments = DeploymentService.get_deployments(
            db=db, workspace_id=workspace_id,
            service_name=service_name, limit=limit, offset=offset,
        )
        return [_deployment_to_response(d) for d in deployments]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/deployments", response_model=DeploymentResponse, status_code=201)
async def create_deployment(
    workspace_id: int,
    req: DeploymentCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        deployment = DeploymentService.create_deployment(
            db=db, workspace_id=workspace_id,
            service_name=req.service_name, version=req.version,
            environment=req.environment, commit_sha=req.commit_sha,
            branch=req.branch, repository=req.repository,
            pull_request_url=req.pull_request_url,
            triggered_by=req.triggered_by,
            triggered_by_user_id=user.id,
            changelog=req.changelog,
        )
        await ws_manager.broadcast(workspace_id, {
            "type": "deployment.created",
            "payload": _deployment_to_dict(deployment),
        })
        return _deployment_to_response(deployment)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def update_deployment(
    workspace_id: int,
    deployment_id: int,
    req: DeploymentUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        deployment = DeploymentService.complete_deployment(
            db=db, deployment_id=deployment_id,
            status=DeploymentStatus(req.status.upper()),
            duration_seconds=req.duration_seconds,
            risk_score=req.risk_score,
            risk_factors=req.risk_factors,
            rollback_reason=req.rollback_reason,
        )
        if deployment.workspace_id != workspace_id:
            raise HTTPException(status_code=404, detail="Deployment not found")
        await ws_manager.broadcast(workspace_id, {
            "type": "deployment.updated",
            "payload": _deployment_to_dict(deployment),
        })
        return _deployment_to_response(deployment)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Timeline ───────────────────────────────────────────────────────────────────

@router.get("/timeline", response_model=List[TimelineEventResponse])
async def get_timeline(
    workspace_id: int,
    event_types: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    since: Optional[datetime] = Query(None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        parsed_types = None
        if event_types:
            parsed_types = [TimelineEventType(t.strip()) for t in event_types.split(",")]
        events = TimelineService.get_timeline(
            db=db, workspace_id=workspace_id,
            event_types=parsed_types,
            severity=TimelineSeverity(severity) if severity else None,
            since=since, limit=limit, offset=offset,
        )
        return [_timeline_to_response(e) for e in events]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/timeline/grouped", response_model=List[TimelineGroupResponse])
async def get_grouped_timeline(
    workspace_id: int,
    group_window: int = Query(default=30, le=120),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        groups = TimelineService.get_grouped_timeline(
            db=db, workspace_id=workspace_id,
            group_window_minutes=group_window, limit=limit,
        )
        return groups
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Integrations ───────────────────────────────────────────────────────────────

@router.get("/integrations", response_model=List[IntegrationResponse])
async def list_integrations(
    workspace_id: int,
    provider: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        integrations = IntegrationService.get_integrations(
            db=db, workspace_id=workspace_id,
            provider=IntegrationProvider(provider.upper()) if provider else None,
        )
        return [_integration_to_response(i) for i in integrations]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/integrations", response_model=IntegrationResponse, status_code=201)
async def create_integration(
    workspace_id: int,
    req: IntegrationCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        integration = IntegrationService.create_integration(
            db=db, workspace_id=workspace_id,
            provider=IntegrationProvider(req.provider.upper()),
            name=req.name, config=req.config,
            created_by=user.id, description=req.description,
        )
        await ws_manager.broadcast(workspace_id, {
            "type": "integration.created",
            "payload": _integration_to_dict(integration),
        })
        return _integration_to_response(integration)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── AI Memory ──────────────────────────────────────────────────────────────────

@router.post("/memory", response_model=MemoryResponse, status_code=201)
async def store_memory(
    workspace_id: int,
    req: MemoryStoreRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        memory = AIMemoryService.store_memory(
            db=db, workspace_id=workspace_id,
            memory_type=MemoryType(req.memory_type.upper()),
            title=req.title, content=req.content,
            tags=req.tags, metadata=req.metadata,
            confidence=req.confidence,
        )
        return _memory_to_response(memory)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/memory", response_model=List[MemoryResponse])
async def list_memory(
    workspace_id: int,
    memory_type: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        if query:
            memories = AIMemoryService.search_memory(
                db=db, workspace_id=workspace_id,
                query_text=query, limit=limit,
            )
        elif memory_type:
            memories = AIMemoryService.get_memory_by_type(
                db=db, workspace_id=workspace_id,
                memory_type=MemoryType(memory_type.upper()), limit=limit,
            )
        else:
            memories = AIMemoryService.get_memory_by_type(
                db=db, workspace_id=workspace_id,
                memory_type=MemoryType.INCIDENT_PATTERN, limit=limit,
            )
        return [_memory_to_response(m) for m in memories]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/memory/similar", response_model=List[Dict])
async def find_similar_incidents(
    workspace_id: int,
    description: str = Query(...),
    limit: int = Query(default=5, le=20),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        return AIMemoryService.find_similar_incidents(
            db=db, workspace_id=workspace_id,
            incident_description=description, limit=limit,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Escalation Policies ────────────────────────────────────────────────────────

@router.post("/escalation-policies", status_code=201)
async def create_escalation_policy(
    workspace_id: int,
    req: EscalationPolicyCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        policy = EscalationService.create_policy(
            db=db, workspace_id=workspace_id,
            name=req.name, trigger_type=req.trigger_type,
            trigger_config=req.trigger_config, actions=req.actions,
            target_role=req.target_role,
            target_user_ids=req.target_user_ids,
            timeout_minutes=req.timeout_minutes,
            created_by=user.id,
        )
        return {
            "id": policy.id,
            "name": policy.name,
            "trigger_type": policy.trigger_type,
            "is_active": policy.is_active,
            "created_at": policy.created_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Summaries ──────────────────────────────────────────────────────────────────

@router.post("/summaries", response_model=SummaryResponse, status_code=201)
async def create_summary(
    workspace_id: int,
    req: SummaryCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        summary = SummaryService.create_summary(
            db=db, workspace_id=workspace_id,
            summary_type=SummaryType(req.summary_type.upper()),
            title=req.title, content=req.content,
            period_start=req.period_start, period_end=req.period_end,
            summary_data=req.summary_data, metadata=req.metadata,
        )
        return _summary_to_response(summary)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/summaries", response_model=List[SummaryResponse])
async def list_summaries(
    workspace_id: int,
    summary_type: Optional[str] = Query(None),
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        summaries = SummaryService.get_summaries(
            db=db, workspace_id=workspace_id,
            summary_type=SummaryType(summary_type.upper()) if summary_type else None,
            limit=limit,
        )
        return [_summary_to_response(s) for s in summaries]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Activity Feed ──────────────────────────────────────────────────────────────

@router.get("/activity", response_model=List[ActivityFeedResponse])
async def get_activity_feed(
    workspace_id: int,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        activities = ActivityFeedService.get_feed(
            db=db, workspace_id=workspace_id, limit=limit, offset=offset,
        )
        return [_activity_to_response(a) for a in activities]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Postmortems ────────────────────────────────────────────────────────────────

@router.post("/incidents/{incident_id}/postmortem", response_model=PostmortemResponse, status_code=201)
async def create_postmortem(
    workspace_id: int,
    incident_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    incident = IncidentService.get_incident_by_id(db, incident_id)
    if not incident or incident.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    try:
        postmortem = PostmortemService.create_postmortem(
            db=db, incident_id=incident_id, workspace_id=workspace_id,
            title=f"Postmortem: {incident.title}",
            root_cause=incident.root_cause,
            resolution=incident.resolution,
        )
        await ws_manager.broadcast(workspace_id, {
            "type": "postmortem.created",
            "payload": {"id": postmortem.id, "incident_id": incident_id},
        })
        return _postmortem_to_response(postmortem)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/incidents/{incident_id}/postmortem", response_model=PostmortemResponse)
async def get_postmortem(
    workspace_id: int,
    incident_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    postmortem = db.query(PostmortemService).filter(
        PostmortemService.incident_id == incident_id,
        PostmortemService.workspace_id == workspace_id,
    ).first()
    if not postmortem:
        raise HTTPException(status_code=404, detail="Postmortem not found")
    return _postmortem_to_response(postmortem)


# ─── Intelligence Summary ──────────────────────────────────────────────────────

@router.get("/summary", response_model=IntelligenceSummaryResponse)
async def get_intelligence_summary(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    try:
        return IntelligenceEngine.get_workspace_intelligence_summary(
            db=db, workspace_id=workspace_id, user_id=user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=403 if "Access denied" in str(e) else 404, detail=str(e))


# ─── WebSocket ──────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def workspace_ws(
    websocket: WebSocket,
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    await ws_manager.connect(websocket, workspace_id, user.id)
    try:
        while True:
            data = await websocket.receive_json()
            await ws_manager.handle_message(workspace_id, user.id, data)
    except WebSocketDisconnect:
        ws_manager.disconnect(workspace_id, user.id)


# ─── Helper functions ──────────────────────────────────────────────────────────

def _incident_to_response(i) -> IncidentResponse:
    return IncidentResponse(
        id=i.id, workspace_id=i.workspace_id, title=i.title,
        description=i.description, severity=i.severity.value if i.severity else "MEDIUM",
        status=i.status.value if i.status else "DETECTED",
        source=i.source.value if i.source else "ANOMALY",
        detected_at=i.detected_at, acknowledged_at=i.acknowledged_at,
        resolved_at=i.resolved_at, assignee_id=i.assignee_id,
        reporter_id=i.reporter_id, root_cause=i.root_cause,
        impact=i.impact, resolution=i.resolution,
        affected_services=i.affected_services or [],
        slack_channel_name=i.slack_channel_name,
        created_at=i.created_at, updated_at=i.updated_at,
    )


def _incident_to_dict(i) -> Dict:
    return {
        "id": i.id, "workspace_id": i.workspace_id, "title": i.title,
        "severity": i.severity.value if i.severity else "MEDIUM",
        "status": i.status.value if i.status else "DETECTED",
        "source": i.source.value if i.source else "ANOMALY",
        "detected_at": i.detected_at.isoformat() if i.detected_at else None,
        "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
        "assignee_id": i.assignee_id,
    }


def _deployment_to_response(d) -> DeploymentResponse:
    return DeploymentResponse(
        id=d.id, workspace_id=d.workspace_id, service_name=d.service_name,
        environment=d.environment.value if d.environment else "PRODUCTION",
        version=d.version, commit_sha=d.commit_sha, branch=d.branch,
        repository=d.repository, status=d.status.value if d.status else "PENDING",
        triggered_by=d.triggered_by, duration_seconds=d.duration_seconds,
        risk_score=d.risk_score, risk_factors=d.risk_factors or [],
        rollback_reason=d.rollback_reason,
        started_at=d.started_at, completed_at=d.completed_at, created_at=d.created_at,
    )


def _deployment_to_dict(d) -> Dict:
    return {
        "id": d.id, "service_name": d.service_name,
        "environment": d.environment.value if d.environment else "PRODUCTION",
        "version": d.version, "status": d.status.value if d.status else "PENDING",
        "risk_score": d.risk_score,
        "started_at": d.started_at.isoformat() if d.started_at else None,
        "completed_at": d.completed_at.isoformat() if d.completed_at else None,
    }


def _timeline_to_response(e) -> TimelineEventResponse:
    return TimelineEventResponse(
        id=e.id, event_type=e.event_type.value if e.event_type else "UNKNOWN",
        title=e.title, description=e.description,
        severity=e.severity.value if e.severity else "INFO",
        source=e.source, source_id=e.source_id,
        metadata=e.extra_meta or {}, related_entity_type=e.related_entity_type,
        related_entity_id=e.related_entity_id, ai_summary=e.ai_summary,
        event_time=e.event_time,
    )


def _integration_to_response(i) -> IntegrationResponse:
    return IntegrationResponse(
        id=i.id, provider=i.provider.value if i.provider else "UNKNOWN",
        name=i.name, description=i.description,
        is_active=i.is_active, last_sync_at=i.last_sync_at,
        last_error=i.last_error, created_at=i.created_at,
    )


def _integration_to_dict(i) -> Dict:
    return {
        "id": i.id, "provider": i.provider.value if i.provider else "UNKNOWN",
        "name": i.name, "is_active": i.is_active,
    }


def _memory_to_response(m) -> MemoryResponse:
    return MemoryResponse(
        id=m.id, memory_type=m.memory_type.value if m.memory_type else "UNKNOWN",
        title=m.title, content=m.content, tags=m.tags or [],
        confidence=m.confidence, source_incident_id=m.source_incident_id,
        created_at=m.created_at,
    )


def _summary_to_response(s) -> SummaryResponse:
    return SummaryResponse(
        id=s.id, summary_type=s.summary_type.value if s.summary_type else "UNKNOWN",
        title=s.title, content=s.content, generated_by=s.generated_by,
        period_start=s.period_start, period_end=s.period_end, created_at=s.created_at,
    )


def _activity_to_response(a) -> ActivityFeedResponse:
    return ActivityFeedResponse(
        id=a.id, activity_type=a.activity_type.value if a.activity_type else "UNKNOWN",
        title=a.title, description=a.description, actor_name=a.actor_name,
        related_entity_type=a.related_entity_type, related_entity_id=a.related_entity_id,
        metadata=a.extra_meta or {}, activity_time=a.activity_time,
    )


def _postmortem_to_response(p) -> PostmortemResponse:
    return PostmortemResponse(
        id=p.id, incident_id=p.incident_id, title=p.title,
        overview=p.overview, timeline=p.timeline or [],
        impact=p.impact or {}, root_cause=p.root_cause,
        resolution=p.resolution, responders=p.responders or [],
        action_items=p.action_items or [], lessons_learned=p.lessons_learned or [],
        time_to_detect_minutes=p.time_to_detect_minutes,
        time_to_resolve_minutes=p.time_to_resolve_minutes,
        created_at=p.created_at,
    )
