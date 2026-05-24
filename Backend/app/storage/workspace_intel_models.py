"""Workspace Intelligence models for SentinelAI's AI-native operational coordination platform.

Models:
- Incident: Track operational incidents from detection to postmortem
- Deployment: Track service deployments with risk scoring
- TimelineEvent: Unified operational timeline across all sources
- Integration: Third-party integrations (Slack, GitHub, PagerDuty)
- AIMemory: Operational memory with semantic retrieval capabilities
- EscalationPolicy: Smart escalation workflows
- AIAgent: Specialized AI agents for workspace intelligence
- WorkspaceSummary: AI-generated summaries (daily, incident, deployment)
- ActivityFeed: Real-time activity tracking for collaboration
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey,
    Boolean, Enum as SAEnum, BigInteger, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base
import enum


class IncidentSeverity(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(enum.Enum):
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    MITIGATING = "MITIGATING"
    RESOLVED = "RESOLVED"
    POSTMORTEM = "POSTMORTEM"


class IncidentSource(enum.Enum):
    SLACK = "SLACK"
    GITHUB = "GITHUB"
    ANOMALY = "ANOMALY"
    MANUAL = "MANUAL"
    ESCALATION = "ESCALATION"
    DEPLOYMENT = "DEPLOYMENT"
    ALERT = "ALERT"


class DeploymentStatus(enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    ROLLED_BACK = "ROLLED_BACK"


class DeploymentEnvironment(enum.Enum):
    PRODUCTION = "PRODUCTION"
    STAGING = "STAGING"
    DEVELOPMENT = "DEVELOPMENT"
    CANARY = "CANARY"


class TimelineEventType(enum.Enum):
    PR_MERGED = "PR_MERGED"
    PR_RISK_DETECTED = "PR_RISK_DETECTED"
    DEPLOYMENT_STARTED = "DEPLOYMENT_STARTED"
    DEPLOYMENT_COMPLETED = "DEPLOYMENT_COMPLETED"
    DEPLOYMENT_FAILED = "DEPLOYMENT_FAILED"
    DEPLOYMENT_ROLLED_BACK = "DEPLOYMENT_ROLLED_BACK"
    INCIDENT_CREATED = "INCIDENT_CREATED"
    INCIDENT_RESOLVED = "INCIDENT_RESOLVED"
    INCIDENT_ESCALATED = "INCIDENT_ESCALATED"
    ANOMALY_DETECTED = "ANOMALY_DETECTED"
    RISK_INCREASED = "RISK_INCREASED"
    ALERT_TRIGGERED = "ALERT_TRIGGERED"
    SLACK_ESCALATION = "SLACK_ESCALATION"
    ROLLBACK_TRIGGERED = "ROLLBACK_TRIGGERED"
    MEMBER_JOINED = "MEMBER_JOINED"
    INTEGRATION_ADDED = "INTEGRATION_ADDED"
    AI_SUMMARY_GENERATED = "AI_SUMMARY_GENERATED"
    POSTMORTEM_CREATED = "POSTMORTEM_CREATED"


class TimelineSeverity(enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IntegrationProvider(enum.Enum):
    SLACK = "SLACK"
    GITHUB = "GITHUB"
    PAGERDUTY = "PAGERDUTY"
    DATADOG = "DATADOG"
    JIRA = "JIRA"
    OPSGENIE = "OPSGENIE"


class MemoryType(enum.Enum):
    INCIDENT_PATTERN = "INCIDENT_PATTERN"
    ROOT_CAUSE = "ROOT_CAUSE"
    KNOWN_FIX = "KNOWN_FIX"
    DEPLOYMENT_PATTERN = "DEPLOYMENT_PATTERN"
    RECURRING_FAILURE = "RECURRING_FAILURE"
    SERVICE_RISK = "SERVICE_RISK"
    DECISION_LOG = "DECISION_LOG"


class EscalationTriggerType(enum.Enum):
    NO_RESPONSE = "NO_RESPONSE"
    SEVERITY_INCREASE = "SEVERITY_INCREASE"
    REPEATED_FAILURE = "REPEATED_FAILURE"
    RISK_THRESHOLD = "RISK_THRESHOLD"
    DEPLOYMENT_FAILED = "DEPLOYMENT_FAILED"
    SLACK_NO_RESPONSE = "SLACK_NO_RESPONSE"


class AgentType(enum.Enum):
    DEPLOYMENT = "DEPLOYMENT"
    SECURITY = "SECURITY"
    RELIABILITY = "RELIABILITY"
    EXECUTIVE = "EXECUTIVE"
    INCIDENT_COMMANDER = "INCIDENT_COMMANDER"


class SummaryType(enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    INCIDENT = "INCIDENT"
    DEPLOYMENT = "DEPLOYMENT"
    EXECUTIVE = "EXECUTIVE"


class ActivityType(enum.Enum):
    INCIDENT_CREATED = "INCIDENT_CREATED"
    INCIDENT_UPDATED = "INCIDENT_UPDATED"
    INCIDENT_RESOLVED = "INCIDENT_RESOLVED"
    DEPLOYMENT_STARTED = "DEPLOYMENT_STARTED"
    DEPLOYMENT_COMPLETED = "DEPLOYMENT_COMPLETED"
    DEPLOYMENT_FAILED = "DEPLOYMENT_FAILED"
    MEMBER_ADDED = "MEMBER_ADDED"
    MEMBER_REMOVED = "MEMBER_REMOVED"
    INTEGRATION_ADDED = "INTEGRATION_ADDED"
    INTEGRATION_REMOVED = "INTEGRATION_REMOVED"
    SETTINGS_CHANGED = "SETTINGS_CHANGED"
    ESCALATION_TRIGGERED = "ESCALATION_TRIGGERED"
    AI_INSIGHT = "AI_INSIGHT"
    POSTMORTEM_CREATED = "POSTMORTEM_CREATED"
    SUMMARY_GENERATED = "SUMMARY_GENERATED"


class Incident(Base):
    """Operational incident from detection through resolution and postmortem."""
    __tablename__ = "workspace_incidents"

    id = Column(BigInteger, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(SAEnum(IncidentSeverity), nullable=False, default=IncidentSeverity.MEDIUM)
    status = Column(SAEnum(IncidentStatus), nullable=False, default=IncidentStatus.DETECTED)
    source = Column(SAEnum(IncidentSource), nullable=False, default=IncidentSource.ANOMALY)

    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    root_cause = Column(Text, nullable=True)
    impact = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    timeline_summary = Column(Text, nullable=True)

    slack_channel_id = Column(String(100), nullable=True)
    slack_channel_name = Column(String(255), nullable=True)
    slack_message_ts = Column(String(50), nullable=True)

    related_incident_ids = Column(JSON, nullable=True, default=list)
    affected_services = Column(JSON, nullable=True, default=list)
    extra_meta = Column("metadata", JSON, nullable=True, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workspace = relationship("Workspace", backref="incidents")
    assignee = relationship("User", foreign_keys=[assignee_id])
    reporter = relationship("User", foreign_keys=[reporter_id])


class Deployment(Base):
    """Track service deployments with risk scoring and rollback detection."""
    __tablename__ = "workspace_deployments"

    id = Column(BigInteger, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    service_name = Column(String(255), nullable=False, index=True)
    environment = Column(SAEnum(DeploymentEnvironment), nullable=False, default=DeploymentEnvironment.PRODUCTION)
    version = Column(String(100), nullable=False)
    commit_sha = Column(String(40), nullable=True)
    branch = Column(String(255), nullable=True)
    repository = Column(String(500), nullable=True)
    pull_request_url = Column(String(500), nullable=True)
    pull_request_id = Column(String(50), nullable=True)

    status = Column(SAEnum(DeploymentStatus), nullable=False, default=DeploymentStatus.PENDING)
    triggered_by = Column(String(255), nullable=True)
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    risk_score = Column(Float, nullable=True)
    risk_factors = Column(JSON, nullable=True, default=list)

    rollback_sha = Column(String(40), nullable=True)
    rollback_reason = Column(Text, nullable=True)

    changelog = Column(Text, nullable=True)
    changelog_truncated = Column(Boolean, default=False)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workspace = relationship("Workspace", backref="deployments")
    triggered_by_user = relationship("User", foreign_keys=[triggered_by_user_id])


class TimelineEvent(Base):
    """Unified operational timeline event across all sources (incidents, deployments, alerts, etc.)."""
    __tablename__ = "workspace_timeline_events"

    id = Column(BigInteger, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    event_type = Column(SAEnum(TimelineEventType), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(SAEnum(TimelineSeverity), nullable=False, default=TimelineSeverity.INFO)
    source = Column(String(100), nullable=False)

    source_id = Column(String(255), nullable=True, index=True)
    extra_meta = Column("metadata", JSON, nullable=True, default=dict)

    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(BigInteger, nullable=True)

    ai_summary = Column(Text, nullable=True)
    ai_insights = Column(JSON, nullable=True, default=dict)

    event_time = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", backref="timeline_events")

    __table_args__ = (
        Index("idx_timeline_workspace_event", "workspace_id", "event_time"),
        Index("idx_timeline_workspace_type", "workspace_id", "event_type"),
    )


class Integration(Base):
    """Third-party integration configuration (Slack, GitHub, PagerDuty, etc.)."""
    __tablename__ = "workspace_integrations"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    provider = Column(SAEnum(IntegrationProvider), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    config = Column(JSON, nullable=False, default=dict)
    credentials = Column(Text, nullable=True)
    webhook_secret = Column(String(64), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    error_count = Column(Integer, nullable=False, default=0)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workspace = relationship("Workspace", backref="integrations")


class AIMemory(Base):
    """Operational memory for AI-powered retrieval of past incidents, root causes, and fixes."""
    __tablename__ = "workspace_ai_memory"

    id = Column(BigInteger, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    memory_type = Column(SAEnum(MemoryType), nullable=False, index=True)

    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)

    source_incident_id = Column(BigInteger, nullable=True)
    source_deployment_id = Column(BigInteger, nullable=True)
    extra_meta = Column("metadata", JSON, nullable=True, default=dict)
    tags = Column(JSON, nullable=True, default=list)

    confidence = Column(Float, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    access_count = Column(Integer, nullable=False, default=0)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workspace = relationship("Workspace", backref="ai_memories")

    __table_args__ = (
        Index("idx_memory_workspace_type", "workspace_id", "memory_type"),
    )


class EscalationPolicy(Base):
    """Smart escalation workflow definitions for incidents and alerts."""
    __tablename__ = "workspace_escalation_policies"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    trigger_type = Column(SAEnum(EscalationTriggerType), nullable=False)
    trigger_config = Column(JSON, nullable=False, default=dict)
    actions = Column(JSON, nullable=False, default=list)

    target_role = Column(String(50), nullable=True)
    target_user_ids = Column(JSON, nullable=True, default=list)
    notify_channels = Column(JSON, nullable=True, default=list)

    timeout_minutes = Column(Integer, nullable=True)
    max_escalation_levels = Column(Integer, nullable=False, default=3)

    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workspace = relationship("Workspace", backref="escalation_policies")


class EscalationInstance(Base):
    """Active escalation process tracking."""
    __tablename__ = "workspace_escalation_instances"

    id = Column(BigInteger, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("workspace_escalation_policies.id"), nullable=False)
    incident_id = Column(BigInteger, ForeignKey("workspace_incidents.id"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)

    current_level = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="ACTIVE")
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    notified_users = Column(JSON, nullable=True, default=list)
    escalation_log = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    policy = relationship("EscalationPolicy")
    incident = relationship("Incident")
    workspace = relationship("Workspace")


class AIAgent(Base):
    """Specialized AI agents that monitor, analyze, and generate insights per workspace."""
    __tablename__ = "workspace_ai_agents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    agent_type = Column(SAEnum(AgentType), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    config = Column(JSON, nullable=False, default=dict)
    schedule = Column(String(50), nullable=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    run_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workspace = relationship("Workspace", backref="ai_agents")


class AgentRun(Base):
    """Track AI agent execution history."""
    __tablename__ = "workspace_agent_runs"

    id = Column(BigInteger, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("workspace_ai_agents.id"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)

    status = Column(String(50), nullable=False, default="RUNNING")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)

    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    insights = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    tokens_used = Column(Integer, nullable=True)

    agent = relationship("AIAgent")


class WorkspaceSummary(Base):
    """AI-generated workspace summaries (daily briefings, incident reports, executive digests)."""
    __tablename__ = "workspace_summaries"

    id = Column(BigInteger, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    summary_type = Column(SAEnum(SummaryType), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)

    summary_data = Column(JSON, nullable=True, default=dict)
    extra_meta = Column("metadata", JSON, nullable=True, default=dict)

    generated_by = Column(String(50), nullable=False, default="AI")
    agent_id = Column(Integer, ForeignKey("workspace_ai_agents.id"), nullable=True)

    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", backref="summaries")
    agent = relationship("AIAgent")

    __table_args__ = (
        Index("idx_summary_workspace_period", "workspace_id", "summary_type", "period_start"),
    )


class ActivityFeed(Base):
    """Real-time activity feed entries for workspace collaboration awareness."""
    __tablename__ = "workspace_activity_feed"

    id = Column(BigInteger, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    activity_type = Column(SAEnum(ActivityType), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String(255), nullable=True)

    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(BigInteger, nullable=True)
    extra_meta = Column("metadata", JSON, nullable=True, default=dict)

    activity_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", backref="activity_feed")
    actor = relationship("User", foreign_keys=[actor_id])

    __table_args__ = (
        Index("idx_activity_workspace_time", "workspace_id", "activity_time"),
    )


class Postmortem(Base):
    """Auto-generated incident postmortems with timeline, impact, root cause, and action items."""
    __tablename__ = "workspace_postmortems"

    id = Column(BigInteger, primary_key=True, index=True)
    incident_id = Column(BigInteger, ForeignKey("workspace_incidents.id"), nullable=False, unique=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)

    title = Column(String(500), nullable=False)
    overview = Column(Text, nullable=True)
    timeline = Column(JSON, nullable=True, default=list)
    impact = Column(JSON, nullable=True, default=dict)
    root_cause = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)

    responders = Column(JSON, nullable=True, default=list)
    action_items = Column(JSON, nullable=True, default=list)
    lessons_learned = Column(JSON, nullable=True, default=list)
    severity_before = Column(String(50), nullable=True)
    severity_after = Column(String(50), nullable=True)
    time_to_detect_minutes = Column(Integer, nullable=True)
    time_to_resolve_minutes = Column(Integer, nullable=True)

    ai_generated = Column(Boolean, nullable=False, default=False)
    content = Column(Text, nullable=True)
    extra_meta = Column("metadata", JSON, nullable=True, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    incident = relationship("Incident", backref="postmortem")
    workspace = relationship("Workspace", backref="postmortems")
