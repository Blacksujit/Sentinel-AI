"""
Agent Threat Graph API Routes

Provides endpoints for querying and analyzing the agent threat graph.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.monitors.agent_graph import AgentThreatGraph, ThreatGraph
from app.middleware.auth import get_api_key_dependency

router = APIRouter(prefix="/api/v1/agent-graph", tags=["Agent Threat Graph"])


# ── Request/Response Schemas ────────────────────────────────────────────

class GraphNodeInput(BaseModel):
    id: str
    node_type: str  # agent, tool, data, service, user
    name: str
    risk_level: str = "safe"
    risk_score: float = 0.0
    metadata: Optional[Dict[str, Any]] = None


class GraphEdgeInput(BaseModel):
    source: str
    target: str
    edge_type: str  # calls, reads, writes, delegates, triggers, flows_to
    risk_level: str = "safe"
    risk_score: float = 0.0
    metadata: Optional[Dict[str, Any]] = None


class GraphBuildRequest(BaseModel):
    nodes: List[GraphNodeInput]
    edges: List[GraphEdgeInput]


class GraphAnalyzeRequest(BaseModel):
    max_depth: int = 5
    min_risk: float = 0.3


class GraphResponse(BaseModel):
    status: str = "ok"
    data: Dict[str, Any]
    generated_at: str = ""


# ── In-memory graph store (replace with DB in production) ───────────────
_graph_store: Optional[AgentThreatGraph] = None


@router.post("/build", response_model=GraphResponse)
async def build_threat_graph(
    request: GraphBuildRequest,
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Build the agent threat graph from telemetry data.

    Send all known agents, tools, data sources, and their relationships
    to construct the real-time threat graph.
    """
    global _graph_store
    graph = AgentThreatGraph()

    for node in request.nodes:
        if node.node_type == "agent":
            graph.add_agent(
                node.id, node.name, node.risk_level,
                node.risk_score, node.metadata,
            )
        elif node.node_type == "tool":
            graph.add_tool(
                node.id, node.name, node.risk_level,
                node.risk_score, node.metadata,
            )
        elif node.node_type == "data":
            graph.add_data(
                node.id, node.name, node.risk_level,
                node.risk_score, node.metadata,
            )
        elif node.node_type == "service":
            graph.add_service(
                node.id, node.name, node.risk_level,
                node.risk_score, node.metadata,
            )

    for edge in request.edges:
        if edge.edge_type == "calls":
            graph.add_call(
                edge.source, edge.target, edge.risk_level,
                edge.risk_score, edge.metadata,
            )
        elif edge.edge_type == "delegates":
            graph.add_delegation(
                edge.source, edge.target, edge.risk_level,
                edge.risk_score, edge.metadata,
            )
        else:
            graph.add_data_flow(
                edge.source, edge.target, edge.edge_type,
                edge.risk_level, edge.risk_score, edge.metadata,
            )

    # Compute propagated risk scores
    propagated = graph.compute_risk_propagation()
    for node_id, score in propagated.items():
        if node_id in graph._nodes:
            graph._nodes[node_id].risk_score = score
            # Update risk level based on propagated score
            if score >= 0.8:
                graph._nodes[node_id].risk_level = "critical"
            elif score >= 0.5:
                graph._nodes[node_id].risk_level = "high"
            elif score >= 0.25:
                graph._nodes[node_id].risk_level = "medium"

    _graph_store = graph

    result = graph.to_dict()
    result["summary"] = {
        "node_count": len(graph._nodes),
        "edge_count": len(graph._edges),
        "risk_propagation": propagated,
    }

    return GraphResponse(
        status="ok",
        data=result,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/", response_model=GraphResponse)
async def get_threat_graph(
    format: str = Query("json", description="Export format: json, cytoscape, graphml"),
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Get the current threat graph.
    Supports JSON, Cytoscape.js, and GraphML export formats.
    """
    if not _graph_store:
        raise HTTPException(status_code=404, detail="No graph built yet. POST /api/v1/agent-graph/build first.")

    if format == "cytoscape":
        return GraphResponse(
            status="ok",
            data={"elements": _graph_store.to_cytoscape()},
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    elif format == "graphml":
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(
            _graph_store.to_graphml(),
            media_type="application/xml",
        )

    return GraphResponse(
        status="ok",
        data=_graph_store.to_dict(),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/{node_id}", response_model=GraphResponse)
async def get_node_subgraph(
    node_id: str,
    depth: int = Query(2, ge=1, le=5),
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Get a subgraph centered on a specific node.
    """
    if not _graph_store:
        raise HTTPException(status_code=404, detail="No graph built yet.")

    subgraph = _graph_store.get_node_subgraph(node_id, depth)
    return GraphResponse(
        status="ok",
        data=subgraph.to_dict(),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/analyze", response_model=GraphResponse)
async def analyze_attack_paths(
    request: GraphAnalyzeRequest = GraphAnalyzeRequest(),
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Analyze the threat graph for potential attack paths.
    """
    if not _graph_store:
        raise HTTPException(status_code=404, detail="No graph built yet.")

    paths = _graph_store.find_attack_paths(
        max_depth=request.max_depth,
        min_risk=request.min_risk,
    )

    return GraphResponse(
        status="ok",
        data={
            "attack_paths": [p.to_dict() for p in paths],
            "total_paths": len(paths),
            "max_depth": request.max_depth,
            "min_risk": request.min_risk,
        },
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/risk-propagation", response_model=GraphResponse)
async def get_risk_propagation(
    _auth: Any = Depends(get_api_key_dependency),
):
    """
    Get propagated risk scores for all nodes.
    """
    if not _graph_store:
        raise HTTPException(status_code=404, detail="No graph built yet.")

    propagated = _graph_store.compute_risk_propagation()
    return GraphResponse(
        status="ok",
        data={"risk_scores": propagated},
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
