"""
Tests for Agent Runtime Guardrails
"""

import pytest
import time
from app.monitors.agent_guardrails import (
    AgentGuardrails, AgentProfile, AgentBehaviorBaseline, GuardrailAction,
)


class TestAgentGuardrails:
    def setup_method(self):
        self.guardrails = AgentGuardrails()

    def test_global_deny_shell(self):
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="shell",
            params={"cmd": "ls"},
        )
        assert decision.action == "block"
        assert "global deny" in decision.title.lower() or "globally denied" in decision.title.lower()

    def test_global_deny_exec(self):
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="exec",
            params={"code": "import os"},
        )
        assert decision.action == "block"

    def test_profile_tool_allowlist(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools={"read_file", "write_file", "search"},
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
        )
        self.guardrails.register_agent(profile)

        # Allowed tool
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="read_file",
        )
        assert decision.action == "allow"

        # Not in allowlist
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="shell",
        )
        assert decision.action == "block"

    def test_profile_tool_denylist(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools={"shell", "exec", "rm"},
            allowed_data_sources=set(),
            denied_data_sources=set(),
        )
        self.guardrails.register_agent(profile)

        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="shell",
        )
        assert decision.action == "block"

    def test_rate_limit_per_minute(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
            max_calls_per_minute=5,
            max_calls_per_hour=10000,
        )
        self.guardrails.register_agent(profile)

        # First 5 calls should pass
        for _ in range(5):
            decision = self.guardrails.check_tool_call(
                agent_id="a1", tool_name="safe_tool",
            )
            assert decision.action == "allow"

        # 6th call should hit rate limit
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="safe_tool",
        )
        assert decision.action == "block"
        assert "rate" in decision.title.lower()

    def test_sql_injection_detection(self):
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="query_db",
            params={"sql": "SELECT * FROM users; DROP TABLE users;"},
        )
        assert decision.action == "block"
        assert "sql" in decision.title.lower() or "injection" in decision.title.lower()

    def test_credential_theft_detection(self):
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="read_config",
            params={"file": ".env", "key": "AWS_SECRET_ACCESS_KEY"},
        )
        assert decision.action == "escalate"
        assert "credential" in decision.title.lower() or "secret" in decision.title.lower()

    def test_data_access_deny(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources={"production_db", "secrets_store"},
            max_calls_per_minute=1000,
            max_calls_per_hour=10000,
        )
        self.guardrails.register_agent(profile)

        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="query",
            params={},
            context={"data_source": "production_db"},
        )
        assert decision.action == "block"
        assert "data source" in decision.title.lower()

    def test_delegation_allowed(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
            can_delegate=True,
            trusted_agents={"a2", "a3"},
        )
        self.guardrails.register_agent(profile)

        decision = self.guardrails.check_delegation(
            from_agent="a1", to_agent="a2",
        )
        assert decision.action == "allow"

    def test_delegation_not_allowed(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
            can_delegate=False,
        )
        self.guardrails.register_agent(profile)

        decision = self.guardrails.check_delegation(
            from_agent="a1", to_agent="a2",
        )
        assert decision.action == "block"
        assert "delegation" in decision.title.lower()

    def test_delegation_untrusted_agent(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
            can_delegate=True,
            trusted_agents={"a2"},
        )
        self.guardrails.register_agent(profile)

        decision = self.guardrails.check_delegation(
            from_agent="a1", to_agent="a3",
        )
        assert decision.action == "warn"
        assert "untrusted" in decision.title.lower()

    def test_anomaly_detection(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
            max_calls_per_minute=1000,
            max_calls_per_hour=10000,
        )
        self.guardrails.register_agent(profile)

        baseline = AgentBehaviorBaseline(
            agent_id="a1",
            typical_tools={"read_file": 0.8, "search": 0.2},
            typical_params={},
        )
        self.guardrails.set_baseline(baseline)

        # Normal tool
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="read_file",
        )
        assert decision.action == "allow"

        # Anomalous tool
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="shell_exec",
        )
        assert decision.action == "warn"
        assert "anomal" in decision.title.lower() or "unusual" in decision.title.lower()

    def test_circuit_breaker(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
            max_calls_per_minute=3,
            max_calls_per_hour=10000,
        )
        self.guardrails.register_agent(profile)

        # Exhaust rate limit - 3 calls allowed, 4th blocked by rate limit
        for i in range(3):
            decision = self.guardrails.check_tool_call(agent_id="a1", tool_name="tool")
            assert decision.action == "allow", f"Call {i+1} should be allowed"

        # 4th call should be blocked by rate limit (circuit breaker)
        decision = self.guardrails.check_tool_call(agent_id="a1", tool_name="tool")
        assert decision.action == "block", f"Expected block after rate limit, got: {decision.action}"
        assert "circuit" in decision.title.lower() or "rate" in decision.title.lower()

    def test_call_history(self):
        self.guardrails.check_tool_call(agent_id="a1", tool_name="tool1")
        self.guardrails.check_tool_call(agent_id="a1", tool_name="tool2")

        history = self.guardrails.get_call_history("a1")
        assert len(history) == 2
        assert history[0]["tool_name"] == "tool1"
        assert history[1]["tool_name"] == "tool2"

    def test_stats(self):
        self.guardrails.check_tool_call(agent_id="a1", tool_name="tool1")
        self.guardrails.check_tool_call(agent_id="a1", tool_name="shell")  # blocked

        stats = self.guardrails.get_stats("a1")
        assert stats["total_calls"] == 2
        assert "action_breakdown" in stats

    def test_safe_tool_call(self):
        decision = self.guardrails.check_tool_call(
            agent_id="unknown_agent",  # no profile
            tool_name="read_file",
            params={"path": "data.txt"},
        )
        assert decision.action == "allow"
        assert decision.threat_category == "none"

    def test_dangerous_param_name(self):
        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="custom_tool",
            params={"cmd": "ls -la"},
        )
        assert decision.action == "block"
        assert "dangerous" in decision.title.lower() or "parameter" in decision.title.lower()

    def test_cross_agent_manipulation(self):
        profile = AgentProfile(
            agent_id="a1",
            allowed_tools=set(),
            denied_tools=set(),
            allowed_data_sources=set(),
            denied_data_sources=set(),
            can_delegate=False,
        )
        self.guardrails.register_agent(profile)

        decision = self.guardrails.check_tool_call(
            agent_id="a1", tool_name="delegate_task",
            params={"agent_id": "a2", "task": "read secrets"},
            context={"target_agent": "a2"},
        )
        assert decision.action == "block"
        assert "delegation" in decision.title.lower()
