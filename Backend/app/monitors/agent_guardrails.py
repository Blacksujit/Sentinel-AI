"""
Agent Runtime Guardrails

Real-time safety checks for agent actions before execution:
  - Tool call validation (is this tool allowed for this agent?)
  - Permission boundary enforcement
  - Data access control (can this agent access this data?)
  - Credential theft detection
  - Memory poisoning detection
  - Anomalous behavior baselining
  - Rate limiting and circuit breaking

Usage:
    guardrails = AgentGuardrails()
    decision = guardrails.check_tool_call(
        agent_id="agent-1",
        tool_name="read_database",
        params={"query": "SELECT * FROM users"},
        context={"user_role": "analyst"},
    )
"""

from __future__ import annotations

import time
import hashlib
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


# ── Enums ───────────────────────────────────────────────────────────────

class GuardrailAction(str, Enum):
    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"
    ESCALATE = "escalate"


class ThreatCategory(str, Enum):
    UNAUTHORIZED_TOOL = "unauthorized_tool"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    CREDENTIAL_THEFT = "credential_theft"
    MEMORY_POISONING = "memory_poisoning"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    CIRCUIT_BREAKER = "circuit_breaker"
    UNAUTHORIZED_DATA_ACCESS = "unauthorized_data_access"
    CROSS_AGENT_MANIPULATION = "cross_agent_manipulation"


# ── Data Classes ────────────────────────────────────────────────────────

@dataclass
class ToolCallRecord:
    agent_id: str
    tool_name: str
    params: Dict[str, Any]
    timestamp: float
    action: str  # allow/warn/block/escalate
    reason: str = ""


@dataclass
class GuardrailDecision:
    action: str
    threat_category: str
    title: str
    description: str
    confidence: float
    details: Dict[str, Any] = field(default_factory=dict)
    recommendation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AgentProfile:
    """Defines what an agent is allowed to do."""
    agent_id: str
    allowed_tools: Set[str]
    denied_tools: Set[str]
    allowed_data_sources: Set[str]
    denied_data_sources: Set[str]
    max_calls_per_minute: int = 60
    max_calls_per_hour: int = 1000
    can_delegate: bool = False
    trusted_agents: Set[str] = field(default_factory=set)
    max_data_rows: int = 10000
    allowed_endpoints: Set[str] = field(default_factory=set)
    denied_endpoints: Set[str] = field(default_factory=set)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "allowed_tools": list(self.allowed_tools),
            "denied_tools": list(self.denied_tools),
            "allowed_data_sources": list(self.allowed_data_sources),
            "denied_data_sources": list(self.denied_data_sources),
            "max_calls_per_minute": self.max_calls_per_minute,
            "max_calls_per_hour": self.max_calls_per_hour,
            "can_delegate": self.can_delegate,
            "trusted_agents": list(self.trusted_agents),
            "max_data_rows": self.max_data_rows,
        }


@dataclass
class AgentBehaviorBaseline:
    """Baseline for detecting anomalous behavior."""
    agent_id: str
    typical_tools: Dict[str, float]   # tool_name -> frequency (0-1)
    typical_params: Dict[str, str]    # param patterns
    avg_calls_per_minute: float = 0.0
    last_updated: str = ""


# ── Guardrails Engine ───────────────────────────────────────────────────

