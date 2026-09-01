"""
WebSocket manager for real-time MCP security events.

Streams guardrail decisions, scan findings, and alerts to connected clients
via WebSocket. Supports per-org topic filtering and channel subscriptions.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


@dataclass
class WSClient:
    """A connected WebSocket client."""
    client_id: str
    user_id: str
    org_id: Optional[int] = None
    channels: Set[str] = field(default_factory=set)
    connected_at: float = field(default_factory=time.time)
    last_heartbeat: float = field(default_factory=time.time)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts real-time security events.

    Channels:
      - guardrails: guardrail decisions (allow/block/warn)
      - scans: scan findings and results
      - alerts: security alerts
      - graph: threat graph updates
      - activity: all combined event stream
    """

    CHANNELS = {"guardrails", "scans", "alerts", "graph", "activity"}

    def __init__(self):
        self._clients: Dict[str, WSClient] = {}
        self._queues: Dict[str, asyncio.Queue] = {}
        self._event_log: List[dict] = []
        self._max_log_size = 1000
        self._heartbeat_timeout = 60

    # ── Connection Management ──────────────────────────────────────────

    async def connect(
        self,
        client_id: str,
        user_id: str,
        org_id: Optional[int] = None,
        channels: Optional[Set[str]] = None,
    ) -> asyncio.Queue:
        """Register a new client and return its event queue."""
        channels = channels or {"activity"}
        valid_channels = channels & self.CHANNELS

        client = WSClient(
            client_id=client_id,
            user_id=user_id,
            org_id=org_id,
            channels=valid_channels,
        )
        self._clients[client_id] = client
        self._queues[client_id] = asyncio.Queue(maxsize=200)

        logger.info(
            "WS client connected: id=%s user=%s org=%s channels=%s",
            client_id, user_id, org_id, valid_channels,
        )

        # Send connection confirmation
        await self._send_to(client_id, {
            "event": "connected",
            "client_id": client_id,
            "channels": list(valid_channels),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return self._queues[client_id]

    async def disconnect(self, client_id: str):
        """Remove a client."""
        client = self._clients.pop(client_id, None)
        self._queues.pop(client_id, None)
        if client:
            logger.info("WS client disconnected: id=%s", client_id)

    async def heartbeat(self, client_id: str):
        """Update heartbeat timestamp for a client."""
        if client_id in self._clients:
            self._clients[client_id].last_heartbeat = time.time()

    def get_connected_clients(self) -> List[dict]:
        """List all connected clients."""
        return [
            {
                "client_id": c.client_id,
                "user_id": c.user_id,
                "org_id": c.org_id,
                "channels": list(c.channels),
                "connected_at": c.connected_at,
            }
            for c in self._clients.values()
        ]

    # ── Event Broadcasting ─────────────────────────────────────────────

    async def broadcast_guardrail_decision(
        self,
        agent_id: str,
        tool_name: str,
        action: str,
        title: str,
        reason: Optional[str] = None,
        params: Optional[dict] = None,
        risk_score: Optional[float] = None,
    ):
        """Broadcast a guardrail decision event."""
        event = {
            "event": "guardrail_decision",
            "channel": "guardrails",
            "agent_id": agent_id,
            "tool_name": tool_name,
            "action": action,
            "title": title,
            "reason": reason,
            "params_hash": None,
            "risk_score": risk_score,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast(event, {"guardrails", "activity"})

    async def broadcast_scan_finding(
        self,
        scan_type: str,
        server_name: Optional[str],
        tool_name: str,
        findings: list,
        risk_level: str,
        risk_score: float,
    ):
        """Broadcast scan findings."""
        event = {
            "event": "scan_finding",
            "channel": "scans",
            "scan_type": scan_type,
            "server_name": server_name,
            "tool_name": tool_name,
            "finding_count": len(findings),
            "findings": findings[:10],
            "risk_level": risk_level,
            "risk_score": risk_score,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast(event, {"scans", "activity"})

    async def broadcast_alert(self, alert: dict):
        """Broadcast a security alert."""
        event = {
            "event": "security_alert",
            "channel": "alerts",
            "alert_id": alert.get("id"),
            "alert_type": alert.get("alert_type"),
            "severity": alert.get("severity"),
            "title": alert.get("title"),
            "agent_id": alert.get("agent_id"),
            "tool_name": alert.get("tool_name"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast(event, {"alerts", "activity"})

    async def broadcast_graph_update(
        self,
        update_type: str,
        node_id: Optional[str] = None,
        edge: Optional[dict] = None,
        attack_paths: Optional[list] = None,
    ):
        """Broadcast a threat graph update."""
        event = {
            "event": "graph_update",
            "channel": "graph",
            "update_type": update_type,
            "node_id": node_id,
            "edge": edge,
            "attack_paths": attack_paths,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast(event, {"graph", "activity"})

    async def broadcast_rate_limit(
        self,
        agent_id: str,
        current_count: int,
        limit: int,
        window: str,
    ):
        """Broadcast a rate limit event."""
        event = {
            "event": "rate_limit",
            "channel": "guardrails",
            "agent_id": agent_id,
            "current_count": current_count,
            "limit": limit,
            "window": window,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast(event, {"guardrails", "activity"})

    # ── Internal ───────────────────────────────────────────────────────

    async def _broadcast(self, event: dict, channels: Set[str]):
        """Send event to all clients subscribed to matching channels."""
        self._event_log.append(event)
        if len(self._event_log) > self._max_log_size:
            self._event_log = self._event_log[-self._max_log_size:]

        now = time.time()
        disconnected = []

        for client_id, client in self._clients.items():
            # Skip clients without matching channels
            if not (client.channels & channels):
                continue

            # Skip clients with expired heartbeat
            if now - client.last_heartbeat > self._heartbeat_timeout:
                disconnected.append(client_id)
                continue

            # Skip if client is org-scoped and doesn't match
            if client.org_id and event.get("org_id") and client.org_id != event.get("org_id"):
                continue

            await self._send_to(client_id, event)

        for cid in disconnected:
            await self.disconnect(cid)

    async def _send_to(self, client_id: str, event: dict):
        """Send an event to a specific client queue."""
        queue = self._queues.get(client_id)
        if queue and not queue.full():
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("WS queue full for client %s, dropping event", client_id)

    def get_recent_events(self, channel: Optional[str] = None, limit: int = 50) -> List[dict]:
        """Get recent events from the log."""
        events = self._event_log
        if channel:
            events = [e for e in events if e.get("channel") == channel or e.get("event", "").startswith(channel.rstrip("s"))]
        return events[-limit:]

    def get_stats(self) -> dict:
        """Get WebSocket manager statistics."""
        return {
            "connected_clients": len(self._clients),
            "channels": {ch: 0 for ch in self.CHANNELS},
            "event_log_size": len(self._event_log),
            "max_log_size": self._max_log_size,
        }


# Global singleton
ws_manager = WebSocketManager()
