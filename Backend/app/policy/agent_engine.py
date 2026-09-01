"""
Agent Policy Engine

Extends the base PolicyEngine with agent-specific policy decisions:
- Tool-level allow/warn/block/escalate
- Cross-agent privilege escalation prevention
- Agent-specific policy rules
- Delegation policies
"""

from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass, field
from enum import Enum

from app.policy.engine import PolicyEngine, PolicyDecision, ActionType
from app.agent.reasoner import RiskSummary, RiskLevel
from app.services.settings_service_db import settings_service


class AgentPolicyAction(str, Enum):
    """Extended action types for agent-specific policies."""
    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"
    ESCALATE = "escalate"
    REQUIRE_APPROVAL = "require_approval"
    RATE_LIMIT = "rate_limit"
    CIRCUIT_BREAK = "circuit_break"


class ToolRiskCategory(str, Enum):
    """Risk categories for tool-level policies."""
    DATA_ACCESS = "data_access"
    CODE_EXECUTION = "code_execution"
    EXTERNAL_API = "external_api"
    CREDENTIAL_ACCESS = "credential_access"
    SYSTEM_MODIFICATION = "system_modification"
    AGENT_DELEGATION = "agent_delegation"


@dataclass
class ToolPolicyRule:
    """Policy rule for a specific tool or tool category."""
    tool_name: str  # Exact tool name or pattern (e.g., "database_*", "*_admin")
    category: ToolRiskCategory
    action: AgentPolicyAction
    conditions: Dict[str, Any] = field(default_factory=dict)
    explanation: str = ""


@dataclass
class AgentPolicyProfile:
    """Agent-specific policy profile extending base risk policies."""
    agent_id: str
    agent_type: str  # e.g., "coding", "analysis", "admin", "customer_support"
    base_risk_tolerance: float = 0.5  # 0.0 (strict) to 1.0 (permissive)
    tool_policies: List[ToolPolicyRule] = field(default_factory=list)
    allowed_delegations: Set[str] = field(default_factory=set)
    denied_delegations: Set[str] = field(default_factory=set)
    max_delegation_depth: int = 2
    requires_approval_for: List[str] = field(default_factory=list)
    custom_thresholds: Dict[str, float] = field(default_factory=dict)


@dataclass
class AgentPolicyDecision:
    """Extended policy decision with agent-specific context."""
    action: AgentPolicyAction
    explanation: str
    confidence: float
    tool_name: Optional[str] = None
    requires_approval: bool = False
    approval_reason: str = ""
    rate_limit_info: Optional[Dict[str, Any]] = None
    circuit_breaker_info: Optional[Dict[str, Any]] = None
    delegation_allowed: bool = True
    escalation_reason: str = ""
