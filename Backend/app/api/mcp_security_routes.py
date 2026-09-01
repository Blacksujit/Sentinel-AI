"""
Production MCP Security API routes.

Exposes endpoints for:
  - Persistent scan results and history
  - Real-time WebSocket streaming
  - Agent profile management
  - Guardrail decision audit trail
  - Threat graph snapshots
  - Alert management
  - Dashboard statistics
  - Config watcher management
  - MCP proxy integration
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.storage.db import get_db
from app.auth.dependencies import require_authenticated_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mcp-security", tags=["MCP Security"])


# ── Request Models ─────────────────────────────────────────────────────────

class AgentProfileCreate(BaseModel):
    agent_id: str
    agent_name: Optional[str] = None
    allowed_tools: list = []
    denied_tools: list = []
    allowed_data_sources: list = []
    denied_data_sources: list = []
    max_calls_per_minute: int = 60
    max_calls_per_hour: int = 1000
    trusted_agents: list = []
    can_delegate: bool = True


class AlertAcknowledgeRequest(BaseModel):
    notes: Optional[str] = None


class WebhookConfigRequest(BaseModel):
    name: str
    url: str
    webhook_type: str
    auth_header: Optional[str] = None
    min_severity: str = "high"
    alert_types: list = []


# ── Scan History ───────────────────────────────────────────────────────────

@router.get("/scans")
def list_scans(
    server_name: Optional[str] = Query(None),
    tool_name: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import get_scan_history
    scans = get_scan_history(
        db=db,
        server_name=server_name,
        tool_name=tool_name,
        risk_level=risk_level,
        limit=limit,
        offset=offset,
    )
    return {
        "scans": [
            {
                "id": s.id,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "scan_type": s.scan_type,
                "server_name": s.server_name,
                "tool_name": s.tool_name,
                "status": s.status,
                "risk_score": s.risk_score,
                "risk_level": s.risk_level,
                "finding_count": s.finding_count,
                "findings": s.findings,
            }
            for s in scans
        ]
    }


# ── Agent Profiles ─────────────────────────────────────────────────────────

@router.post("/agents")
def create_agent_profile(
    profile: AgentProfileCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import persist_agent_profile
    record = persist_agent_profile(db=db, profile_data=profile.model_dump())
    return {"id": record.id, "agent_id": record.agent_id, "status": record.status}


@router.get("/agents")
def list_agents(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import list_agent_profiles
    agents = list_agent_profiles(db=db, status=status)
    return {
        "agents": [
            {
                "id": a.id,
                "agent_id": a.agent_id,
                "agent_name": a.agent_name,
                "status": a.status,
                "allowed_tools": a.allowed_tools,
                "denied_tools": a.denied_tools,
                "max_calls_per_minute": a.max_calls_per_minute,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in agents
        ]
    }


@router.get("/agents/{agent_id}")
def get_agent_profile(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import get_agent_profile
    profile = get_agent_profile(db=db, agent_id=agent_id)
    if not profile:
        raise HTTPException(404, "Agent not found")
    return {
        "id": profile.id,
        "agent_id": profile.agent_id,
        "agent_name": profile.agent_name,
        "status": profile.status,
        "allowed_tools": profile.allowed_tools,
        "denied_tools": profile.denied_tools,
        "allowed_data_sources": profile.allowed_data_sources,
        "denied_data_sources": profile.denied_data_sources,
        "max_calls_per_minute": profile.max_calls_per_minute,
        "max_calls_per_hour": profile.max_calls_per_hour,
        "trusted_agents": profile.trusted_agents,
        "can_delegate": profile.can_delegate,
    }


# ── Guardrail Decisions Audit ──────────────────────────────────────────────

@router.get("/decisions")
def list_decisions(
    agent_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import get_guardrail_decisions
    decisions = get_guardrail_decisions(
        db=db, agent_id=agent_id, action=action, limit=limit, offset=offset,
    )
    return {
        "decisions": [
            {
                "id": d.id,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "agent_id": d.agent_id,
                "tool_name": d.tool_name,
                "action": d.action,
                "title": d.title,
                "reason": d.reason,
                "risk_score": d.risk_score,
            }
            for d in decisions
        ]
    }


@router.get("/decisions/stats/{agent_id}")
def get_agent_decision_stats(
    agent_id: str,
    hours: int = Query(24, le=168),
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import get_agent_decision_stats
    stats = get_agent_decision_stats(db=db, agent_id=agent_id, hours=hours)
    return {"agent_id": agent_id, "hours": hours, "stats": stats}


# ── Threat Graph ───────────────────────────────────────────────────────────

@router.get("/graph/snapshots")
def list_graph_snapshots(
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import get_threat_graph_snapshots
    snapshots = get_threat_graph_snapshots(db=db, limit=limit)
    return {
        "snapshots": [
            {
                "id": s.id,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "snapshot_name": s.snapshot_name,
                "node_count": len(s.nodes or []),
                "edge_count": len(s.edges or []),
                "attack_paths": s.attack_paths,
                "overall_risk": s.overall_risk,
            }
            for s in snapshots
        ]
    }


# ── Alerts ─────────────────────────────────────────────────────────────────

@router.get("/alerts")
def list_alerts(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import get_alerts
    alerts = get_alerts(
        db=db, severity=severity, status=status, agent_id=agent_id, limit=limit,
    )
    return {
        "alerts": [
            {
                "id": a.id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "status": a.status,
                "title": a.title,
                "description": a.description,
                "agent_id": a.agent_id,
                "tool_name": a.tool_name,
            }
            for a in alerts
        ]
    }


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    req: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import acknowledge_alert
    alert = acknowledge_alert(db=db, alert_id=alert_id, user=current_user.email)
    if not alert:
        raise HTTPException(404, "Alert not found")
    return {"status": "acknowledged", "alert_id": alert_id}


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    req: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import resolve_alert
    alert = resolve_alert(db=db, alert_id=alert_id, notes=req.notes)
    if not alert:
        raise HTTPException(404, "Alert not found")
    return {"status": "resolved", "alert_id": alert_id}


# ── Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.persistence import get_security_dashboard
    return get_security_dashboard(db=db)


# ── Config Watcher ─────────────────────────────────────────────────────────

@router.get("/watcher/status")
def watcher_status(current_user = Depends(require_authenticated_user)):
    from app.monitors.config_watcher import config_watcher
    return config_watcher.get_status()


@router.post("/watcher/scan")
async def watcher_scan_now(current_user = Depends(require_authenticated_user)):
    from app.monitors.production_init import scan_and_persist_all
    return await scan_and_persist_all()


# ── Proxy Stats ────────────────────────────────────────────────────────────

@router.get("/proxy/stats")
def proxy_stats(current_user = Depends(require_authenticated_user)):
    from app.monitors.mcp_proxy import MCPProxyFactory
    from app.monitors.production_init import get_mcp_proxy
    proxy = get_mcp_proxy() or MCPProxyFactory.create_default()
    stats = proxy.get_stats()
    stats["status"] = "proxy_active"
    return stats


# ── Anomaly Detection ─────────────────────────────────────────────────────

@router.get("/anomaly/baselines")
def list_baselines(current_user = Depends(require_authenticated_user)):
    from app.monitors.anomaly_detection import anomaly_detector
    baselines = anomaly_detector.get_all_baselines()
    return {
        "baselines": {
            aid: {
                "agent_id": b.get("agent_id"),
                "observation_count": b.get("rate_stats", {}).get("observation_count", 0),
                "tool_count": len(b.get("tool_frequency", {})),
            }
            for aid, b in baselines.items()
        }
    }


@router.get("/anomaly/baselines/{agent_id}")
def get_baseline(
    agent_id: str,
    current_user = Depends(require_authenticated_user),
):
    from app.monitors.anomaly_detection import anomaly_detector
    baseline = anomaly_detector.get_baseline(agent_id)
    if not baseline:
        raise HTTPException(404, "Baseline not found")
    return baseline.to_dict()


# ── WebSocket Endpoint ─────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    channels: str = Query("activity", description="Comma-separated channels"),
):
    """
    Real-time WebSocket for MCP security events.

    Connect with: ws://host/api/mcp-security/ws?channels=guardrails,alerts

    Channels: guardrails, scans, alerts, graph, activity
    """
    from app.monitors.ws_manager import ws_manager

    await websocket.accept()

    client_id = f"ws-{int(time.time() * 1000)}"
    channel_set = set(channels.split(",")) & ws_manager.CHANNELS
    if not channel_set:
        channel_set = {"activity"}

    queue = await ws_manager.connect(
        client_id=client_id,
        user_id="anonymous",
        channels=channel_set,
    )

    try:
        # Start a task to send events to the client
        async def send_events():
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                    await websocket.send_json(event)
                except asyncio.TimeoutError:
                    # Send heartbeat
                    await websocket.send_json({"event": "ping", "timestamp": datetime.now(timezone.utc).isoformat()})
                except Exception:
                    break

        send_task = asyncio.create_task(send_events())

        # Listen for client messages (heartbeats, channel changes)
        try:
            while True:
                data = await websocket.receive_text()
                msg = json.loads(data) if data else {}
                if msg.get("type") == "ping":
                    await ws_manager.heartbeat(client_id)
                elif msg.get("type") == "subscribe":
                    new_channels = set(msg.get("channels", [])) & ws_manager.CHANNELS
                    if client_id in ws_manager._clients:
                        ws_manager._clients[client_id].channels = new_channels
                elif msg.get("type") == "unsubscribe":
                    remove_channels = set(msg.get("channels", []))
                    if client_id in ws_manager._clients:
                        ws_manager._clients[client_id].channels -= remove_channels
        except WebSocketDisconnect:
            pass
        finally:
            send_task.cancel()
            await ws_manager.disconnect(client_id)

    except WebSocketDisconnect:
        await ws_manager.disconnect(client_id)
