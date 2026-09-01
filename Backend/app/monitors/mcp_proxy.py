"""
MCP Integration Proxy — intercepts and secures MCP tool calls.

Wraps any MCP client to enforce guardrails before every tool execution.
Drop this middleware into your MCP integration layer to automatically
log, check, and audit all tool calls through your agent system.

Usage:
    proxy = MCPProxy(guardrails, anomaly_detector, ws_manager)
    result = await proxy.execute_tool_call(
        agent_id="coding_agent",
        tool_name="shell_exec",
        params={"cmd": "ls -la"},
        execute_fn=actual_mcp_call,
    )
"""

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ToolCallResult:
    """Result of a proxied tool call."""
    allowed: bool
    action: str  # "allow", "block", "warn", "rate_limited"
    title: str
    reason: Optional[str] = None
    risk_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    result: Any = None
    error: Optional[str] = None
    latency_ms: Optional[float] = None
    decision_id: Optional[int] = None

    def as_dict(self) -> dict:
        return {
            "allowed": self.allowed,
            "action": self.action,
            "title": self.title,
            "reason": self.reason,
            "risk_score": self.risk_score,
            "anomaly_score": self.anomaly_score,
            "error": self.error,
            "latency_ms": self.latency_ms,
            "decision_id": self.decision_id,
        }


# Type alias for the actual MCP call function
ExecuteFn = Callable[[str, dict], Coroutine[Any, Any, Any]]