class AgentPolicyEngine:
    """
    Agent-specific policy engine extending the base PolicyEngine.

    Handles:
    - Tool-level policy decisions
    - Cross-agent privilege escalation prevention
    - Delegation policies
    - Agent-specific risk thresholds
    - Approval workflows
    """

    def __init__(self):
        self.base_engine = PolicyEngine()
        self.agent_profiles: Dict[str, AgentPolicyProfile] = {}
        self.global_tool_policies: List[ToolPolicyRule] = []
        self._load_default_policies()

    def _load_default_policies(self):
        """Load default global tool policies (applied to all agents)."""
        self.global_tool_policies = [
            ToolPolicyRule(
                tool_name="*_admin",
                category=ToolRiskCategory.SYSTEM_MODIFICATION,
                action=AgentPolicyAction.REQUIRE_APPROVAL,
                conditions={"requires_admin": True},
                explanation="Administrative tools require explicit approval"
            ),
            ToolPolicyRule(
                tool_name="shell",
                category=ToolRiskCategory.CODE_EXECUTION,
                action=AgentPolicyAction.BLOCK,
                explanation="Shell execution is globally blocked"
            ),
            ToolPolicyRule(
                tool_name="exec",
                category=ToolRiskCategory.CODE_EXECUTION,
                action=AgentPolicyAction.BLOCK,
                explanation="Code execution is globally blocked"
            ),
            ToolPolicyRule(
                tool_name="*_credentials*",
                category=ToolRiskCategory.CREDENTIAL_ACCESS,
                action=AgentPolicyAction.ESCALATE,
                explanation="Credential access tools are escalated for review"
            ),
            ToolPolicyRule(
                tool_name="*_api_key*",
                category=ToolRiskCategory.CREDENTIAL_ACCESS,
                action=AgentPolicyAction.ESCALATE,
                explanation="API key access tools are escalated for review"
            ),
            ToolPolicyRule(
                tool_name="delegate",
                category=ToolRiskCategory.AGENT_DELEGATION,
                action=AgentPolicyAction.REQUIRE_APPROVAL,
                conditions={"max_depth": 2},
                explanation="Agent delegation requires approval and has depth limits"
            ),
            ToolPolicyRule(
                tool_name="send_email",
                category=ToolRiskCategory.EXTERNAL_API,
                action=AgentPolicyAction.WARN,
                conditions={"rate_limit": 10},
                explanation="Email sending is rate limited"
            ),
            ToolPolicyRule(
                tool_name="http_request",
                category=ToolRiskCategory.EXTERNAL_API,
                action=AgentPolicyAction.WARN,
                conditions={"rate_limit": 30, "allowed_domains": []},
                explanation="External HTTP requests are monitored"
            ),
        ]

    def register_agent_profile(self, profile: AgentPolicyProfile) -> None:
        """Register an agent's policy profile."""
        self.agent_profiles[profile.agent_id] = profile

    def get_agent_profile(self, agent_id: str) -> Optional[AgentPolicyProfile]:
        """Get an agent's policy profile."""
        return self.agent_profiles.get(agent_id)

    def evaluate_tool_call(
        self,
        agent_id: str,
        tool_name: str,
        params: Dict[str, Any],
        context: Dict[str, Any],
        risk_summary: RiskSummary
    ) -> AgentPolicyDecision:
        """
        Evaluate a tool call against agent-specific and global policies.

        This is the main entry point for agent guardrails integration.
        """
        profile = self.agent_profiles.get(agent_id)

        # First, check global tool policies (highest priority for security)
        global_decision = self._check_global_tool_policies(tool_name, params, context, risk_summary)
        if global_decision:
            return global_decision

        # Then check agent-specific tool policies
        if profile:
            agent_decision = self._check_agent_tool_policies(
                profile, tool_name, params, context, risk_summary
            )
            if agent_decision:
                return agent_decision

        # Fall back to base policy engine for risk-based decisions
        base_decision = self.base_engine.evaluate(risk_summary)
        return self._convert_base_decision(base_decision, tool_name, profile, risk_summary)

    def evaluate_delegation(
        self,
        from_agent: str,
        to_agent: str,
        tool_name: str,
        context: Dict[str, Any],
        risk_summary: RiskSummary,
        current_depth: int = 0
    ) -> AgentPolicyDecision:
        """Evaluate an agent-to-agent delegation request."""
        from_profile = self.agent_profiles.get(from_agent)
        to_profile = self.agent_profiles.get(to_agent)

        # Check delegation depth
        max_depth = from_profile.max_delegation_depth if from_profile else 2
        if current_depth >= max_depth:
            return AgentPolicyDecision(
                action=AgentPolicyAction.BLOCK,
                explanation=(
                    f"Delegation depth {current_depth} exceeds maximum {max_depth}"
                ),
                confidence=1.0,
                tool_name=tool_name,
                delegation_allowed=False,
                escalation_reason="max_delegation_depth_exceeded",
            )

        # Check if from_agent is allowed to delegate to to_agent
        if from_profile:
            if from_profile.denied_delegations and to_agent in from_profile.denied_delegations:
                return AgentPolicyDecision(
                    action=AgentPolicyAction.BLOCK,
                    explanation=f"Agent {from_agent} is denied from delegating to {to_agent}",
                    confidence=1.0,
                    tool_name=tool_name,
                    delegation_allowed=False,
                    escalation_reason="delegation_denied",
                )

            if from_profile.allowed_delegations and to_agent not in from_profile.allowed_delegations:
                return AgentPolicyDecision(
                    action=AgentPolicyAction.REQUIRE_APPROVAL,
                    explanation=f"Agent {from_agent} requires approval to delegate to {to_agent}",
                    confidence=0.8,
                    tool_name=tool_name,
                    requires_approval=True,
                    approval_reason="delegation_not_in_allowlist",
                    delegation_allowed=False,
                )

        # Check cross-agent privilege escalation
        escalation_check = self._check_privilege_escalation(
            from_agent, to_agent, tool_name, from_profile, to_profile
        )
        if escalation_check:
            return escalation_check

        # Evaluate risk for the delegated tool call
        return self.evaluate_tool_call(to_agent, tool_name, {}, context, risk_summary)

    def _check_global_tool_policies(
        self,
        tool_name: str,
        params: Dict[str, Any],
        context: Dict[str, Any],
        risk_summary: RiskSummary,
    ) -> Optional[AgentPolicyDecision]:
        """Check global tool policies (apply to all agents)."""
        for policy in self.global_tool_policies:
            if self._match_tool_pattern(tool_name, policy.tool_name):
                return self._apply_tool_policy(
                    policy, tool_name, params, context, risk_summary
                )
        return None