class AgentGuardrails:
    """
    Real-time safety guardrails for agent actions.
    """

    def __init__(self):
        self._profiles: Dict[str, AgentProfile] = {}
        self._call_history: Dict[str, List[ToolCallRecord]] = defaultdict(list)
        self._baselines: Dict[str, AgentBehaviorBaseline] = {}
        self._circuit_breakers: Dict[str, Dict[str, Any]] = {}
        self._global_deny_tools: Set[str] = {
            "shell", "exec", "eval", "system", "subprocess",
            "curl", "wget", "download", "upload",
        }
        self._global_deny_params: Set[str] = {
            "cmd", "command", "exec", "eval", "run", "shell",
            "sudo", "chmod", "rm", "delete", "drop",
        }

    # ── Profile Management ──────────────────────────────────────────────

    def register_agent(self, profile: AgentProfile):
        """Register an agent profile with permissions."""
        self._profiles[profile.agent_id] = profile

    def set_baseline(self, baseline: AgentBehaviorBaseline):
        """Set behavioral baseline for anomaly detection."""
        self._baselines[baseline.agent_id] = baseline

    # ── Main Check Method ───────────────────────────────────────────────

    def check_tool_call(
        self,
        agent_id: str,
        tool_name: str,
        params: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> GuardrailDecision:
        """
        Check if a tool call should be allowed, warned, blocked, or escalated.
        Runs all guardrail checks in priority order.
        """
        params = params or {}
        context = context or {}
        now = time.time()

        # 0. Circuit breaker check
        decision = self._check_circuit_breaker(agent_id)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 1. Global deny list
        decision = self._check_global_deny(agent_id, tool_name, params)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 2. Profile-based tool allow/deny
        decision = self._check_tool_permissions(agent_id, tool_name)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 3. Rate limiting
        decision = self._check_rate_limit(agent_id)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 4. Parameter-level checks
        decision = self._check_params(agent_id, tool_name, params)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 5. Data access control
        decision = self._check_data_access(agent_id, tool_name, params, context)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 6. Credential theft detection
        decision = self._check_credential_theft(agent_id, tool_name, params)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 7. Cross-agent manipulation
        decision = self._check_cross_agent(agent_id, tool_name, params, context)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # 8. Anomaly detection
        decision = self._check_anomaly(agent_id, tool_name, params)
        if decision:
            self._record_call(agent_id, tool_name, params, now, decision)
            return decision

        # All checks passed — allow
        decision = GuardrailDecision(
            action=GuardrailAction.ALLOW.value,
            threat_category="none",
            title="Tool call allowed",
            description=f"Tool '{tool_name}' call passed all guardrail checks.",
            confidence=0.95,
        )
        self._record_call(agent_id, tool_name, params, now, decision)
        return decision

    def check_delegation(
        self, from_agent: str, to_agent: str,
        tool_name: str = "", context: Optional[Dict[str, Any]] = None,
    ) -> GuardrailDecision:
        """Check if one agent is allowed to delegate to another."""
        profile = self._profiles.get(from_agent)
        if profile and not profile.can_delegate:
            return GuardrailDecision(
                action=GuardrailAction.BLOCK.value,
                threat_category=ThreatCategory.CROSS_AGENT_MANIPULATION.value,
                title="Delegation not allowed",
                description=f"Agent '{from_agent}' is not authorized to delegate.",
                confidence=0.95,
                recommendation="Enable delegation in agent profile if needed.",
            )

        if profile and to_agent not in profile.trusted_agents:
            return GuardrailDecision(
                action=GuardrailAction.WARN.value,
                threat_category=ThreatCategory.CROSS_AGENT_MANIPULATION.value,
                title="Delegation to untrusted agent",
                description=(
                    f"Agent '{from_agent}' is delegating to untrusted agent '{to_agent}'."
                ),
                confidence=0.7,
                recommendation="Add target agent to trusted_agents list.",
            )

        return GuardrailDecision(
            action=GuardrailAction.ALLOW.value,
            threat_category="none",
            title="Delegation allowed",
            description=f"Delegation from '{from_agent}' to '{to_agent}' is permitted.",
            confidence=0.9,
        )

    # ── Internal Checks ─────────────────────────────────────────────────

    def _check_circuit_breaker(self, agent_id: str) -> Optional[GuardrailDecision]:
        cb = self._circuit_breakers.get(agent_id)
        if not cb:
            return None
        if cb.get("open_until", 0) > time.time():
            return GuardrailDecision(
                action=GuardrailAction.BLOCK.value,
                threat_category=ThreatCategory.CIRCUIT_BREAKER.value,
                title="Circuit breaker open",
                description=(
                    f"Agent '{agent_id}' circuit breaker is open until "
                    f"{datetime.fromtimestamp(cb['open_until'], tz=timezone.utc).isoformat()}."
                ),
                confidence=1.0,
                details={"open_until": cb["open_until"], "trigger": cb.get("trigger", "")},
                recommendation="Wait for circuit breaker to reset or manually override.",
            )
        return None

    def _check_global_deny(
        self, agent_id: str, tool_name: str, params: Dict[str, Any]
    ) -> Optional[GuardrailDecision]:
        if tool_name.lower() in self._global_deny_tools:
            return GuardrailDecision(
                action=GuardrailAction.BLOCK.value,
                threat_category=ThreatCategory.UNAUTHORIZED_TOOL.value,
                title="Globally denied tool",
                description=f"Tool '{tool_name}' is on the global deny list.",
                confidence=1.0,
                recommendation="Use an approved alternative tool.",
            )
        return None

    def _check_tool_permissions(
        self, agent_id: str, tool_name: str
    ) -> Optional[GuardrailDecision]:
        profile = self._profiles.get(agent_id)
        if not profile:
            return None  # No profile = unrestricted (legacy mode)

        if tool_name in profile.denied_tools:
            return GuardrailDecision(
                action=GuardrailAction.BLOCK.value,
                threat_category=ThreatCategory.UNAUTHORIZED_TOOL.value,
                title="Tool denied for this agent",
                description=(
                    f"Agent '{agent_id}' is not permitted to use tool '{tool_name}'."
                ),
                confidence=0.95,
                recommendation="Add tool to agent's allowed_tools list if needed.",
            )

        if profile.allowed_tools and tool_name not in profile.allowed_tools:
            return GuardrailDecision(
                action=GuardrailAction.BLOCK.value,
                threat_category=ThreatCategory.UNAUTHORIZED_TOOL.value,
                title="Tool not in allowlist",
                description=(
                    f"Tool '{tool_name}' is not in the allowlist for agent '{agent_id}'. "
                    f"Allowed: {', '.join(sorted(profile.allowed_tools))}"
                ),
                confidence=0.9,
                recommendation="Add tool to agent's allowed_tools list.",
            )

        return None

    def check_rate_limit(self, agent_id: str) -> Optional[GuardrailDecision]:
        """Public rate limit check (used by MCP proxy)."""
        return self._check_rate_limit(agent_id)

    def _check_rate_limit(self, agent_id: str) -> Optional[GuardrailDecision]:
        profile = self._profiles.get(agent_id)
        now = time.time()

        history = self._call_history.get(agent_id, [])

        # Check per-minute limit
        minute_cutoff = now - 60
        recent_minute = [c for c in history if c.timestamp > minute_cutoff]
        max_per_min = profile.max_calls_per_minute if profile else 60

        if len(recent_minute) >= max_per_min:
            self._trip_circuit_breaker(agent_id, "rate_limit_minute")
            return GuardrailDecision(
                action=GuardrailAction.BLOCK.value,
                threat_category=ThreatCategory.RATE_LIMIT_EXCEEDED.value,
                title="Per-minute rate limit exceeded",
                description=(
                    f"Agent '{agent_id}' has made {len(recent_minute)} calls "
                    f"in the last minute (limit: {max_per_min})."
                ),
                confidence=0.95,
                details={"calls_in_minute": len(recent_minute), "limit": max_per_min},
                recommendation="Reduce call frequency or increase rate limit.",
            )

        # Check per-hour limit
        hour_cutoff = now - 3600
        recent_hour = [c for c in history if c.timestamp > hour_cutoff]
        max_per_hour = profile.max_calls_per_hour if profile else 1000

        if len(recent_hour) >= max_per_hour:
            self._trip_circuit_breaker(agent_id, "rate_limit_hour")
            return GuardrailDecision(
                action=GuardrailAction.BLOCK.value,
                threat_category=ThreatCategory.RATE_LIMIT_EXCEEDED.value,
                title="Per-hour rate limit exceeded",
                description=(
                    f"Agent '{agent_id}' has made {len(recent_hour)} calls "
                    f"in the last hour (limit: {max_per_hour})."
                ),
                confidence=0.95,
                details={"calls_in_hour": len(recent_hour), "limit": max_per_hour},
                recommendation="Reduce call frequency or increase rate limit.",
            )

        return None

    def _check_params(
        self, agent_id: str, tool_name: str, params: Dict[str, Any]
    ) -> Optional[GuardrailDecision]:
        """Check for dangerous parameter values."""
        for key, value in params.items():
            key_lower = key.lower()
            val_str = str(value).lower()

            # Check for shell/command injection
            if key_lower in self._global_deny_params:
                return GuardrailDecision(
                    action=GuardrailAction.BLOCK.value,
                    threat_category=ThreatCategory.PRIVILEGE_ESCALATION.value,
                    title=f"Dangerous parameter '{key}'",
                    description=(
                        f"Parameter '{key}' in tool '{tool_name}' matches a "
                        f"dangerous parameter pattern."
                    ),
                    confidence=0.85,
                    details={"param": key, "value_preview": str(value)[:100]},
                    recommendation="Remove or sanitize this parameter.",
                )

            # Check for SQL injection
            sql_keywords = ["drop ", "truncate ", "delete from", "update set",
                            "insert into", "exec(", "execute("]
            for kw in sql_keywords:
                if kw in val_str:
                    return GuardrailDecision(
                        action=GuardrailAction.BLOCK.value,
                        threat_category=ThreatCategory.PRIVILEGE_ESCALATION.value,
                        title=f"Potential SQL injection via '{key}'",
                        description=(
                            f"Parameter '{key}' contains SQL keyword '{kw}' "
                            f"which may indicate an injection attempt."
                        ),
                        confidence=0.7,
                        details={"param": key, "value_preview": str(value)[:200]},
                        recommendation="Use parameterized queries.",
                    )

        return None

    def _check_data_access(
        self, agent_id: str, tool_name: str,
        params: Dict[str, Any], context: Dict[str, Any],
    ) -> Optional[GuardrailDecision]:
        """Check if agent is allowed to access the requested data."""
        profile = self._profiles.get(agent_id)
        if not profile:
            return None

        # Check data source restrictions
        data_source = context.get("data_source", "") or params.get("database", "") or params.get("table", "")
        if data_source:
            if data_source in profile.denied_data_sources:
                return GuardrailDecision(
                    action=GuardrailAction.BLOCK.value,
                    threat_category=ThreatCategory.UNAUTHORIZED_DATA_ACCESS.value,
                    title="Data source access denied",
                    description=(
                        f"Agent '{agent_id}' is not permitted to access "
                        f"data source '{data_source}'."
                    ),
                    confidence=0.9,
                    recommendation="Use an authorized data source.",
                )

            if profile.allowed_data_sources and data_source not in profile.allowed_data_sources:
                return GuardrailDecision(
                    action=GuardrailAction.BLOCK.value,
                    threat_category=ThreatCategory.UNAUTHORIZED_DATA_ACCESS.value,
                    title="Data source not in allowlist",
                    description=(
                        f"Data source '{data_source}' is not in the allowlist "
                        f"for agent '{agent_id}'."
                    ),
                    confidence=0.85,
                    recommendation="Add data source to agent's allowed_data_sources.",
                )

        # Check row limit
        limit = params.get("limit", params.get("max_rows", params.get("top", None)))
        if limit and isinstance(limit, int) and limit > profile.max_data_rows:
            return GuardrailDecision(
                action=GuardrailAction.WARN.value,
                threat_category=ThreatCategory.DATA_EXFILTRATION.value,
                title="Data row limit exceeded",
                description=(
                    f"Agent '{agent_id}' requested {limit} rows "
                    f"(max allowed: {profile.max_data_rows})."
                ),
                confidence=0.8,
                details={"requested": limit, "max_allowed": profile.max_data_rows},
                recommendation=f"Reduce limit to {profile.max_data_rows} or less.",
            )

        return None

    def _check_credential_theft(
        self, agent_id: str, tool_name: str, params: Dict[str, Any]
    ) -> Optional[GuardrailDecision]:
        """Detect attempts to access credentials or secrets."""
        credential_patterns = [
            "api_key", "secret", "password", "token", "credential",
            "private_key", "access_key", "auth_token", "bearer",
            ".env", "credentials.json", "secrets.yaml",
            "AWS_SECRET", "OPENAI_API_KEY", "DATABASE_URL",
        ]
        params_str = json.dumps(params).lower() if params else ""
        tool_str = tool_name.lower()

        for pattern in credential_patterns:
            if pattern.lower() in params_str or pattern.lower() in tool_str:
                return GuardrailDecision(
                    action=GuardrailAction.ESCALATE.value,
                    threat_category=ThreatCategory.CREDENTIAL_THEFT.value,
                    title="Potential credential access detected",
                    description=(
                        f"Agent '{agent_id}' tool call '{tool_name}' appears to "
                        f"access credential-related resource '{pattern}'."
                    ),
                    confidence=0.75,
                    details={"pattern": pattern, "tool": tool_name},
                    recommendation=(
                        "Use a managed secrets service. "
                        "Do not allow agents to directly access credentials."
                    ),
                )
        return None

    def _check_cross_agent(
        self, agent_id: str, tool_name: str,
        params: Dict[str, Any], context: Dict[str, Any],
    ) -> Optional[GuardrailDecision]:
        """Detect cross-agent manipulation attempts."""
        target_agent = context.get("target_agent") or params.get("agent_id") or params.get("target")
        if target_agent and target_agent != agent_id:
            return self.check_delegation(
                from_agent=agent_id, to_agent=target_agent,
                tool_name=tool_name, context=context,
            )
        return None

    def _check_anomaly(
        self, agent_id: str, tool_name: str, params: Dict[str, Any]
    ) -> Optional[GuardrailDecision]:
        """Detect anomalous behavior against baseline."""
        baseline = self._baselines.get(agent_id)
        if not baseline:
            return None

        # Check if tool usage is anomalous
        tool_freq = baseline.typical_tools.get(tool_name, 0.0)
        if tool_freq < 0.01 and baseline.typical_tools:
            return GuardrailDecision(
                action=GuardrailAction.WARN.value,
                threat_category=ThreatCategory.ANOMALOUS_BEHAVIOR.value,
                title="Unusual tool usage detected",
                description=(
                    f"Agent '{agent_id}' is using tool '{tool_name}' "
                    f"which is not in its typical behavior profile."
                ),
                confidence=0.6,
                details={"tool_frequency_in_baseline": tool_freq},
                recommendation="Verify this tool usage is expected.",
            )

        return None

    # ── Internal Helpers ────────────────────────────────────────────────

    def _record_call(
        self, agent_id: str, tool_name: str,
        params: Dict[str, Any], timestamp: float,
        decision: GuardrailDecision,
    ):
        record = ToolCallRecord(
            agent_id=agent_id, tool_name=tool_name,
            params=params, timestamp=timestamp,
            action=decision.action, reason=decision.title,
        )
        self._call_history[agent_id].append(record)
        # Keep last 10000 calls per agent
        if len(self._call_history[agent_id]) > 10000:
            self._call_history[agent_id] = self._call_history[agent_id][-5000:]

    def _trip_circuit_breaker(self, agent_id: str, trigger: str):
        self._circuit_breakers[agent_id] = {
            "open_until": time.time() + 300,  # 5-minute cooldown
            "trigger": trigger,
            "tripped_at": datetime.now(timezone.utc).isoformat(),
        }

    def get_call_history(
        self, agent_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent call history for an agent."""
        history = self._call_history.get(agent_id, [])
        return [asdict(c) for c in history[-limit:]]

    def get_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get call statistics for an agent."""
        history = self._call_history.get(agent_id, [])
        now = time.time()
        last_hour = [c for c in history if c.timestamp > now - 3600]
        last_day = [c for c in history if c.timestamp > now - 86400]

        action_counts = defaultdict(int)
        for c in history:
            action_counts[c.action] += 1

        return {
            "agent_id": agent_id,
            "total_calls": len(history),
            "calls_last_hour": len(last_hour),
            "calls_last_day": len(last_day),
            "action_breakdown": dict(action_counts),
            "circuit_breaker": self._circuit_breakers.get(agent_id, None),
        }


# Need json for credential check
import json
