"""Core Workspace Intelligence Engine.

Orchestrates all workspace intelligence: incidents, deployments, timelines,
AI memory, escalations, integrations, and summaries. This is the central
coordination layer for the AI-native operational workspace.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.storage.workspace_models import Workspace, WorkspaceMember
from app.storage.workspace_intel_models import (
    Incident, IncidentStatus, IncidentSeverity, IncidentSource,
    Deployment, DeploymentStatus, TimelineEvent, TimelineEventType,
    TimelineSeverity, AIMemory, MemoryType, EscalationPolicy,
    EscalationInstance, AIAgent, AgentType, AgentRun,
    WorkspaceSummary, SummaryType, ActivityFeed, ActivityType,
    Integration, IntegrationProvider, Postmortem,
)
from app.storage.user_models import User


class WorkspaceVerificationMixin:
    """Mixin for workspace access verification."""

    @staticmethod
    def verify_workspace_access(db: Session, workspace_id: int, user_id: int) -> Workspace:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise ValueError("Workspace not found")
        is_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_active == True,
        ).first()
        if not is_member:
            raise ValueError("Access denied to this workspace")
        return workspace


class IncidentService(WorkspaceVerificationMixin):
    """Manage incident lifecycle from detection through resolution and postmortem."""

    @staticmethod
    def create_incident(
        db: Session,
        workspace_id: int,
        title: str,
        description: Optional[str] = None,
        severity: IncidentSeverity = IncidentSeverity.MEDIUM,
        source: IncidentSource = IncidentSource.ANOMALY,
        reporter_id: Optional[int] = None,
        assignee_id: Optional[int] = None,
        affected_services: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Incident:
        incident = Incident(
            workspace_id=workspace_id,
            title=title,
            description=description,
            severity=severity,
            source=source,
            status=IncidentStatus.DETECTED,
            reporter_id=reporter_id,
            assignee_id=assignee_id,
            affected_services=affected_services or [],
            metadata=metadata or {},
        )
        db.add(incident)
        db.flush()

        TimelineService.create_event(
            db=db,
            workspace_id=workspace_id,
            event_type=TimelineEventType.INCIDENT_CREATED,
            title=f"Incident created: {title}",
            description=f"Severity: {severity.value}, Source: {source.value}",
            severity=TimelineSeverity.HIGH if severity in (IncidentSeverity.HIGH, IncidentSeverity.CRITICAL) else TimelineSeverity.MEDIUM,
            source="SYSTEM",
            metadata={"incident_id": incident.id, "severity": severity.value},
            related_entity_type="incident",
            related_entity_id=incident.id,
        )

        ActivityFeedService.log_activity(
            db=db,
            workspace_id=workspace_id,
            activity_type=ActivityType.INCIDENT_CREATED,
            title=f"Incident created: {title}",
            description=f"Severity: {severity.value}",
            actor_id=reporter_id,
            related_entity_type="incident",
            related_entity_id=incident.id,
        )

        db.commit()
        return incident

    @staticmethod
    def update_incident_status(
        db: Session,
        incident_id: int,
        status: IncidentStatus,
        user_id: Optional[int] = None,
    ) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError("Incident not found")

        old_status = incident.status
        incident.status = status

        if status == IncidentStatus.RESOLVED:
            incident.resolved_at = datetime.utcnow()

        if status == IncidentStatus.INVESTIGATING and not incident.acknowledged_at:
            incident.acknowledged_at = datetime.utcnow()

        event_type_map = {
            IncidentStatus.RESOLVED: TimelineEventType.INCIDENT_RESOLVED,
        }
        event_type = event_type_map.get(status)
        if event_type:
            TimelineService.create_event(
                db=db,
                workspace_id=incident.workspace_id,
                event_type=event_type,
                title=f"Incident {status.value.lower()}: {incident.title}",
                source="SYSTEM",
                severity=TimelineSeverity.INFO,
                related_entity_type="incident",
                related_entity_id=incident.id,
            )

        ActivityFeedService.log_activity(
            db=db,
            workspace_id=incident.workspace_id,
            activity_type=ActivityType.INCIDENT_UPDATED,
            title=f"Incident status changed: {old_status.value} -> {status.value}",
            actor_id=user_id,
            related_entity_type="incident",
            related_entity_id=incident.id,
        )

        db.commit()
        return incident

    @staticmethod
    def get_incidents(
        db: Session,
        workspace_id: int,
        status: Optional[IncidentStatus] = None,
        severity: Optional[IncidentSeverity] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Incident]:
        query = db.query(Incident).filter(Incident.workspace_id == workspace_id)
        if status:
            query = query.filter(Incident.status == status)
        if severity:
            query = query.filter(Incident.severity == severity)
        return query.order_by(desc(Incident.detected_at)).offset(offset).limit(limit).all()

    @staticmethod
    def get_incident_by_id(db: Session, incident_id: int) -> Optional[Incident]:
        return db.query(Incident).filter(Incident.id == incident_id).first()


class DeploymentService(WorkspaceVerificationMixin):
    """Track and analyze service deployments with risk scoring."""

    @staticmethod
    def create_deployment(
        db: Session,
        workspace_id: int,
        service_name: str,
        version: str,
        environment: str = "PRODUCTION",
        commit_sha: Optional[str] = None,
        branch: Optional[str] = None,
        repository: Optional[str] = None,
        pull_request_url: Optional[str] = None,
        triggered_by: Optional[str] = None,
        triggered_by_user_id: Optional[int] = None,
        changelog: Optional[str] = None,
    ) -> Deployment:
        deployment = Deployment(
            workspace_id=workspace_id,
            service_name=service_name,
            environment=environment,
            version=version,
            commit_sha=commit_sha,
            branch=branch,
            repository=repository,
            pull_request_url=pull_request_url,
            status=DeploymentStatus.IN_PROGRESS,
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id,
            changelog=changelog,
            started_at=datetime.utcnow(),
        )
        db.add(deployment)
        db.flush()

        TimelineService.create_event(
            db=db,
            workspace_id=workspace_id,
            event_type=TimelineEventType.DEPLOYMENT_STARTED,
            title=f"Deployment started: {service_name} v{version}",
            description=f"Environment: {environment}, Branch: {branch or 'unknown'}",
            severity=TimelineSeverity.INFO,
            source="SYSTEM",
            metadata={"deployment_id": deployment.id, "service": service_name, "version": version},
            related_entity_type="deployment",
            related_entity_id=deployment.id,
        )

        ActivityFeedService.log_activity(
            db=db,
            workspace_id=workspace_id,
            activity_type=ActivityType.DEPLOYMENT_STARTED,
            title=f"Deployment started: {service_name} v{version}",
            actor_id=triggered_by_user_id,
            related_entity_type="deployment",
            related_entity_id=deployment.id,
        )

        db.commit()
        return deployment

    @staticmethod
    def complete_deployment(
        db: Session,
        deployment_id: int,
        status: DeploymentStatus,
        duration_seconds: Optional[int] = None,
        risk_score: Optional[float] = None,
        risk_factors: Optional[List[str]] = None,
        rollback_reason: Optional[str] = None,
    ) -> Deployment:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            raise ValueError("Deployment not found")

        deployment.status = status
        deployment.completed_at = datetime.utcnow()
        if duration_seconds:
            deployment.duration_seconds = duration_seconds
        if risk_score is not None:
            deployment.risk_score = risk_score
        if risk_factors:
            deployment.risk_factors = risk_factors

        event_type_map = {
            DeploymentStatus.SUCCESS: TimelineEventType.DEPLOYMENT_COMPLETED,
            DeploymentStatus.FAILED: TimelineEventType.DEPLOYMENT_FAILED,
            DeploymentStatus.ROLLED_BACK: TimelineEventType.DEPLOYMENT_ROLLED_BACK,
        }
        event_type = event_type_map.get(status)
        severity_map = {
            DeploymentStatus.SUCCESS: TimelineSeverity.INFO,
            DeploymentStatus.FAILED: TimelineSeverity.CRITICAL,
            DeploymentStatus.ROLLED_BACK: TimelineSeverity.HIGH,
        }

        if event_type:
            TimelineService.create_event(
                db=db,
                workspace_id=deployment.workspace_id,
                event_type=event_type,
                title=f"Deployment {status.value.lower()}: {deployment.service_name} v{deployment.version}",
                description=rollback_reason or f"Duration: {duration_seconds or '?'}s",
                severity=severity_map.get(status, TimelineSeverity.INFO),
                source="SYSTEM",
                metadata={
                    "deployment_id": deployment.id,
                    "service": deployment.service_name,
                    "status": status.value,
                    "risk_score": risk_score,
                },
                related_entity_type="deployment",
                related_entity_id=deployment.id,
            )

        activity_type_map = {
            DeploymentStatus.SUCCESS: ActivityType.DEPLOYMENT_COMPLETED,
            DeploymentStatus.FAILED: ActivityType.DEPLOYMENT_FAILED,
        }
        atype = activity_type_map.get(status)
        if atype:
            ActivityFeedService.log_activity(
                db=db,
                workspace_id=deployment.workspace_id,
                activity_type=atype,
                title=f"Deployment {status.value.lower()}: {deployment.service_name} v{deployment.version}",
                actor_id=deployment.triggered_by_user_id,
                related_entity_type="deployment",
                related_entity_id=deployment.id,
            )

        db.commit()
        return deployment

    @staticmethod
    def get_deployments(
        db: Session,
        workspace_id: int,
        service_name: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Deployment]:
        query = db.query(Deployment).filter(Deployment.workspace_id == workspace_id)
        if service_name:
            query = query.filter(Deployment.service_name == service_name)
        return query.order_by(desc(Deployment.started_at)).offset(offset).limit(limit).all()


class TimelineService(WorkspaceVerificationMixin):
    """Unified operational timeline across all sources."""

    @staticmethod
    def create_event(
        db: Session,
        workspace_id: int,
        event_type: TimelineEventType,
        title: str,
        description: Optional[str] = None,
        severity: TimelineSeverity = TimelineSeverity.INFO,
        source: str = "SYSTEM",
        source_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None,
        ai_summary: Optional[str] = None,
        ai_insights: Optional[Dict[str, Any]] = None,
        event_time: Optional[datetime] = None,
    ) -> TimelineEvent:
        event = TimelineEvent(
            workspace_id=workspace_id,
            event_type=event_type,
            title=title,
            description=description,
            severity=severity,
            source=source,
            source_id=source_id,
            metadata=metadata or {},
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            ai_summary=ai_summary,
            ai_insights=ai_insights,
            event_time=event_time or datetime.utcnow(),
        )
        db.add(event)
        db.flush()
        return event

    @staticmethod
    def get_timeline(
        db: Session,
        workspace_id: int,
        event_types: Optional[List[TimelineEventType]] = None,
        severity: Optional[TimelineSeverity] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TimelineEvent]:
        query = db.query(TimelineEvent).filter(TimelineEvent.workspace_id == workspace_id)
        if event_types:
            query = query.filter(TimelineEvent.event_type.in_(event_types))
        if severity:
            query = query.filter(TimelineEvent.severity == severity)
        if since:
            query = query.filter(TimelineEvent.event_time >= since)
        if until:
            query = query.filter(TimelineEvent.event_time <= until)
        return query.order_by(desc(TimelineEvent.event_time)).offset(offset).limit(limit).all()

    @staticmethod
    def get_grouped_timeline(
        db: Session,
        workspace_id: int,
        group_window_minutes: int = 30,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        events = (
            db.query(TimelineEvent)
            .filter(TimelineEvent.workspace_id == workspace_id)
            .order_by(desc(TimelineEvent.event_time))
            .limit(limit * 3)
            .all()
        )

        if not events:
            return []

        groups: List[Dict[str, Any]] = []
        current_group: List[TimelineEvent] = [events[0]]

        for i in range(1, len(events)):
            time_diff = (current_group[-1].event_time - events[i].event_time).total_seconds() / 60
            if abs(time_diff) <= group_window_minutes:
                current_group.append(events[i])
            else:
                groups.append(_build_event_group(current_group))
                current_group = [events[i]]

        if current_group:
            groups.append(_build_event_group(current_group))

        return groups[:limit]


def _build_event_group(events: List[TimelineEvent]) -> Dict[str, Any]:
    severities = [e.severity for e in events]
    max_severity = max(
        (s for s in severities),
        key=lambda s: {"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}.get(
            s.value if hasattr(s, "value") else str(s), 0
        ),
    )
    return {
        "time_start": events[-1].event_time.isoformat(),
        "time_end": events[0].event_time.isoformat(),
        "event_count": len(events),
        "max_severity": max_severity.value,
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type.value,
                "title": e.title,
                "description": e.description,
                "severity": e.severity.value,
                "source": e.source,
                "event_time": e.event_time.isoformat(),
                "metadata": e.extra_meta,
                "related_entity_type": e.related_entity_type,
                "related_entity_id": e.related_entity_id,
                "ai_summary": e.ai_summary,
            }
            for e in reversed(events)
        ],
    }


class IntegrationService(WorkspaceVerificationMixin):
    """Manage third-party integrations (Slack, GitHub, PagerDuty, etc.)."""

    @staticmethod
    def create_integration(
        db: Session,
        workspace_id: int,
        provider: IntegrationProvider,
        name: str,
        config: Dict[str, Any],
        created_by: Optional[int] = None,
        description: Optional[str] = None,
    ) -> Integration:
        integration = Integration(
            workspace_id=workspace_id,
            provider=provider,
            name=name,
            description=description,
            config=config,
            created_by=created_by,
        )
        db.add(integration)
        db.flush()

        ActivityFeedService.log_activity(
            db=db,
            workspace_id=workspace_id,
            activity_type=ActivityType.INTEGRATION_ADDED,
            title=f"{provider.value} integration added: {name}",
            actor_id=created_by,
            related_entity_type="integration",
            related_entity_id=integration.id,
        )

        db.commit()
        return integration

    @staticmethod
    def get_integrations(
        db: Session,
        workspace_id: int,
        provider: Optional[IntegrationProvider] = None,
    ) -> List[Integration]:
        query = db.query(Integration).filter(Integration.workspace_id == workspace_id)
        if provider:
            query = query.filter(Integration.provider == provider)
        return query.all()

    @staticmethod
    def update_integration_sync(
        db: Session,
        integration_id: int,
        success: bool,
        error: Optional[str] = None,
    ) -> Integration:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        if not integration:
            raise ValueError("Integration not found")
        integration.last_sync_at = datetime.utcnow()
        if success:
            integration.error_count = 0
            integration.last_error = None
        else:
            integration.error_count = (integration.error_count or 0) + 1
            integration.last_error = error
        db.commit()
        return integration


class AIMemoryService(WorkspaceVerificationMixin):
    """AI operational memory with semantic retrieval."""

    @staticmethod
    def store_memory(
        db: Session,
        workspace_id: int,
        memory_type: MemoryType,
        title: str,
        content: str,
        source_incident_id: Optional[int] = None,
        source_deployment_id: Optional[int] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        confidence: Optional[float] = None,
    ) -> AIMemory:
        memory = AIMemory(
            workspace_id=workspace_id,
            memory_type=memory_type,
            title=title,
            content=content,
            source_incident_id=source_incident_id,
            source_deployment_id=source_deployment_id,
            tags=tags or [],
            metadata=metadata or {},
            confidence=confidence,
        )
        db.add(memory)
        db.commit()
        return memory

    @staticmethod
    def search_memory(
        db: Session,
        workspace_id: int,
        query_text: str,
        memory_types: Optional[List[MemoryType]] = None,
        limit: int = 10,
    ) -> List[AIMemory]:
        query = db.query(AIMemory).filter(
            AIMemory.workspace_id == workspace_id,
            AIMemory.is_active == True,
        )
        if memory_types:
            query = query.filter(AIMemory.memory_type.in_(memory_types))

        search_filter = f"%{query_text}%"
        query = query.filter(
            AIMemory.title.ilike(search_filter) | AIMemory.content.ilike(search_filter)
        )

        results = query.order_by(desc(AIMemory.created_at)).limit(limit).all()
        for m in results:
            m.access_count = (m.access_count or 0) + 1
            m.last_accessed_at = datetime.utcnow()
        db.commit()
        return results

    @staticmethod
    def get_memory_by_type(
        db: Session,
        workspace_id: int,
        memory_type: MemoryType,
        limit: int = 20,
    ) -> List[AIMemory]:
        return (
            db.query(AIMemory)
            .filter(
                AIMemory.workspace_id == workspace_id,
                AIMemory.memory_type == memory_type,
                AIMemory.is_active == True,
            )
            .order_by(desc(AIMemory.confidence), desc(AIMemory.created_at))
            .limit(limit)
            .all()
        )

    @staticmethod
    def find_similar_incidents(
        db: Session,
        workspace_id: int,
        incident_description: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        memories = AIMemoryService.search_memory(
            db=db,
            workspace_id=workspace_id,
            query_text=incident_description,
            memory_types=[MemoryType.INCIDENT_PATTERN, MemoryType.ROOT_CAUSE, MemoryType.KNOWN_FIX],
            limit=limit,
        )
        return [
            {
                "id": m.id,
                "title": m.title,
                "content": m.content,
                "memory_type": m.memory_type.value,
                "confidence": m.confidence,
                "source_incident_id": m.source_incident_id,
                "tags": m.tags,
                "created_at": m.created_at.isoformat(),
            }
            for m in memories
        ]


class EscalationService(WorkspaceVerificationMixin):
    """Smart escalation engine for incidents and alerts."""

    @staticmethod
    def create_policy(
        db: Session,
        workspace_id: int,
        name: str,
        trigger_type: str,
        trigger_config: Dict[str, Any],
        actions: List[Dict[str, Any]],
        target_role: Optional[str] = None,
        target_user_ids: Optional[List[int]] = None,
        notify_channels: Optional[List[str]] = None,
        timeout_minutes: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> EscalationPolicy:
        policy = EscalationPolicy(
            workspace_id=workspace_id,
            name=name,
            trigger_type=trigger_type,
            trigger_config=trigger_config,
            actions=actions,
            target_role=target_role,
            target_user_ids=target_user_ids or [],
            notify_channels=notify_channels or [],
            timeout_minutes=timeout_minutes,
            created_by=created_by,
        )
        db.add(policy)
        db.commit()
        return policy

    @staticmethod
    def trigger_escalation(
        db: Session,
        policy_id: int,
        incident_id: Optional[int] = None,
        workspace_id: Optional[int] = None,
    ) -> EscalationInstance:
        policy = db.query(EscalationPolicy).filter(EscalationPolicy.id == policy_id).first()
        if not policy:
            raise ValueError("Escalation policy not found")

        instance = EscalationInstance(
            policy_id=policy_id,
            incident_id=incident_id,
            workspace_id=policy.workspace_id,
            current_level=1,
            status="ACTIVE",
            escalation_log=[{
                "level": 1,
                "triggered_at": datetime.utcnow().isoformat(),
                "action": "escalation_started",
            }],
        )
        db.add(instance)
        db.commit()

        ActivityFeedService.log_activity(
            db=db,
            workspace_id=policy.workspace_id,
            activity_type=ActivityType.ESCALATION_TRIGGERED,
            title=f"Escalation triggered: {policy.name}",
            description=f"Policy: {policy.name}, Level 1",
            related_entity_type="incident",
            related_entity_id=incident_id,
        )

        return instance

    @staticmethod
    def escalate_level(
        db: Session,
        instance_id: int,
    ) -> Optional[EscalationInstance]:
        instance = db.query(EscalationInstance).filter(EscalationInstance.id == instance_id).first()
        if not instance or instance.status != "ACTIVE":
            return None

        policy = instance.policy
        if instance.current_level >= (policy.max_escalation_levels or 3):
            instance.status = "RESOLVED"
            db.commit()
            return instance

        instance.current_level += 1
        log_entry = {
            "level": instance.current_level,
            "triggered_at": datetime.utcnow().isoformat(),
            "action": f"escalated_to_level_{instance.current_level}",
        }
        current_log = instance.escalation_log or []
        current_log.append(log_entry)
        instance.escalation_log = current_log
        db.commit()
        return instance


class SummaryService(WorkspaceVerificationMixin):
    """AI-generated workspace summaries."""

    @staticmethod
    def create_summary(
        db: Session,
        workspace_id: int,
        summary_type: SummaryType,
        title: str,
        content: str,
        period_start: datetime,
        period_end: datetime,
        summary_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        agent_id: Optional[int] = None,
    ) -> WorkspaceSummary:
        summary = WorkspaceSummary(
            workspace_id=workspace_id,
            summary_type=summary_type,
            title=title,
            content=content,
            summary_data=summary_data or {},
            metadata=metadata or {},
            generated_by="AI" if agent_id else "SYSTEM",
            agent_id=agent_id,
            period_start=period_start,
            period_end=period_end,
        )
        db.add(summary)
        db.flush()

        TimelineService.create_event(
            db=db,
            workspace_id=workspace_id,
            event_type=TimelineEventType.AI_SUMMARY_GENERATED,
            title=f"AI summary: {title}",
            description=f"Type: {summary_type.value}",
            severity=TimelineSeverity.INFO,
            source="AI",
            metadata={"summary_id": summary.id, "summary_type": summary_type.value},
            related_entity_type="summary",
            related_entity_id=summary.id,
        )

        db.commit()
        return summary

    @staticmethod
    def get_summaries(
        db: Session,
        workspace_id: int,
        summary_type: Optional[SummaryType] = None,
        limit: int = 10,
    ) -> List[WorkspaceSummary]:
        query = db.query(WorkspaceSummary).filter(WorkspaceSummary.workspace_id == workspace_id)
        if summary_type:
            query = query.filter(WorkspaceSummary.summary_type == summary_type)
        return query.order_by(desc(WorkspaceSummary.created_at)).limit(limit).all()


class ActivityFeedService(WorkspaceVerificationMixin):
    """Real-time activity feed for workspace collaboration."""

    @staticmethod
    def log_activity(
        db: Session,
        workspace_id: int,
        activity_type: ActivityType,
        title: str,
        description: Optional[str] = None,
        actor_id: Optional[int] = None,
        actor_name: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ActivityFeed:
        activity = ActivityFeed(
            workspace_id=workspace_id,
            activity_type=activity_type,
            title=title,
            description=description,
            actor_id=actor_id,
            actor_name=actor_name,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            metadata=metadata or {},
        )
        db.add(activity)
        db.flush()
        return activity

    @staticmethod
    def get_feed(
        db: Session,
        workspace_id: int,
        activity_types: Optional[List[ActivityType]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ActivityFeed]:
        query = db.query(ActivityFeed).filter(ActivityFeed.workspace_id == workspace_id)
        if activity_types:
            query = query.filter(ActivityFeed.activity_type.in_(activity_types))
        return query.order_by(desc(ActivityFeed.activity_time)).offset(offset).limit(limit).all()


class PostmortemService(WorkspaceVerificationMixin):
    """Auto-generated incident postmortems."""

    @staticmethod
    def create_postmortem(
        db: Session,
        incident_id: int,
        workspace_id: int,
        title: str,
        overview: Optional[str] = None,
        timeline: Optional[List[Dict]] = None,
        impact: Optional[Dict] = None,
        root_cause: Optional[str] = None,
        resolution: Optional[str] = None,
        responders: Optional[List[Dict]] = None,
        action_items: Optional[List[Dict]] = None,
        lessons_learned: Optional[List[str]] = None,
        content: Optional[str] = None,
    ) -> Postmortem:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError("Incident not found")

        ttd = None
        ttr = None
        if incident.detected_at:
            if incident.acknowledged_at:
                ttd = int((incident.acknowledged_at - incident.detected_at).total_seconds() / 60)
            if incident.resolved_at:
                ttr = int((incident.resolved_at - incident.detected_at).total_seconds() / 60)

        postmortem = Postmortem(
            incident_id=incident_id,
            workspace_id=workspace_id,
            title=title,
            overview=overview or incident.description,
            timeline=timeline or [],
            impact=impact or {},
            root_cause=root_cause or incident.root_cause,
            resolution=resolution or incident.resolution,
            responders=responders or [],
            action_items=action_items or [],
            lessons_learned=lessons_learned or [],
            severity_before=incident.severity.value,
            severity_after="RESOLVED",
            time_to_detect_minutes=ttd,
            time_to_resolve_minutes=ttr,
            content=content,
            ai_generated=True,
        )
        db.add(postmortem)
        db.flush()

        TimelineService.create_event(
            db=db,
            workspace_id=workspace_id,
            event_type=TimelineEventType.POSTMORTEM_CREATED,
            title=f"Postmortem created: {title}",
            source="SYSTEM",
            severity=TimelineSeverity.INFO,
            related_entity_type="postmortem",
            related_entity_id=postmortem.id,
        )

        db.commit()
        return postmortem


class IntelligenceEngine:
    """Central orchestrator for all workspace intelligence operations."""

    incident = IncidentService()
    deployment = DeploymentService()
    timeline = TimelineService()
    integration = IntegrationService()
    memory = AIMemoryService()
    escalation = EscalationService()
    summary = SummaryService()
    activity = ActivityFeedService()
    postmortem = PostmortemService()

    @staticmethod
    def get_workspace_intelligence_summary(
        db: Session,
        workspace_id: int,
        user_id: int,
    ) -> Dict[str, Any]:
        WorkspaceVerificationMixin.verify_workspace_access(db, workspace_id, user_id)

        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        active_incidents = db.query(func.count(Incident.id)).filter(
            Incident.workspace_id == workspace_id,
            Incident.status.in_([IncidentStatus.DETECTED, IncidentStatus.INVESTIGATING, IncidentStatus.MITIGATING]),
        ).scalar() or 0

        recent_events = db.query(func.count(TimelineEvent.id)).filter(
            TimelineEvent.workspace_id == workspace_id,
            TimelineEvent.event_time >= seven_days_ago,
        ).scalar() or 0

        recent_deployments = db.query(func.count(Deployment.id)).filter(
            Deployment.workspace_id == workspace_id,
            Deployment.started_at >= seven_days_ago,
        ).scalar() or 0

        failed_deployments = db.query(func.count(Deployment.id)).filter(
            Deployment.workspace_id == workspace_id,
            Deployment.started_at >= seven_days_ago,
            Deployment.status == DeploymentStatus.FAILED,
        ).scalar() or 0

        critical_events = db.query(func.count(TimelineEvent.id)).filter(
            TimelineEvent.workspace_id == workspace_id,
            TimelineEvent.event_time >= seven_days_ago,
            TimelineEvent.severity == TimelineSeverity.CRITICAL,
        ).scalar() or 0

        member_count = db.query(func.count(WorkspaceMember.user_id)).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.is_active == True,
        ).scalar() or 0

        memory_count = db.query(func.count(AIMemory.id)).filter(
            AIMemory.workspace_id == workspace_id,
            AIMemory.is_active == True,
        ).scalar() or 0

        activities_today = db.query(func.count(ActivityFeed.id)).filter(
            ActivityFeed.workspace_id == workspace_id,
            ActivityFeed.activity_time >= today_start,
        ).scalar() or 0

        return {
            "active_incidents": active_incidents,
            "recent_events_7d": recent_events,
            "recent_deployments_7d": recent_deployments,
            "failed_deployments_7d": failed_deployments,
            "critical_events_7d": critical_events,
            "member_count": member_count,
            "memory_entries": memory_count,
            "activities_today": activities_today,
            "health_score": _calculate_health_score(
                active_incidents, failed_deployments, critical_events
            ),
        }


def _calculate_health_score(
    active_incidents: int,
    failed_deployments: int,
    critical_events: int,
) -> float:
    score = 100.0
    score -= active_incidents * 10
    score -= failed_deployments * 15
    score -= critical_events * 5
    return max(0.0, min(100.0, score))
