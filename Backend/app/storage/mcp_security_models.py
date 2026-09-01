"""
Persistent storage models for MCP Security, Agent Guardrails, and Threat Graph.

All scan results, guardrail decisions, agent profiles, threat graph state,
and alerts are persisted to PostgreSQL (with SQLite fallback).
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, JSON, Boolean,
    ForeignKey, Index, Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base
import enum


# ── Enums ──────────────────────────────────────────────────────────────────

class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AlertStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISABLED = "disabled"


# ── MCP Scan Results ───────────────────────────────────────────────────────

class MCPScanResult(Base):
    """Persisted result of an MCP tool or server scan."""
    __tablename__ = "mcp_scan_results"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    scan_type = Column(String(20), nullable=False, comment="tool or server")
    server_name = Column(String(255), nullable=True)
    tool_name = Column(String(255), nullable=True)
    tool_description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=ScanStatus.PENDING.value)

    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="safe")
    finding_count = Column(Integer, default=0)
    findings = Column(JSON, default=list, comment="Array of ScanFinding dicts")

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    scanned_by = Column(String(255), nullable=True, comment="User or system that triggered scan")

    __table_args__ = (
        Index("idx_mcp_scan_server_time", "server_name", "created_at"),
        Index("idx_mcp_scan_risk", "risk_level", "created_at"),
    )


# ── Agent Profiles ─────────────────────────────────────────────────────────

class AgentProfileDB(Base):
    """Persisted agent guardrails profile."""
    __tablename__ = "agent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    agent_id = Column(String(255), unique=True, nullable=False, index=True)
    agent_name = Column(String(255), nullable=True)
    status = Column(String(20), default=AgentStatus.ACTIVE.value)

    allowed_tools = Column(JSON, default=list)
    denied_tools = Column(JSON, default=list)
    allowed_data_sources = Column(JSON, default=list)
    denied_data_sources = Column(JSON, default=list)

    max_calls_per_minute = Column(Integer, default=60)
    max_calls_per_hour = Column(Integer, default=1000)
    trusted_agents = Column(JSON, default=list)
    can_delegate = Column(Boolean, default=True)

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)


# ── Guardrail Decisions ────────────────────────────────────────────────────

class GuardrailDecisionLog(Base):
    """Immutable log of every guardrail decision for audit trail."""
    __tablename__ = "guardrail_decisions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    agent_id = Column(String(255), nullable=False, index=True)
    tool_name = Column(String(255), nullable=False)
    action = Column(String(20), nullable=False, comment="allow/warn/block/escalate")
    title = Column(String(500), nullable=True)
    reason = Column(Text, nullable=True)
    params_hash = Column(String(64), nullable=True, comment="SHA256 of params for dedup")
    risk_score = Column(Float, nullable=True)

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)

    __table_args__ = (
        Index("idx_guardrail_agent_time", "agent_id", "created_at"),
        Index("idx_guardrail_action", "action", "created_at"),
    )


# ── Threat Graph Snapshots ─────────────────────────────────────────────────

class ThreatGraphSnapshot(Base):
    """Point-in-time snapshot of the agent threat graph."""
    __tablename__ = "threat_graph_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    snapshot_name = Column(String(255), nullable=True)
    nodes = Column(JSON, default=list, comment="Array of node dicts")
    edges = Column(JSON, default=list, comment="Array of edge dicts")
    attack_paths = Column(JSON, default=list)
    risk_propagation = Column(JSON, default=dict)
    overall_risk = Column(Float, default=0.0)

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)


# ── Agent Behavioral Baselines ─────────────────────────────────────────────

class AgentBehavioralBaselineDB(Base):
    """ML baseline for agent behavior anomaly detection."""
    __tablename__ = "agent_behavioral_baselines"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    agent_id = Column(String(255), unique=True, nullable=False, index=True)

    # Tool usage frequency distribution (tool_name -> probability)
    tool_frequency = Column(JSON, default=dict, comment="tool_name -> float (0-1)")

    # Parameter patterns per tool (tool_name -> param_stats)
    param_patterns = Column(JSON, default=dict)

    # Timing stats
    mean_calls_per_minute = Column(Float, default=0.0)
    std_calls_per_minute = Column(Float, default=0.0)
    mean_calls_per_hour = Column(Float, default=0.0)
    std_calls_per_hour = Column(Float, default=0.0)

    # Data source access patterns
    data_source_frequency = Column(JSON, default=dict, comment="data_source -> float (0-1)")

    # Anomaly threshold (number of std deviations)
    anomaly_threshold = Column(Float, default=2.0)

    # Total observations for statistical confidence
    observation_count = Column(Integer, default=0)

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)


# ── Alerts ─────────────────────────────────────────────────────────────────

class SecurityAlert(Base):
    """Security alert generated by guardrails or scanner."""
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    alert_type = Column(String(50), nullable=False, comment="scan_finding/guardrail_block/anomaly/rate_limit")
    severity = Column(String(20), nullable=False, comment="critical/high/medium/low/info")
    status = Column(String(20), default=AlertStatus.PENDING.value)

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    agent_id = Column(String(255), nullable=True, index=True)
    tool_name = Column(String(255), nullable=True)
    server_name = Column(String(255), nullable=True)

    # Notification tracking
    slack_sent = Column(Boolean, default=False)
    email_sent = Column(Boolean, default=False)
    pagerduty_sent = Column(Boolean, default=False)

    # Resolution
    acknowledged_by = Column(String(255), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Context
    scan_result_id = Column(Integer, ForeignKey("mcp_scan_results.id"), nullable=True)
    decision_log_id = Column(Integer, ForeignKey("guardrail_decisions.id"), nullable=True)

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)

    __table_args__ = (
        Index("idx_alert_severity_status", "severity", "status"),
        Index("idx_alert_agent_time", "agent_id", "created_at"),
    )


# ── MCP Config Audit Log ───────────────────────────────────────────────────

class MCPConfigAuditLog(Base):
    """Tracks MCP configuration file changes for auto-scan triggering."""
    __tablename__ = "mcp_config_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    config_path = Column(String(1024), nullable=False)
    change_type = Column(String(20), nullable=False, comment="created/modified/deleted")
    file_hash = Column(String(64), nullable=True, comment="SHA256 of file content")
    server_name = Column(String(255), nullable=True)
    tool_count = Column(Integer, nullable=True)
    scan_result_id = Column(Integer, ForeignKey("mcp_scan_results.id"), nullable=True)

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)


# ── Webhook Endpoints ──────────────────────────────────────────────────────

class WebhookEndpoint(Base):
    """Registered webhook endpoints for alert delivery."""
    __tablename__ = "webhook_endpoints"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    name = Column(String(255), nullable=False)
    url = Column(String(2048), nullable=False)
    webhook_type = Column(String(50), nullable=False, comment="slack/email/pagerduty/custom")
    is_active = Column(Boolean, default=True)

    # Filtering
    min_severity = Column(String(20), default="high")
    alert_types = Column(JSON, default=list, comment="List of alert_type strings to send")

    # Auth
    auth_header = Column(String(500), nullable=True, comment="Bearer token or webhook secret")

    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)

    __table_args__ = (
        Index("idx_webhook_type_active", "webhook_type", "is_active"),
    )
