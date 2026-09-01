"""
Tests for Agent Threat Graph
"""

import pytest
from app.monitors.agent_graph import AgentThreatGraph, ThreatGraph


class TestAgentThreatGraph:
    def setup_method(self):
        self.graph = AgentThreatGraph()

    def test_empty_graph(self):
        result = self.graph.to_dict()
        assert result["nodes"] == []
        assert result["edges"] == []
        assert result["attack_paths"] == []

    def test_add_agent(self):
        self.graph.add_agent("a1", "Coding Agent", risk_level="low", risk_score=0.2)
        assert "agent:a1" in self.graph._nodes
        node = self.graph._nodes["agent:a1"]
        assert node.label == "Coding Agent"
        assert node.risk_score == 0.2

    def test_add_tool(self):
        self.graph.add_tool("t1", "read_file", risk_level="medium", risk_score=0.4)
        assert "tool:t1" in self.graph._nodes

    def test_add_data(self):
        self.graph.add_data("d1", "user_db", risk_level="high", risk_score=0.7)
        assert "data:d1" in self.graph._nodes

    def test_add_call(self):
        self.graph.add_agent("a1", "Agent 1")
        self.graph.add_tool("t1", "Tool 1")
        self.graph.add_call("a1", "t1")
        assert len(self.graph._edges) == 1
        edge = list(self.graph._edges.values())[0]
        assert edge.source == "agent:a1"
        assert edge.target == "tool:t1"
        assert edge.edge_type == "calls"

    def test_add_delegation(self):
        self.graph.add_agent("a1", "Agent 1")
        self.graph.add_agent("a2", "Agent 2")
        self.graph.add_delegation("a1", "a2")
        assert len(self.graph._edges) == 1
        edge = list(self.graph._edges.values())[0]
        assert edge.edge_type == "delegates"

    def test_attack_path_detection(self):
        # Build a risky chain: Agent -> Risky Tool -> Sensitive Data
        self.graph.add_agent("a1", "Coding Agent", risk_score=0.6)
        self.graph.add_tool("t1", "shell_exec", risk_score=0.9)
        self.graph.add_data("d1", "user_credentials", risk_score=0.8)
        self.graph.add_call("a1", "t1", risk_score=0.9)
        self.graph.add_data_flow("t1", "d1", risk_level="high", risk_score=0.8)

        paths = self.graph.find_attack_paths(max_depth=5, min_risk=0.3)
        assert len(paths) > 0
        assert paths[0].risk_level in ("high", "critical")
        assert len(paths[0].nodes) > 1

    def test_attack_path_too_short(self):
        # Only agent -> no path to data
        self.graph.add_agent("a1", "Agent 1", risk_score=0.5)
        paths = self.graph.find_attack_paths(max_depth=5, min_risk=0.3)
        assert len(paths) == 0

    def test_subgraph(self):
        self.graph.add_agent("a1", "Agent 1")
        self.graph.add_tool("t1", "Tool 1")
        self.graph.add_tool("t2", "Tool 2")
        self.graph.add_call("a1", "t1")
        self.graph.add_call("t1", "t2")

        subgraph = self.graph.get_node_subgraph("agent:a1", depth=2)
        assert len(subgraph.nodes) >= 2
        assert any(n.id == "agent:a1" for n in subgraph.nodes)

    def test_subgraph_unknown_node(self):
        subgraph = self.graph.get_node_subgraph("unknown:node")
        assert len(subgraph.nodes) == 0

    def test_risk_propagation(self):
        self.graph.add_agent("a1", "Agent 1", risk_score=0.0)
        self.graph.add_tool("t1", "Risky Tool", risk_score=0.9)
        self.graph.add_call("a1", "t1")

        propagated = self.graph.compute_risk_propagation()
        assert "agent:a1" in propagated
        # Agent should have increased risk due to connection to risky tool
        assert propagated["agent:a1"] > 0.0

    def test_cytoscape_export(self):
        self.graph.add_agent("a1", "Agent 1")
        elements = self.graph.to_cytoscape()
        assert len(elements) == 1
        assert elements[0]["data"]["id"] == "agent:a1"
        assert "color" in elements[0]["data"]

    def test_graphml_export(self):
        self.graph.add_agent("a1", "Agent 1")
        xml = self.graph.to_graphml()
        assert '<?xml' in xml
        assert 'graphml' in xml
        assert 'agent:a1' in xml

    def test_multiple_attack_paths(self):
        # Two different risky paths
        self.graph.add_agent("a1", "Agent 1", risk_score=0.5)
        self.graph.add_tool("t1", "Tool 1", risk_score=0.8)
        self.graph.add_tool("t2", "Tool 2", risk_score=0.7)
        self.graph.add_data("d1", "Data 1", risk_score=0.9)
        self.graph.add_data("d2", "Data 2", risk_score=0.8)

        self.graph.add_call("a1", "t1")
        self.graph.add_call("a1", "t2")
        self.graph.add_data_flow("t1", "d1")
        self.graph.add_data_flow("t2", "d2")

        paths = self.graph.find_attack_paths(max_depth=4, min_risk=0.3)
        assert len(paths) >= 2

    def test_risk_level_from_score(self):
        g = AgentThreatGraph()
        assert g._risk_level_from_score(0.0) == "safe"
        assert g._risk_level_from_score(0.1) == "low"
        assert g._risk_level_from_score(0.3) == "medium"
        assert g._risk_level_from_score(0.6) == "high"
        assert g._risk_level_from_score(0.9) == "critical"
