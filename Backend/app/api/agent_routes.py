"""
Agent Runtime Guardrails API Routes

Provides endpoints for checking agent actions against guardrail policies.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.monitors.agent_guardrails import (
    AgentGuardrails, AgentProfile, AgentBehaviorBaseline,
    GuardrailDecision,
)
from app.middleware.auth import get_api_key_dependency

router = APIRouter(prefix="/api/v1/agent", tags=["Agent Guardrails"])


# ── Request/Response Schemas ────────────────────────────────────────────

class ToolCallCheckRequest(BaseModel):
    agent_id: str
    tool_name: str
    params: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None


class DelegationCheckRequest(BaseModel):
    from_agent: str
    to_agent: str
    tool_name: str = ""
    context: Optional[Dict[str, Any]] = None


class AgentProfileInput(BaseModel):
    agent_id: str
    allowed_tools: List[str] = []
    denied_tools: List[str] = []
    allowed_data_sources: List[str] = []
    denied_data_sources: List[str] = []
    max_calls_per_minute: int = 60
    max_calls_per_hour: int = 1000
    can_delegate: bool = False
    trusted_agents: List[str] = []
    max_data_rows: int = 10000
    allowed_endpoints: List[str] = []
    denied_endpoints: List[str] = []


class GuardrailResponse(BaseModel):
    status: str = "ok"
    decision: Dict[str, Any]


class ProfileResponse(BaseModel):
    status: str = "ok"
    profile: Dict[str, Any]


class StatsResponse(BaseModel):
    status: str = "ok"
    stats: Dict[str, Any]


class HistoryResponse(BaseModel):
    status: str = "ok"
    history: List[Dict[str, Any]]


# ── In-memory store (replace with DB in production) ─────────────────────
_guardrails = AgentGuardrails()


@router.post("/check", response_model=GuardrailResponse)
async def check_tool_call(
    request: ToolCallCheckRequest,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Check if an agent tool call should be allowed.

    Runs all guardrail checks: global deny list, tool permissions,
    rate limiting, parameter safety, data access, credential theft,
    cross-agent manipulation, and anomaly detection.
    """
    decision = _guardrails.check_tool_call(
        agent_id=request.agent_id,
        tool_name=request.tool_name,
        params=request.params,
        context=request.context,
    )
    return GuardrailResponse(
        status="ok",
        decision=decision.to_dict(),
    )


@router.post("/permission-check", response_model=GuardrailResponse)
async def check_permission(
    request: DelegationCheckRequest,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Check if an agent is allowed to delegate to another agent.
    """
    decision = _guardrails.check_delegation(
        from_agent=request.from_agent,
        to_agent=request.to_agent,
        tool_name=request.tool_name,
        context=request.context,
    )
    return GuardrailResponse(
        status="ok",
        decision=decision.to_dict(),
    )


@router.post("/profile", response_model=ProfileResponse)
async def register_agent_profile(
    request: AgentProfileInput,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Register an agent profile with permission boundaries.
    """
    profile = AgentProfile(
        agent_id=request.agent_id,
        allowed_tools=set(request.allowed_tools),
        denied_tools=set(request.denied_tools),
        allowed_data_sources=set(request.allowed_data_sources),
        denied_data_sources=set(request.denied_data_sources),
        max_calls_per_minute=request.max_calls_per_minute,
        max_calls_per_hour=request.max_calls_per_hour,
        can_delegate=request.can_delegate,
        trusted_agents=set(request.trusted_agents),
        max_data_rows=request.max_data_rows,
        allowed_endpoints=set(request.allowed_endpoints),
        denied_endpoints=set(request.denied_endpoints),
    )
    _guardrails.register_agent(profile)
    return ProfileResponse(
        status="ok",
        profile=profile.to_dict(),
    )


@router.get("/{agent_id}/stats", response_model=StatsResponse)
async def get_agent_stats(
    agent_id: str,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Get call statistics and guardrail events for an agent.
    """
    stats = _guardrails.get_stats(agent_id)
    return StatsResponse(status="ok", stats=stats)


@router.get("/{agent_id}/history", response_model=HistoryResponse)
async def get_agent_history(
    agent_id: str,
    limit: int = 100,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Get recent tool call history for an agent.
    """
    history = _guardrails.get_call_history(agent_id, limit)
    return HistoryResponse(status="ok", history=history)
