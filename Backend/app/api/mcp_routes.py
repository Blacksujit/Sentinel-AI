"""
MCP Scanner API Routes

Provides endpoints for scanning MCP servers and tools for security threats.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.monitors.mcp_scanner import MCPScanner, ToolScanResult, ServerScanResult
from app.middleware.auth import get_api_key_dependency

router = APIRouter(prefix="/api/v1/mcp", tags=["MCP Scanner"])


# ── Request/Response Schemas ────────────────────────────────────────────

class MCPToolInput(BaseModel):
    name: str
    description: str = ""
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None


class MCPToolScanRequest(BaseModel):
    name: str
    description: str = ""
    inputSchema: Optional[Dict[str, Any]] = None
    outputSchema: Optional[Dict[str, Any]] = None


class MCPServerScanRequest(BaseModel):
    server_name: str
    tools: List[MCPToolScanRequest]


class MCPScanResponse(BaseModel):
    status: str = "ok"
    scan_id: str = ""
    risk_score: float = 0.0
    risk_level: str = "safe"
    finding_count: int = 0
    tools: Optional[List[Dict[str, Any]]] = None
    tool: Optional[Dict[str, Any]] = None
    policy_violations: Optional[List[Dict[str, Any]]] = None
    scanned_at: str = ""


# ── Endpoints ───────────────────────────────────────────────────────────

@router.post("/scan", response_model=MCPScanResponse)
async def scan_mcp_server(
    request: MCPServerScanRequest,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Scan an entire MCP server for security threats.

    Sends all tool definitions to the scanner and returns a unified
    risk assessment with per-tool findings.
    """
    scanner = MCPScanner()

    tools_data = []
    for tool in request.tools:
        tool_dict: Dict[str, Any] = {"name": tool.name}
        if tool.description:
            tool_dict["description"] = tool.description
        if tool.inputSchema:
            tool_dict["inputSchema"] = tool.inputSchema
        if tool.outputSchema:
            tool_dict["outputSchema"] = tool.outputSchema
        tools_data.append(tool_dict)

    result = scanner.scan_server(
        server_name=request.server_name,
        tools=tools_data,
    )

    scan_id = hashlib.md5(
        f"{request.server_name}:{datetime.now(timezone.utc).isoformat()}".encode()
    ).hexdigest()[:12]

    return MCPScanResponse(
        status="ok",
        scan_id=scan_id,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        finding_count=result.total_findings,
        tools=[t.to_dict() for t in result.tools],
        policy_violations=[p.to_dict() for p in result.policy_violations],
        scanned_at=result.scanned_at,
    )


@router.post("/scan-tool", response_model=MCPScanResponse)
async def scan_mcp_tool(
    request: MCPToolScanRequest,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Scan a single MCP tool for security threats.
    """
    scanner = MCPScanner()
    result = scanner.scan_tool(
        tool_name=request.name,
        description=request.description,
        input_schema=request.inputSchema,
        output_schema=request.outputSchema,
    )

    scan_id = hashlib.md5(
        f"{request.name}:{datetime.now(timezone.utc).isoformat()}".encode()
    ).hexdigest()[:12]

    return MCPScanResponse(
        status="ok",
        scan_id=scan_id,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        finding_count=result.finding_count,
        tool=result.to_dict(),
        scanned_at=result.scanned_at,
    )


import hashlib
