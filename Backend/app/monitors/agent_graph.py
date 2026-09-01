"""
Agent Threat Graph

Builds a real-time graph of agent → tool → data flows and highlights
risk in the agent ecosystem. Provides:

  - Agent relationship mapping (which agents call which tools)
  - Data flow tracking (what data flows through agent chains)
  - Cross-agent attack path detection
  - Risk coloring per node and edge
  - Graph export (JSON for frontend visualization, GraphML for analysis)
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


# ── Enums ───────────────────────────────────────────────────────────────

class NodeType(str, Enum):
    AGENT = "agent"
    TOOL = "tool"
    DATA = "data"
    SERVICE = "service"
    USER = "user"


class EdgeType(str, Enum):
    CALLS = "calls"           # agent → tool
    READS = "reads"           # agent → data
    WRITES = "writes"         # agent → data
    DELEGATES = "delegates"   # agent → agent
    TRIGGERS = "triggers"     # tool → agent
    FLOWS_TO = "flows_to"     # data → data


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SAFE = "safe"


# ── Data Classes ────────────────────────────────────────────────────────

@dataclass
class GraphNode:
    id: str
    node_type: str
    label: str
    risk_level: str = "safe"
    risk_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GraphEdge:
    id: str
    source: str
    target: str
    edge_type: str
    risk_level: str = "safe"
    risk_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AttackPath:
    path_id: str
    nodes: List[str]
    edges: List[str]
    total_risk: float
    risk_level: str
    description: str
    recommendation: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ThreatGraph:
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    attack_paths: List[AttackPath]
    summary: Dict[str, Any]
    generated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "attack_paths": [p.to_dict() for p in self.attack_paths],
            "summary": self.summary,
            "generated_at": self.generated_at,
        }


# ── Graph Builder ───────────────────────────────────────────────────────

class AgentThreatGraph:
    """
    Builds and analyzes the agent threat graph from telemetry data.
    """

    def __init__(self):
        self._nodes: Dict[str, GraphNode] = {}
        self._edges: Dict[str, GraphEdge] = {}
        self._adjacency: Dict[str, List[str]] = defaultdict(list)
        self._reverse_adj: Dict[str, List[str]] = defaultdict(list)

    # ── Public API: Add Entities ────────────────────────────────────────

    def add_agent(
        self, agent_id: str, name: str,
        risk_level: str = "safe", risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        node_id = f"agent:{agent_id}"
        self._nodes[node_id] = GraphNode(
            id=node_id, node_type=NodeType.AGENT.value,
            label=name, risk_level=risk_level,
            risk_score=risk_score, metadata=metadata or {},
        )

    def add_tool(
        self, tool_id: str, name: str,
        risk_level: str = "safe", risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        node_id = f"tool:{tool_id}"
        self._nodes[node_id] = GraphNode(
            id=node_id, node_type=NodeType.TOOL.value,
            label=name, risk_level=risk_level,
            risk_score=risk_score, metadata=metadata or {},
        )

    def add_data(
        self, data_id: str, name: str,
        risk_level: str = "safe", risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        node_id = f"data:{data_id}"
        self._nodes[node_id] = GraphNode(
            id=node_id, node_type=NodeType.DATA.value,
            label=name, risk_level=risk_level,
            risk_score=risk_score, metadata=metadata or {},
        )

    def add_service(
        self, service_id: str, name: str,
        risk_level: str = "safe", risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        node_id = f"service:{service_id}"
        self._nodes[node_id] = GraphNode(
            id=node_id, node_type=NodeType.SERVICE.value,
            label=name, risk_level=risk_level,
            risk_score=risk_score, metadata=metadata or {},
        )

    # ── Public API: Add Relationships ───────────────────────────────────

    def add_call(
        self, agent_id: str, tool_id: str,
        risk_level: str = "safe", risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        src = f"agent:{agent_id}" if not agent_id.startswith("agent:") else agent_id
        dst = f"tool:{tool_id}" if not tool_id.startswith("tool:") else tool_id
        edge_id = self._edge_id(src, dst, EdgeType.CALLS.value)
        self._add_edge(edge_id, src, dst, EdgeType.CALLS.value, risk_level, risk_score, metadata)

    def add_delegation(
        self, from_agent: str, to_agent: str,
        risk_level: str = "safe", risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        src = f"agent:{from_agent}" if not from_agent.startswith("agent:") else from_agent
        dst = f"agent:{to_agent}" if not to_agent.startswith("agent:") else to_agent
        edge_id = self._edge_id(src, dst, EdgeType.DELEGATES.value)
        self._add_edge(edge_id, src, dst, EdgeType.DELEGATES.value, risk_level, risk_score, metadata)

    def add_data_flow(
        self, source_id: str, target_id: str,
        flow_type: str = "flows_to",
        risk_level: str = "safe", risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        src = source_id if ":" in source_id else f"data:{source_id}"
        dst = target_id if ":" in target_id else f"data:{target_id}"
        edge_type = EdgeType.FLOWS_TO.value if flow_type == "flows_to" else flow_type
        edge_id = self._edge_id(src, dst, edge_type)
        self._add_edge(edge_id, src, dst, edge_type, risk_level, risk_score, metadata)

    # ── Public API: Analysis ────────────────────────────────────────────

    def find_attack_paths(
        self, max_depth: int = 5, min_risk: float = 0.3
    ) -> List[AttackPath]:
        """
        Find potential attack paths in the graph using BFS.
        Looks for paths from agents to sensitive data/services via risky tools.
        """
        paths: List[AttackPath] = []
        visited: Set[str] = set()

        # Find all agent nodes as starting points
        agent_nodes = [
            n for n in self._nodes.values()
            if n.node_type == NodeType.AGENT.value and n.risk_score >= min_risk
        ]

        # Also start from any node with high risk
        high_risk_nodes = [
            n for n in self._nodes.values()
            if n.risk_score >= 0.7 and n.id not in {a.id for a in agent_nodes}
        ]

        start_nodes = agent_nodes + high_risk_nodes

        for start in start_nodes:
            self._bfs_attack_paths(
                start.id, max_depth, min_risk, visited, paths
            )

        # Deduplicate and sort by risk
        seen = set()
        unique_paths = []
        for p in sorted(paths, key=lambda x: x.total_risk, reverse=True):
            key = tuple(p.nodes)
            if key not in seen:
                seen.add(key)
                unique_paths.append(p)

        return unique_paths[:20]  # Top 20 paths

    def get_node_subgraph(
        self, node_id: str, depth: int = 2
    ) -> ThreatGraph:
        """Get a subgraph centered on a specific node."""
        if node_id not in self._nodes:
            return ThreatGraph(nodes=[], edges=[], attack_paths=[], summary={})

        reachable: Set[str] = {node_id}
        frontier = {node_id}

        for _ in range(depth):
            next_frontier = set()
            for nid in frontier:
                for neighbor in self._adjacency.get(nid, []):
                    if neighbor not in reachable:
                        reachable.add(neighbor)
                        next_frontier.add(neighbor)
                for neighbor in self._reverse_adj.get(nid, []):
                    if neighbor not in reachable:
                        reachable.add(neighbor)
                        next_frontier.add(neighbor)
            frontier = next_frontier

        nodes = [self._nodes[nid] for nid in reachable if nid in self._nodes]
        edges = [
            e for e in self._edges.values()
            if e.source in reachable and e.target in reachable
        ]

        return ThreatGraph(
            nodes=nodes, edges=edges, attack_paths=[],
            summary={"center": node_id, "depth": depth, "node_count": len(nodes)},
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    def compute_risk_propagation(self) -> Dict[str, float]:
        """
        Propagate risk scores through the graph.
        High-risk nodes increase risk of connected nodes.
        """
        if not self._nodes:
            return {}

        risk_scores: Dict[str, float] = {
            nid: n.risk_score for nid, n in self._nodes.items()
        }

        # 3 rounds of propagation
        for _ in range(3):
            new_scores = dict(risk_scores)
            for nid, score in risk_scores.items():
                neighbors = self._adjacency.get(nid, []) + self._reverse_adj.get(nid, [])
                if neighbors:
                    neighbor_risks = [risk_scores.get(n, 0.0) for n in neighbors]
                    max_neighbor = max(neighbor_risks) if neighbor_risks else 0.0
                    # Risk propagates at 50% strength
                    propagated = max(score, max_neighbor * 0.5)
                    new_scores[nid] = round(max(score, propagated), 3)
            risk_scores = new_scores

        return risk_scores

    # ── Public API: Export ──────────────────────────────────────────────

    def to_json(self) -> Dict[str, Any]:
        """Export graph as JSON for frontend visualization."""
        return self.to_dict()

    def to_graphml(self) -> str:
        """Export graph as GraphML for external analysis tools."""
        lines = ['<?xml version="1.0" encoding="UTF-8"?>']
        lines.append('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">')
        lines.append('  <key id="node_type" for="node" attr.name="type" attr.type="string"/>')
        lines.append('  <key id="risk_level" for="node" attr.name="risk_level" attr.type="string"/>')
        lines.append('  <key id="risk_score" for="node" attr.name="risk_score" attr.type="double"/>')
        lines.append('  <key id="edge_type" for="edge" attr.name="type" attr.type="string"/>')
        lines.append('  <key id="edge_risk" for="edge" attr.name="risk_score" attr.type="double"/>')

        # Node risk colors for Cytoscape/visualization
        risk_colors = {
            "critical": "#FF0000",
            "high": "#FF6600",
            "medium": "#FFAA00",
            "low": "#00AA00",
            "safe": "#00FF00",
        }
        lines.append('  <key id="color" for="node" attr.name="color" attr.type="string"/>')

        lines.append('  <graph id="sentinel-threat-graph" edgedefault="directed">')

        for node in self._nodes.values():
            color = risk_colors.get(node.risk_level, "#CCCCCC")
            safe_label = node.label.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            lines.append(f'    <node id="{node.id}">')
            lines.append(f'      <data key="node_type">{node.node_type}</data>')
            lines.append(f'      <data key="risk_level">{node.risk_level}</data>')
            lines.append(f'      <data key="risk_score">{node.risk_score}</data>')
            lines.append(f'      <data key="color">{color}</data>')
            lines.append(f'    </node>')

        for edge in self._edges.values():
            safe_label = edge.edge_type.replace("&", "&amp;")
            lines.append(f'    <edge source="{edge.source}" target="{edge.target}">')
            lines.append(f'      <data key="edge_type">{edge.edge_type}</data>')
            lines.append(f'      <data key="edge_risk">{edge.risk_score}</data>')
            lines.append(f'    </edge>')

        lines.append('  </graph>')
        lines.append('</graphml>')
        return "\n".join(lines)

    def to_cytoscape(self) -> List[Dict[str, Any]]:
        """Export graph in Cytoscape.js format for frontend rendering."""
        elements = []
        risk_colors = {
            "critical": "#FF0000",
            "high": "#FF6600",
            "medium": "#FFAA00",
            "low": "#00AA00",
            "safe": "#CCCCCC",
        }

        for node in self._nodes.values():
            elements.append({
                "data": {
                    "id": node.id,
                    "label": node.label,
                    "type": node.node_type,
                    "risk_level": node.risk_level,
                    "risk_score": node.risk_score,
                    "color": risk_colors.get(node.risk_level, "#CCCCCC"),
                },
            })

        for edge in self._edges.values():
            elements.append({
                "data": {
                    "id": edge.id,
                    "source": edge.source,
                    "target": edge.target,
                    "type": edge.edge_type,
                    "risk_level": edge.risk_level,
                    "risk_score": edge.risk_score,
                },
            })

        return elements

    # ── Internal Helpers ────────────────────────────────────────────────

    def _add_edge(
        self, edge_id: str, src: str, dst: str, edge_type: str,
        risk_level: str, risk_score: float,
        metadata: Optional[Dict[str, Any]],
    ):
        edge = GraphEdge(
            id=edge_id, source=src, target=dst,
            edge_type=edge_type, risk_level=risk_level,
            risk_score=risk_score, metadata=metadata or {},
        )
        self._edges[edge_id] = edge
        self._adjacency[src].append(dst)
        self._reverse_adj[dst].append(src)

    def _edge_id(self, src: str, dst: str, edge_type: str) -> str:
        raw = f"{src}->{dst}:{edge_type}"
        return hashlib.md5(raw.encode()).hexdigest()[:12]

    def _bfs_attack_paths(
        self, start_id: str, max_depth: int, min_risk: float,
        global_visited: Set[str], paths: List[AttackPath],
    ):
        """BFS from start node to find risky paths."""
        queue = [(start_id, [start_id], [], 0.0)]
        visited: Set[str] = {start_id}

        while queue:
            current, path, edge_ids, total_risk = queue.pop(0)

            if len(path) > max_depth:
                continue

            node = self._nodes.get(current)
            if node and node.risk_score > 0:
                total_risk = max(total_risk, node.risk_score)

            # Check if we reached a sensitive target
            if node and (
                node.node_type == NodeType.DATA.value
                or node.node_type == NodeType.SERVICE.value
            ) and total_risk >= min_risk and len(path) > 1:
                risk_level = self._risk_level_from_score(total_risk)
                paths.append(AttackPath(
                    path_id=hashlib.md5("->".join(path).encode()).hexdigest()[:12],
                    nodes=list(path),
                    edges=list(edge_ids),
                    total_risk=round(total_risk, 3),
                    risk_level=risk_level,
                    description=self._describe_path(path),
                    recommendation=self._recommend_path(path, risk_level),
                ))

            # Explore neighbors
            for neighbor in self._adjacency.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    neighbor_node = self._nodes.get(neighbor)
                    neighbor_risk = neighbor_node.risk_score if neighbor_node else 0.0

                    # Find edge
                    edge_key = self._edge_id(current, neighbor, "")
                    matching_edge = None
                    for eid, e in self._edges.items():
                        if e.source == current and e.target == neighbor:
                            matching_edge = eid
                            break

                    queue.append((
                        neighbor,
                        path + [neighbor],
                        edge_ids + ([matching_edge] if matching_edge else []),
                        max(total_risk, neighbor_risk),
                    ))

            global_visited.add(start_id)

    def _describe_path(self, path: List[str]) -> str:
        labels = []
        for nid in path:
            node = self._nodes.get(nid)
            labels.append(f"{node.label} ({node.node_type})" if node else nid)
        return " → ".join(labels)

    def _recommend_path(self, path: List[str], risk_level: str) -> str:
        if risk_level == "critical":
            return "IMMEDIATE ACTION: Restrict access and review tool permissions."
        elif risk_level == "high":
            return "Review and restrict the tools and data accessed in this path."
        elif risk_level == "medium":
            return "Monitor this path and consider adding guardrails."
        return "Path appears safe. Continue monitoring."

    def _risk_level_from_score(self, score: float) -> str:
        if score >= 0.8:
            return "critical"
        elif score >= 0.5:
            return "high"
        elif score >= 0.25:
            return "medium"
        elif score > 0.0:
            return "low"
        return "safe"
