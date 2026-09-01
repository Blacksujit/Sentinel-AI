"""
SentinelAI Agent Guardrails SDK Module

Provides a client-side interface for checking agent actions against
guardrail policies in real-time.

Usage:
    from sentinelai.agent import SentinelAgentGuardrails

    guardrails = SentinelAgentGuardrails(api_key="your-key")
    decision = guardrails.check_tool_call(
        agent_id="coding-agent-1",
        tool_name="read_database",
        params={"query": "SELECT * FROM users"},
    )
    if decision["action"] == "block":
        print("BLOCKED:", decision["title"])
"""

from typing import Any, Dict, List, Optional
import requests


class SentinelAgentGuardrails:
    """
    Client for checking agent actions against guardrail policies.
    """

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "https://api.sentinelai.com",
        timeout: int = 10,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._endpoint_check = f"{self.base_url}/api/v1/agent/check"
        self._endpoint_profile = f"{self.base_url}/api/v1/agent/profile"
        self._endpoint_stats = f"{self.base_url}/api/v1/agent"

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    def check_tool_call(
        self,
        agent_id: str,
        tool_name: str,
        params: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Check if an agent tool call should be allowed.

        Args:
            agent_id: Unique agent identifier
            tool_name: Name of the tool being called
            params: Tool call parameters
            context: Additional context (data_source, target_agent, etc.)

        Returns:
            Dict with: action, threat_category, title, description, confidence
        """
        payload: Dict[str, Any] = {
            "agent_id": agent_id,
            "tool_name": tool_name,
        }
        if params:
            payload["params"] = params
        if context:
            payload["context"] = context

        resp = requests.post(
            self._endpoint_check,
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json().get("decision", resp.json())

    def check_delegation(
        self,
        from_agent: str,
        to_agent: str,
        tool_name: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Check if one agent is allowed to delegate to another.

        Args:
            from_agent: Agent making the delegation
            to_agent: Target agent
            tool_name: Tool being delegated (optional)
            context: Additional context

        Returns:
            Dict with: action, threat_category, title, description, confidence
        """
        payload: Dict[str, Any] = {
            "from_agent": from_agent,
            "to_agent": to_agent,
        }
        if tool_name:
            payload["tool_name"] = tool_name
        if context:
            payload["context"] = context

        resp = requests.post(
            f"{self.base_url}/api/v1/agent/permission-check",
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json().get("decision", resp.json())

    def register_profile(
        self,
        agent_id: str,
        allowed_tools: Optional[List[str]] = None,
        denied_tools: Optional[List[str]] = None,
        allowed_data_sources: Optional[List[str]] = None,
        denied_data_sources: Optional[List[str]] = None,
        max_calls_per_minute: int = 60,
        max_calls_per_hour: int = 1000,
        can_delegate: bool = False,
        trusted_agents: Optional[List[str]] = None,
        max_data_rows: int = 10000,
    ) -> Dict[str, Any]:
        """
        Register an agent profile with permission boundaries.

        Args:
            agent_id: Unique agent identifier
            allowed_tools: List of allowed tool names (empty = all allowed)
            denied_tools: List of explicitly denied tool names
            allowed_data_sources: List of allowed data sources
            denied_data_sources: List of explicitly denied data sources
            max_calls_per_minute: Rate limit per minute
            max_calls_per_hour: Rate limit per hour
            can_delegate: Whether agent can delegate to other agents
            trusted_agents: List of agents this agent can delegate to
            max_data_rows: Maximum rows in a single data query

        Returns:
            Dict with registered profile details
        """
        payload: Dict[str, Any] = {
            "agent_id": agent_id,
            "max_calls_per_minute": max_calls_per_minute,
            "max_calls_per_hour": max_calls_per_hour,
            "can_delegate": can_delegate,
            "max_data_rows": max_data_rows,
        }
        if allowed_tools is not None:
            payload["allowed_tools"] = allowed_tools
        if denied_tools is not None:
            payload["denied_tools"] = denied_tools
        if allowed_data_sources is not None:
            payload["allowed_data_sources"] = allowed_data_sources
        if denied_data_sources is not None:
            payload["denied_data_sources"] = denied_data_sources
        if trusted_agents is not None:
            payload["trusted_agents"] = trusted_agents

        resp = requests.post(
            self._endpoint_profile,
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def get_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get call statistics and guardrail events for an agent."""
        resp = requests.get(
            f"{self._endpoint_stats}/{agent_id}/stats",
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def get_history(self, agent_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent tool call history for an agent."""
        resp = requests.get(
            f"{self._endpoint_stats}/{agent_id}/history",
            params={"limit": limit},
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json().get("history", [])

    # ── Local-only guardrails (no API call) ─────────────────────────────

    def check_tool_call_local(
        self,
        agent_id: str,
        tool_name: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Local-only guardrail check. No API call needed.
        Useful for offline or edge deployments.
        """
        params = params or {}
        tool_lower = tool_name.lower()
        params_str = str(params).lower()

        # Global deny list
        global_deny = {"shell", "exec", "eval", "system", "subprocess", "curl", "wget"}
        if tool_lower in global_deny:
            return {
                "action": "block",
                "threat_category": "unauthorized_tool",
                "title": "Globally denied tool",
                "description": f"Tool '{tool_name}' is on the global deny list.",
                "confidence": 1.0,
            }

        # SQL injection check
        sql_keywords = ["drop ", "truncate ", "delete from", "update set",
                        "insert into", "exec(", "execute("]
        for kw in sql_keywords:
            if kw in params_str:
                return {
                    "action": "block",
                    "threat_category": "privilege_escalation",
                    "title": f"Potential SQL injection detected",
                    "description": f"Parameter contains SQL keyword '{kw}'.",
                    "confidence": 0.8,
                }

        # Credential access check
        credential_patterns = ["api_key", "secret", "password", "token",
                               "credential", ".env", "AWS_SECRET"]
        for pat in credential_patterns:
            if pat in params_str or pat in tool_lower:
                return {
                    "action": "escalate",
                    "threat_category": "credential_theft",
                    "title": "Potential credential access detected",
                    "description": f"Tool/params access credential-related resource '{pat}'.",
                    "confidence": 0.75,
                }

        return {
            "action": "allow",
            "threat_category": "none",
            "title": "Tool call allowed",
            "description": "Passed all local guardrail checks.",
            "confidence": 0.9,
        }
