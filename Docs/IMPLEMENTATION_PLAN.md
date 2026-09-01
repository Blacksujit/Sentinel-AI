# SENTINEL-AI IMPLEMENTATION PLAN
## From Research to Production Features

---

## PHASE 1: MCP SECURITY SCANNER (Week 1-2) — P0, RICE 12.15

### Backend: `app/monitors/mcp_scanner.py`
- Scan MCP tool descriptions for prompt injection, malicious instructions
- Detect tool poisoning patterns
- Policy violation checking
- CLI tool for pre-deployment scanning

### API Routes: `app/api/mcp_routes.py`
- POST `/api/v1/mcp/scan` - Scan MCP server
- GET `/api/v1/mcp/scan/{id}` - Get scan results

### Models: `app/storage/mcp_models.py`
- MCPScan, MCPTool, MCPFinding tables

### SDK: `sentinelai/mcp_scanner.py`
- `sentinelai.mcp.scan()` - Scan MCP server
- `sentinelai.mcp.scan_tool()` - Scan individual tool

---

## PHASE 2: AGENT THREAT GRAPH (Week 2-4) — P0, RICE 4.8

### Backend: `app/monitors/agent_graph.py`
- Build real-time graph of agent → tool → data flows
- Risk coloring (critical/high/medium/low)
- Cross-agent attack path detection
- Graph export (GraphML, JSON, Cytoscape)

### API Routes: `app/api/agent_graph_routes.py`
- GET `/api/v1/agent-graph` - Get threat graph
- GET `/api/v1/agent-graph/{agent_id}` - Get agent subgraph
- POST `/api/v1/agent-graph/analyze` - Analyze attack paths

### Models: `app/storage/agent_models.py`
- Agent, AgentToolCall, AgentDataFlow, AgentInteraction tables

### Frontend: `Frontend/app/dashboard/agent-graph/`
- Interactive graph visualization (React Flow / Cytoscape)
- Real-time updates via WebSocket
- Attack path highlighting

---

## PHASE 3: AGENT RUNTIME GUARDRAILS (Week 3-4) — P0, RICE 4.8

### Extend: `app/monitors/agent_guardrails.py`
- Tool call validation
- Permission boundary enforcement
- Memory poisoning detection
- Credential theft detection
- Anomalous behavior baselining

### Extend: `app/policy/agent_engine.py`
- Agent-specific policy decisions
- Tool-level allow/warn/block/escalate
- Cross-agent privilege escalation prevention

### API: `app/api/agent_routes.py`
- POST `/api/v1/agent/analyze` - Analyze agent action
- POST `/api/v1/agent/permission-check` - Check tool permissions

---

## PHASE 4: COMPLIANCE AUTO-PILOT (Week 4-6) — P1, RICE 2.8

### Backend: `app/services/compliance_autopilot.py`
- EU AI Act risk classification
- Automated documentation generation
- Evidence collection
- Audit trail generation

### Models: `app/storage/compliance_models.py`
- AIComplianceAssessment, AIModelCard, AIEvidence tables

### API: `app/api/compliance_routes.py`
- POST `/api/v1/compliance/classify` - Classify AI system risk
- GET `/api/v1/compliance/report` - Generate compliance report

---

## PHASE 5: AI ASSET DISCOVERY (Week 4-5) — P0, RICE 4.3

### Backend: `app/services/asset_discovery.py`
- Network scanning for LLM endpoints
- API key detection
- Model deployment discovery
- Agent process detection

### API: `app/api/discovery_routes.py`
- POST `/api/v1/discovery/scan` - Run discovery scan
- GET `/api/v1/discovery/assets` - List discovered assets

---

## PHASE 6: DEVELOPER SDK EXTENSION (Week 1-2) — P0, RICE 6.0

### Extend: `sentinelai/client.py`
- `sentinelai.agent.analyze()` - Agent action analysis
- `sentinelai.agent.graph()` - Get threat graph
- `sentinelai.mcp.scan()` - MCP scanning
- `sentinelai.compliance.classify()` - Compliance classification

### Add: `sentinelai/agent.py`, `sentinelai/mcp.py`, `sentinelai/compliance.py`

---

## IMPLEMENTATION ORDER

| Week | Features | Priority |
|------|----------|----------|
| 1 | MCP Scanner + SDK extension | P0 |
| 2 | Agent Runtime Guardrails + SDK | P0 |
| 3 | Agent Threat Graph (backend) | P0 |
| 4 | Agent Threat Graph (frontend) + Asset Discovery | P0 |
| 5 | Compliance Auto-Pilot | P1 |
| 6 | Enterprise features (SSO, RBAC, self-hosted) | P2 |

---

## TECHNICAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                      Sentinel-AI Platform                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  MCP     │ │  Agent   │ │  Agent   │ │Compliance│       │
│  │ Scanner  │ │ Graph    │ │Guardrails│ │Auto-Pilot│       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                    │                                        │
│         ┌──────────▼──────────┐                             │
│         │   Signal Registry   │ (existing)                  │
│         └──────────┬──────────┘                             │
│                    │                                        │
│         ┌──────────▼──────────┐                             │
│         │  Risk Aggregator    │ (existing)                  │
│         └──────────┬──────────┘                             │
│                    │                                        │
│         ┌──────────▼──────────┐                             │
│         │  Policy Engine      │ (extended for agents)       │
│         └──────────┬──────────┘                             │
│                    │                                        │
│         ┌──────────▼──────────┐                             │
│         │  Storage Layer      │ (extended models)           │
│         └─────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

---

## FILES TO CREATE/MODIFY

### New Files (Backend)
- `app/monitors/mcp_scanner.py`
- `app/monitors/agent_graph.py`
- `app/monitors/agent_guardrails.py`
- `app/policy/agent_engine.py`
- `app/services/compliance_autopilot.py`
- `app/services/asset_discovery.py`
- `app/api/mcp_routes.py`
- `app/api/agent_graph_routes.py`
- `app/api/agent_routes.py`
- `app/api/compliance_routes.py`
- `app/api/discovery_routes.py`
- `app/storage/mcp_models.py`
- `app/storage/agent_models.py`
- `app/storage/compliance_models.py`

### New Files (SDK)
- `sentinelai/mcp.py`
- `sentinelai/agent.py`
- `sentinelai/compliance.py`

### Modified Files (Backend)
- `app/signals/registry.py` — Register new detectors
- `app/scoring/aggregator.py` — Add agent signal weights
- `app/policy/engine.py` — Extend for agent policies
- `app/api/routes.py` — Add agent analysis endpoint
- `app/storage/models.py` — Add agent fields to RiskLog

### New Files (Frontend)
- `Frontend/app/dashboard/agent-graph/page.tsx`
- `Frontend/components/agent-graph/`
- `Frontend/lib/agent-graph-api.ts`

---

## SUCCESS METRICS

| Feature | Metric | Target |
|---------|--------|--------|
| MCP Scanner | Scan latency | < 2s per server |
| Agent Graph | Graph render time | < 500ms for 100 nodes |
| Agent Guardrails | Decision latency | < 50ms |
| Compliance | Report generation | < 30s |
| Asset Discovery | Scan coverage | 95% of AI assets |
| SDK | Integration time | < 5 minutes |

---

## NEXT STEPS

1. **Create MCP Scanner** — highest impact, fastest to build
2. **Extend Signal Registry** — plug in new detectors
3. **Build Agent Guardrails** — core runtime protection
4. **Create Agent Models** — storage for agent telemetry
5. **Build Agent Threat Graph** — visualization differentiator