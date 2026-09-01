"""
Persistence layer for MCP Security features.

Wraps the existing scanner, guardrails, and graph with database storage.
Every scan result, guardrail decision, and alert is persisted for audit
and historical analysis.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _json_dumps(value):
    """JSON serialize — returns None for None values."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, default=str)

from app.storage.db import get_db
from app.storage.mcp_security_models import (
    MCPScanResult,
    AgentProfileDB,
    GuardrailDecisionLog,
    ThreatGraphSnapshot,
    AgentBehavioralBaselineDB,
    SecurityAlert,
    MCPConfigAuditLog,
    ScanStatus,
    AlertStatus,
    AgentStatus,
)

logger = logging.getLogger(__name__)


# ── Scan Result Persistence ────────────────────────────────────────────────

def persist_tool_scan(
    db: Session,
    tool_name: str,
    description: str,
    risk_score: float,
    risk_level: str,
    findings: list,
    org_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
    scanned_by: Optional[str] = None,
) -> MCPScanResult:
    """Persist a single tool scan result."""
    record = MCPScanResult(
        scan_type="tool",
        tool_name=tool_name,
        tool_description=description,
        status=ScanStatus.COMPLETED.value,
        risk_score=risk_score,
        risk_level=risk_level,
        finding_count=len(findings),
        findings=[f.as_dict() if hasattr(f, "as_dict") else f for f in findings],
        org_id=org_id,
        workspace_id=workspace_id,
        scanned_by=scanned_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info(
        "Persisted tool scan: tool=%s risk=%s findings=%d id=%d",
        tool_name, risk_level, len(findings), record.id,
    )
    return record


def persist_server_scan(
    db: Session,
    server_name: str,
    tool_results: list,
    total_findings: int,
    overall_risk: float,
    risk_level: str,
    org_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
    scanned_by: Optional[str] = None,
) -> MCPScanResult:
    """Persist a server-level scan result."""
    all_findings = []
    for tr in tool_results:
        all_findings.extend(tr.findings if hasattr(tr, "findings") else tr.get("findings", []))

    record = MCPScanResult(
        scan_type="server",
        server_name=server_name,
        status=ScanStatus.COMPLETED.value,
        risk_score=overall_risk,
        risk_level=risk_level,
        finding_count=total_findings,
        findings=[f.as_dict() if hasattr(f, "as_dict") else f for f in all_findings],
        org_id=org_id,
        workspace_id=workspace_id,
        scanned_by=scanned_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info(
        "Persisted server scan: server=%s risk=%s findings=%d id=%d",
        server_name, risk_level, total_findings, record.id,
    )
    return record


def get_scan_history(
    db: Session,
    org_id: Optional[int] = None,
    server_name: Optional[str] = None,
    tool_name: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[MCPScanResult]:
    """Query scan history with filters."""
    q = db.query(MCPScanResult)
    if org_id:
        q = q.filter(MCPScanResult.org_id == org_id)
    if server_name:
        q = q.filter(MCPScanResult.server_name == server_name)
    if tool_name:
        q = q.filter(MCPScanResult.tool_name == tool_name)
    if risk_level:
        q = q.filter(MCPScanResult.risk_level == risk_level)
    return q.order_by(MCPScanResult.created_at.desc()).offset(offset).limit(limit).all()


# ── Agent Profile Persistence ──────────────────────────────────────────────

def persist_agent_profile(db: Session, profile_data: dict) -> AgentProfileDB:
    """Create or update an agent profile."""
    existing = db.query(AgentProfileDB).filter(
        AgentProfileDB.agent_id == profile_data["agent_id"]
    ).first()

    if existing:
        for key, value in profile_data.items():
            if hasattr(existing, key) and key != "id":
                setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing

    record = AgentProfileDB(**profile_data)
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("Persisted agent profile: agent_id=%s", profile_data.get("agent_id"))
    return record


def get_agent_profile(db: Session, agent_id: str) -> Optional[AgentProfileDB]:
    """Get an agent profile by ID."""
    return db.query(AgentProfileDB).filter(AgentProfileDB.agent_id == agent_id).first()


def list_agent_profiles(
    db: Session,
    org_id: Optional[int] = None,
    status: Optional[str] = None,
) -> List[AgentProfileDB]:
    """List all agent profiles."""
    q = db.query(AgentProfileDB)
    if org_id:
        q = q.filter(AgentProfileDB.org_id == org_id)
    if status:
        q = q.filter(AgentProfileDB.status == status)
    return q.order_by(AgentProfileDB.created_at.desc()).all()


# ── Guardrail Decision Logging ─────────────────────────────────────────────

def log_guardrail_decision(
    db: Session,
    agent_id: str,
    tool_name: str,
    action: str,
    title: str,
    reason: Optional[str] = None,
    params: Optional[dict] = None,
    risk_score: Optional[float] = None,
    org_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
) -> GuardrailDecisionLog:
    """Log a guardrail decision for audit trail."""
    params_hash = None
    if params:
        params_hash = hashlib.sha256(
            json.dumps(params, sort_keys=True, default=str).encode()
        ).hexdigest()

    record = GuardrailDecisionLog(
        agent_id=agent_id,
        tool_name=tool_name,
        action=action,
        title=title,
        reason=reason,
        params_hash=params_hash,
        risk_score=risk_score,
        org_id=org_id,
        workspace_id=workspace_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_guardrail_decisions(
    db: Session,
    agent_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[GuardrailDecisionLog]:
    """Query guardrail decision history."""
    q = db.query(GuardrailDecisionLog)
    if agent_id:
        q = q.filter(GuardrailDecisionLog.agent_id == agent_id)
    if action:
        q = q.filter(GuardrailDecisionLog.action == action)
    return q.order_by(GuardrailDecisionLog.created_at.desc()).offset(offset).limit(limit).all()


def get_agent_decision_stats(
    db: Session,
    agent_id: str,
    hours: int = 24,
) -> Dict[str, int]:
    """Get decision counts by action for an agent."""
    from sqlalchemy import func as sqlfunc
    from datetime import timedelta

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    results = (
        db.query(
            GuardrailDecisionLog.action,
            sqlfunc.count(GuardrailDecisionLog.id),
        )
        .filter(
            GuardrailDecisionLog.agent_id == agent_id,
            GuardrailDecisionLog.created_at >= since,
        )
        .group_by(GuardrailDecisionLog.action)
        .all()
    )
    return {action: count for action, count in results}


# ── Threat Graph Persistence ───────────────────────────────────────────────

def save_threat_graph_snapshot(
    db: Session,
    nodes: list,
    edges: list,
    attack_paths: list,
    risk_propagation: dict,
    snapshot_name: Optional[str] = None,
    org_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
) -> ThreatGraphSnapshot:
    """Save a snapshot of the threat graph."""
    # Compute overall risk from risk_propagation values
    if risk_propagation:
        values = [v for v in risk_propagation.values() if isinstance(v, (int, float))]
        overall_risk = max(values) if values else 0.0
    else:
        overall_risk = 0.0

    record = ThreatGraphSnapshot(
        snapshot_name=snapshot_name or f"snapshot-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        nodes=nodes,
        edges=edges,
        attack_paths=attack_paths,
        risk_propagation=risk_propagation,
        overall_risk=overall_risk,
        org_id=org_id,
        workspace_id=workspace_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("Saved threat graph snapshot: id=%d nodes=%d edges=%d", record.id, len(nodes), len(edges))
    return record


def get_threat_graph_snapshots(
    db: Session,
    org_id: Optional[int] = None,
    limit: int = 10,
) -> List[ThreatGraphSnapshot]:
    """Get recent threat graph snapshots."""
    q = db.query(ThreatGraphSnapshot)
    if org_id:
        q = q.filter(ThreatGraphSnapshot.org_id == org_id)
    return q.order_by(ThreatGraphSnapshot.created_at.desc()).limit(limit).all()


# ── Behavioral Baseline Persistence ────────────────────────────────────────

def persist_behavioral_baseline(
    db: Session,
    agent_id: str,
    tool_frequency: dict,
    param_patterns: dict,
    mean_calls_per_minute: float,
    std_calls_per_minute: float,
    mean_calls_per_hour: float,
    std_calls_per_hour: float,
    data_source_frequency: dict,
    observation_count: int,
    anomaly_threshold: float = 2.0,
    org_id: Optional[int] = None,
) -> AgentBehavioralBaselineDB:
    """Create or update agent behavioral baseline."""
    existing = db.query(AgentBehavioralBaselineDB).filter(
        AgentBehavioralBaselineDB.agent_id == agent_id
    ).first()

    data = dict(
        agent_id=agent_id,
        tool_frequency=tool_frequency,
        param_patterns=param_patterns,
        mean_calls_per_minute=mean_calls_per_minute,
        std_calls_per_minute=std_calls_per_minute,
        mean_calls_per_hour=mean_calls_per_hour,
        std_calls_per_hour=std_calls_per_hour,
        data_source_frequency=data_source_frequency,
        observation_count=observation_count,
        anomaly_threshold=anomaly_threshold,
        org_id=org_id,
    )

    if existing:
        for key, value in data.items():
            if hasattr(existing, key) and key != "id":
                setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing

    record = AgentBehavioralBaselineDB(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_behavioral_baseline(
    db: Session,
    agent_id: str,
) -> Optional[AgentBehavioralBaselineDB]:
    """Get behavioral baseline for an agent."""
    return db.query(AgentBehavioralBaselineDB).filter(
        AgentBehavioralBaselineDB.agent_id == agent_id
    ).first()


# ── Alert Persistence ──────────────────────────────────────────────────────

def create_security_alert(
    db: Session,
    alert_type: str,
    severity: str,
    title: str,
    description: Optional[str] = None,
    agent_id: Optional[str] = None,
    tool_name: Optional[str] = None,
    server_name: Optional[str] = None,
    scan_result_id: Optional[int] = None,
    decision_log_id: Optional[int] = None,
    org_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
) -> SecurityAlert:
    """Create a security alert."""
    record = SecurityAlert(
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description,
        agent_id=agent_id,
        tool_name=tool_name,
        server_name=server_name,
        scan_result_id=scan_result_id,
        decision_log_id=decision_log_id,
        org_id=org_id,
        workspace_id=workspace_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.warning(
        "Security alert created: type=%s severity=%s title=%s id=%d",
        alert_type, severity, title, record.id,
    )
    return record


def get_pending_alerts(db: Session, limit: int = 50) -> List[SecurityAlert]:
    """Get alerts that need to be sent."""
    return (
        db.query(SecurityAlert)
        .filter(SecurityAlert.status == AlertStatus.PENDING.value)
        .order_by(SecurityAlert.created_at.asc())
        .limit(limit)
        .all()
    )


def get_alerts(
    db: Session,
    org_id: Optional[int] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    limit: int = 50,
) -> List[SecurityAlert]:
    """Query alerts with filters."""
    q = db.query(SecurityAlert)
    if org_id:
        q = q.filter(SecurityAlert.org_id == org_id)
    if severity:
        q = q.filter(SecurityAlert.severity == severity)
    if status:
        q = q.filter(SecurityAlert.status == status)
    if agent_id:
        q = q.filter(SecurityAlert.agent_id == agent_id)
    return q.order_by(SecurityAlert.created_at.desc()).limit(limit).all()


def acknowledge_alert(db: Session, alert_id: int, user: str) -> Optional[SecurityAlert]:
    """Acknowledge an alert."""
    record = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if record:
        record.status = AlertStatus.ACKNOWLEDGED.value
        record.acknowledged_by = user
        record.acknowledged_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(record)
    return record


def resolve_alert(db: Session, alert_id: int, notes: Optional[str] = None) -> Optional[SecurityAlert]:
    """Resolve an alert."""
    record = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if record:
        record.status = AlertStatus.RESOLVED.value
        record.resolved_at = datetime.now(timezone.utc)
        record.resolution_notes = notes
        db.commit()
        db.refresh(record)
    return record


# ── MCP Config Audit ───────────────────────────────────────────────────────

def log_config_change(
    db: Session,
    config_path: str,
    change_type: str,
    file_hash: Optional[str] = None,
    server_name: Optional[str] = None,
    tool_count: Optional[int] = None,
    scan_result_id: Optional[int] = None,
    org_id: Optional[int] = None,
) -> MCPConfigAuditLog:
    """Log an MCP config file change."""
    record = MCPConfigAuditLog(
        config_path=config_path,
        change_type=change_type,
        file_hash=file_hash,
        server_name=server_name,
        tool_count=tool_count,
        scan_result_id=scan_result_id,
        org_id=org_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Dashboard Stats ────────────────────────────────────────────────────────

def get_security_dashboard(db: Session, org_id: Optional[int] = None) -> dict:
    """Get aggregated security dashboard stats."""
    from sqlalchemy import func as sqlfunc

    base_filter = []
    if org_id:
        base_filter.append(MCPScanResult.org_id == org_id)

    # Scan stats
    total_scans = db.query(sqlfunc.count(MCPScanResult.id)).filter(*base_filter).scalar() or 0
    high_risk_scans = db.query(sqlfunc.count(MCPScanResult.id)).filter(
        *base_filter, MCPScanResult.risk_level.in_(["high", "critical"])
    ).scalar() or 0

    # Alert stats
    alert_filter = [SecurityAlert.org_id == org_id] if org_id else []
    total_alerts = db.query(sqlfunc.count(SecurityAlert.id)).filter(*alert_filter).scalar() or 0
    pending_alerts = db.query(sqlfunc.count(SecurityAlert.id)).filter(
        *alert_filter, SecurityAlert.status == AlertStatus.PENDING.value
    ).scalar() or 0
    critical_alerts = db.query(sqlfunc.count(SecurityAlert.id)).filter(
        *alert_filter, SecurityAlert.severity == "critical"
    ).scalar() or 0

    # Agent stats
    agent_filter = [AgentProfileDB.org_id == org_id] if org_id else []
    total_agents = db.query(sqlfunc.count(AgentProfileDB.id)).filter(*agent_filter).scalar() or 0
    active_agents = db.query(sqlfunc.count(AgentProfileDB.id)).filter(
        *agent_filter, AgentProfileDB.status == AgentStatus.ACTIVE.value
    ).scalar() or 0

    # Decision stats (last 24h)
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    decision_filter = [GuardrailDecisionLog.created_at >= since]
    if org_id:
        decision_filter.append(GuardrailDecisionLog.org_id == org_id)

    decisions_24h = db.query(
        GuardrailDecisionLog.action,
        sqlfunc.count(GuardrailDecisionLog.id),
    ).filter(*decision_filter).group_by(GuardrailDecisionLog.action).all()
    decision_stats = {action: count for action, count in decisions_24h}

    return {
        "scans": {
            "total": total_scans,
            "high_risk": high_risk_scans,
        },
        "alerts": {
            "total": total_alerts,
            "pending": pending_alerts,
            "critical": critical_alerts,
        },
        "agents": {
            "total": total_agents,
            "active": active_agents,
        },
        "decisions_24h": decision_stats,
    }
