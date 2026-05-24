"""WebSocket connection manager for real-time workspace intelligence.

Manages per-workspace WebSocket connections, message broadcasting,
and typed event distribution for the workspace intelligence system.
"""

from typing import Dict, Set, Any, Optional, Callable
from fastapi import WebSocket
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections grouped by workspace_id.

    Supports:
    - Per-workspace connection pools
    - Typed event broadcasting (incident.created, deployment.updated, etc.)
    - Connection lifecycle management
    - User-scoped connections within workspaces
    """

    def __init__(self):
        self._connections: Dict[int, Dict[int, WebSocket]] = {}
        self._handlers: Dict[str, Callable] = {}
        self._stats: Dict[str, int] = {"total_connections": 0, "messages_sent": 0}

    async def connect(self, websocket: WebSocket, workspace_id: int, user_id: int) -> None:
        await websocket.accept()
        if workspace_id not in self._connections:
            self._connections[workspace_id] = {}
        self._connections[workspace_id][user_id] = websocket
        self._stats["total_connections"] += 1
        logger.info(f"WS connected: workspace={workspace_id}, user={user_id}")

    def disconnect(self, workspace_id: int, user_id: int) -> None:
        if workspace_id in self._connections:
            self._connections[workspace_id].pop(user_id, None)
            if not self._connections[workspace_id]:
                del self._connections[workspace_id]
        logger.info(f"WS disconnected: workspace={workspace_id}, user={user_id}")

    async def broadcast(self, workspace_id: int, message: Dict[str, Any]) -> None:
        """Broadcast a typed event to all connected users in a workspace."""
        payload = {
            "type": message.get("type", "unknown"),
            "payload": message.get("payload", {}),
            "timestamp": datetime.utcnow().isoformat(),
        }
        connections = self._connections.get(workspace_id, {})
        disconnected = []
        for user_id, ws in connections.items():
            try:
                await ws.send_json(payload)
                self._stats["messages_sent"] += 1
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(workspace_id, uid)

    async def send_to_user(self, workspace_id: int, user_id: int, message: Dict[str, Any]) -> bool:
        """Send a message to a specific user within a workspace."""
        connections = self._connections.get(workspace_id, {})
        ws = connections.get(user_id)
        if not ws:
            return False
        try:
            await ws.send_json({
                "type": message.get("type", "unknown"),
                "payload": message.get("payload", {}),
                "timestamp": datetime.utcnow().isoformat(),
            })
            self._stats["messages_sent"] += 1
            return True
        except Exception:
            self.disconnect(workspace_id, user_id)
            return False

    async def handle_message(self, workspace_id: int, user_id: int, data: Dict[str, Any]) -> None:
        """Route an incoming WebSocket message to its registered handler."""
        msg_type = data.get("type", "")
        handler = self._handlers.get(msg_type)
        if handler:
            try:
                await handler(workspace_id, user_id, data.get("payload", {}))
            except Exception as e:
                logger.error(f"WS handler error: {msg_type}: {e}")
                await self.send_to_user(workspace_id, user_id, {
                    "type": "error",
                    "payload": {"message": str(e)},
                })

    def register_handler(self, event_type: str, handler: Callable) -> None:
        self._handlers[event_type] = handler

    def get_workspace_connections(self, workspace_id: int) -> int:
        return len(self._connections.get(workspace_id, {}))

    def get_stats(self) -> Dict[str, Any]:
        return {
            **self._stats,
            "active_workspaces": len(self._connections),
            "active_connections": sum(len(conns) for conns in self._connections.values()),
        }

    async def broadcast_incident_update(
        self, workspace_id: int, incident_id: int,
        field: str, value: Any,
    ) -> None:
        await self.broadcast(workspace_id, {
            "type": "incident.updated",
            "payload": {"incident_id": incident_id, field: value},
        })

    async def broadcast_deployment_update(
        self, workspace_id: int, deployment_id: int,
        status: str,
    ) -> None:
        await self.broadcast(workspace_id, {
            "type": "deployment.updated",
            "payload": {"deployment_id": deployment_id, "status": status},
        })

    async def broadcast_timeline_event(
        self, workspace_id: int, event_type: str, event_data: Dict[str, Any],
    ) -> None:
        await self.broadcast(workspace_id, {
            "type": f"timeline.{event_type}",
            "payload": event_data,
        })

    async def broadcast_alert(
        self, workspace_id: int,
        severity: str, title: str, description: str,
    ) -> None:
        await self.broadcast(workspace_id, {
            "type": "alert",
            "payload": {
                "severity": severity,
                "title": title,
                "description": description,
            },
        })


ws_manager = WebSocketManager()
