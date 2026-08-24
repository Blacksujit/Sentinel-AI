# SentinelAI Architecture Diagrams

This directory contains comprehensive architecture diagrams for the SentinelAI platform, created using Mermaid.js.

## Diagrams

| Diagram | Source (.mmd) | Output (.svg) | Description |
|---------|---------------|---------------|-------------|
| Platform Architecture | `sentinelai-architecture.mmd` | `sentinelai-architecture.svg` | Complete system architecture with all components |
| Request Flow | `analyze-request-flow.mmd` | `analyze-request-flow.svg` | Sequence diagram for `/analyze` endpoint |
| Data Model | `sentinelai-data-model.mmd` | `sentinelai-data-model.svg` | ER diagram with 35+ entities and relationships |
| Deployment | `sentinelai-deployment.mmd` | `sentinelai-deployment.svg` | Infrastructure and CI/CD on Vercel |
| RedTeam Pipeline | `sentinelai-redteam.mmd` | `sentinelai-redteam.svg` | Automated adversarial testing pipeline |
| Defense-in-Depth | `sentinelai-defense.mmd` | `sentinelai-defense.svg` | Security layers and threat detection |

## Rendering

### Quick render all diagrams

```bash
python diagrams/render_diagrams.py
```

This reads all `.mmd` files, normalizes CRLF to LF (fixes Windows encoding issues with mmdc), and outputs SVGs.

### Manual render

```bash
mmdc -i sentinelai-architecture.mmd -o sentinelai-architecture.svg -b transparent --width 2400
```

### Prerequisites

```bash
npm install -g @mermaid-js/mermaid-cli
```

## Viewing

- **VS Code / Cursor**: Install Mermaid Preview extension, open `.mmd`, press `Ctrl+Shift+V`
- **Mermaid Live Editor**: Paste content at [mermaid.live](https://mermaid.live)
- **GitHub/GitLab**: Mermaid renders natively in Markdown files
- **SVGs**: Open directly in any browser

## Known Constraints

- Mermaid ER diagrams only support `PK` and `FK` keywords (not `UK` for unique keys)
- Use `render_diagrams.py` instead of raw `mmdc` to avoid Windows CRLF encoding issues
- Large ER diagrams (~1000KB SVG) may take a few seconds to render

## Architecture Overview

### Core Components

- **External Clients**: Web Playground, External APIs, Webhooks, SDKs
- **Edge & Ingress (Vercel)**: CDN, Load Balancer, WAF, Rate Limiter, Security Headers
- **API Gateway (FastAPI)**: Middleware Stack, Router, 15+ Route Modules
- **Core Services**: Signal Registry, Risk Reasoner, Policy Engine, Action Executor, LLM Service
- **Intel Ops**: Incidents, Deployments, Timeline, AI Memory, Escalations
- **RedTeam**: Orchestrator, Attack Classes, Mutation Engine, Verification, Reporting
- **Data Layer (PostgreSQL)**: Organizations, Workspaces, Users, RBAC, Risk Logs, Intel Models, Billing, Wallet, RedTeam, Audit

### Security Layers (Defense-in-Depth)

1. **Perimeter**: WAF, Rate Limiting, IP Reputation, Geo-blocking, TLS 1.3
2. **Application**: Clerk Auth, RBAC/ABAC, API Keys, Plan Enforcement, CSP/HSTS
3. **Input Validation**: Pydantic schemas, Sanitization, Size limits, Encoding checks
4. **Detection**: 6 detectors (Anomaly, Jailbreak RAG, Output Risk, PII, Prompt Injection, Token Anomaly)
5. **Risk Assessment**: Weighted aggregation, Policy Engine, Action Executor, LLM Judge
6. **Response**: Allow/Warn/Block/Escalate/Redact/Quarantine
7. **Monitoring**: Audit, Feedback, Compliance, Threat Intel, Anomaly Detection, Continuous RedTeam