class MCPProxy:
    """
    Proxies MCP tool calls through the guardrails pipeline.

    Intercepts every tool call and runs it through:
      1. Guardrails check (allowlist, denylist, rate limiting)
      2. Anomaly detection (behavioral baseline comparison)
      3. Audit logging (persistent decision log)
      4. Real-time WebSocket broadcast
      5. Alert generation (for blocks and anomalies)

    Integrates with:
      - AgentGuardrails for policy enforcement
      - AnomalyDetector for ML-based detection
      - WebSocketManager for real-time streaming
      - AlertDispatcher for notifications
      - Persistence layer for audit trail
    """

    def __init__(
        self,
        guardrails=None,
        anomaly_detector=None,
        ws_manager=None,
        alert_dispatcher=None,
        db_session_factory=None,
    ):
        self.guardrails = guardrails
        self.anomaly_detector = anomaly_detector
        self.ws_manager = ws_manager
        self.alert_dispatcher = alert_dispatcher
        self.db_session_factory = db_session_factory

        # Call statistics
        self._call_stats = {
            "total": 0,
            "allowed": 0,
            "blocked": 0,
            "warned": 0,
            "rate_limited": 0,
        }
        self._recent_calls: List[dict] = []
        self._max_recent = 100

    async def execute_tool_call(
        self,
        agent_id: str,
        tool_name: str,
        params: dict,
        execute_fn: ExecuteFn,
        context: Optional[dict] = None,
    ) -> ToolCallResult:
        """
        Execute an MCP tool call through the security pipeline.

        Args:
            agent_id: The agent making the call
            tool_name: Name of the tool being called
            params: Tool parameters
            execute_fn: Async function that actually calls the MCP server
            context: Additional context (data_source, etc.)

        Returns:
            ToolCallResult with decision and optional result
        """
        start_time = time.time()
        context = context or {}
        self._call_stats["total"] += 1

        # ── Step 1: Guardrails Check ───────────────────────────────────
        guardrail_action = "allow"
        guardrail_title = "Passed all checks"
        guardrail_reason = None
        guardrail_risk_score = None

        if self.guardrails:
            decision = self.guardrails.check_tool_call(
                agent_id=agent_id,
                tool_name=tool_name,
                params=params,
                context=context,
            )
            guardrail_action = decision.action
            guardrail_title = decision.title
            guardrail_reason = decision.reason
            guardrail_risk_score = getattr(decision, "risk_score", None)

            if guardrail_action in ("block", "escalate"):
                self._call_stats["blocked"] += 1
                latency = (time.time() - start_time) * 1000

                result = ToolCallResult(
                    allowed=False,
                    action=guardrail_action,
                    title=guardrail_title,
                    reason=guardrail_reason,
                    risk_score=guardrail_risk_score,
                    latency_ms=latency,
                    error=f"Tool call blocked: {guardrail_title}",
                )

                await self._log_and_broadcast(agent_id, tool_name, params, result, context)
                return result

            if guardrail_action == "warn":
                self._call_stats["warned"] += 1
            else:
                self._call_stats["allowed"] += 1

        # ── Step 2: Rate Limit Check ───────────────────────────────────
        if self.guardrails:
            rate_decision = self.guardrails.check_rate_limit(agent_id)
            if rate_decision and rate_decision.action == "block":
                self._call_stats["rate_limited"] += 1
                latency = (time.time() - start_time) * 1000

                result = ToolCallResult(
                    allowed=False,
                    action="rate_limited",
                    title="Rate limit exceeded",
                    reason=rate_decision.reason,
                    latency_ms=latency,
                    error="Rate limit exceeded",
                )

                await self._log_and_broadcast(agent_id, tool_name, params, result, context)
                return result

        # ── Step 3: Anomaly Detection ──────────────────────────────────
        anomaly_score_val = None
        if self.anomaly_detector:
            anomaly = self.anomaly_detector.check_anomaly(
                agent_id=agent_id,
                tool_name=tool_name,
                params=params,
                data_source=context.get("data_source"),
            )
            anomaly_score_val = anomaly.score

            if anomaly.is_anomaly:
                logger.warning(
                    "Anomaly detected: agent=%s tool=%s score=%.3f reason=%s",
                    agent_id, tool_name, anomaly.score, anomaly.reason,
                )

                # Still allow the call, but log the anomaly
                if guardrail_action == "allow":
                    guardrail_action = "warn"
                    guardrail_title = f"Anomaly: {anomaly.reason}"
                    guardrail_reason = anomaly.reason

        # ── Step 4: Execute the Actual Call ─────────────────────────────
        exec_result = None
        exec_error = None
        try:
            exec_result = await execute_fn(tool_name, params)
        except Exception as e:
            exec_error = str(e)
            logger.error("MCP tool execution failed: %s %s: %s", agent_id, tool_name, e)

        # ── Step 5: Log and Broadcast ──────────────────────────────────
        latency = (time.time() - start_time) * 1000

        result = ToolCallResult(
            allowed=True,
            action=guardrail_action,
            title=guardrail_title,
            reason=guardrail_reason,
            risk_score=guardrail_risk_score,
            anomaly_score=anomaly_score_val,
            result=exec_result,
            error=exec_error,
            latency_ms=latency,
        )

        await self._log_and_broadcast(agent_id, tool_name, params, result, context)
        return result

    async def check_only(
        self,
        agent_id: str,
        tool_name: str,
        params: dict,
        context: Optional[dict] = None,
    ) -> ToolCallResult:
        """
        Check a tool call without executing it.
        Useful for dry-run / audit scenarios.
        """
        context = context or {}
        guardrail_action = "allow"
        guardrail_title = "Passed all checks"
        guardrail_reason = None
        guardrail_risk_score = None

        if self.guardrails:
            decision = self.guardrails.check_tool_call(
                agent_id=agent_id,
                tool_name=tool_name,
                params=params,
                context=context,
            )
            guardrail_action = decision.action
            guardrail_title = decision.title
            guardrail_reason = decision.reason
            guardrail_risk_score = getattr(decision, "risk_score", None)

        anomaly_score_val = None
        if self.anomaly_detector:
            anomaly = self.anomaly_detector.check_anomaly(
                agent_id=agent_id,
                tool_name=tool_name,
                params=params,
                data_source=context.get("data_source"),
            )
            anomaly_score_val = anomaly.score

        return ToolCallResult(
            allowed=guardrail_action in ("allow", "warn"),
            action=guardrail_action,
            title=guardrail_title,
            reason=guardrail_reason,
            risk_score=guardrail_risk_score,
            anomaly_score=anomaly_score_val,
        )

    async def _log_and_broadcast(
        self,
        agent_id: str,
        tool_name: str,
        params: dict,
        result: ToolCallResult,
        context: dict,
    ):
        """Log the decision and broadcast via WebSocket."""
        # Add to recent calls
        call_record = {
            "agent_id": agent_id,
            "tool_name": tool_name,
            "action": result.action,
            "title": result.title,
            "risk_score": result.risk_score,
            "anomaly_score": result.anomaly_score,
            "latency_ms": result.latency_ms,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._recent_calls.append(call_record)
        if len(self._recent_calls) > self._max_recent:
            self._recent_calls = self._recent_calls[-self._max_recent:]

        # WebSocket broadcast
        if self.ws_manager:
            try:
                await self.ws_manager.broadcast_guardrail_decision(
                    agent_id=agent_id,
                    tool_name=tool_name,
                    action=result.action,
                    title=result.title,
                    reason=result.reason,
                    risk_score=result.risk_score,
                )
            except Exception as e:
                logger.error("WS broadcast failed: %s", e)

        # Persist to database
        if self.db_session_factory:
            try:
                db = self.db_session_factory()
                from app.monitors.persistence import log_guardrail_decision
                log_guardrail_decision(
                    db=db,
                    agent_id=agent_id,
                    tool_name=tool_name,
                    action=result.action,
                    title=result.title,
                    reason=result.reason,
                    params=params,
                    risk_score=result.risk_score,
                )
                db.close()
            except Exception as e:
                logger.error("Decision logging failed: %s", e)

        # Alert on blocks
        if result.action in ("block", "escalate") and self.alert_dispatcher:
            try:
                await self.alert_dispatcher.dispatch(
                    alert_type="guardrail_block",
                    severity="high",
                    title=f"Tool call blocked: {tool_name}",
                    description=f"Agent {agent_id} blocked from calling {tool_name}. Reason: {result.reason}",
                    agent_id=agent_id,
                    tool_name=tool_name,
                )
            except Exception as e:
                logger.error("Alert dispatch failed: %s", e)

    def get_stats(self) -> dict:
        """Get proxy call statistics."""
        return {
            **self._call_stats,
            "recent_calls": self._recent_calls[-20:],
        }


class MCPProxyFactory:
    """Factory for creating configured MCPProxy instances."""

    @staticmethod
    def create(
        guardrails=None,
        anomaly_detector=None,
        ws_manager=None,
        alert_dispatcher=None,
        db_session_factory=None,
    ) -> MCPProxy:
        """Create a fully configured MCPProxy."""
        return MCPProxy(
            guardrails=guardrails,
            anomaly_detector=anomaly_detector,
            ws_manager=ws_manager,
            alert_dispatcher=alert_dispatcher,
            db_session_factory=db_session_factory,
        )

    @staticmethod
    def create_default() -> MCPProxy:
        """Create an MCPProxy with all default components."""
        from app.monitors.agent_guardrails import AgentGuardrails
        from app.monitors.anomaly_detection import anomaly_detector as default_detector
        from app.monitors.ws_manager import ws_manager as default_ws
        from app.monitors.alert_integrations import alert_dispatcher as default_dispatcher

        return MCPProxy(
            guardrails=AgentGuardrails(),
            anomaly_detector=default_detector,
            ws_manager=default_ws,
            alert_dispatcher=default_dispatcher,
        )
