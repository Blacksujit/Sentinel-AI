# Business Context

## Product or Service

Sentinel AI is a lightweight, self-hostable AI risk monitoring platform that acts as a safety and observability layer for LLM-powered systems. It intercepts prompt/response pairs in real time, scores risk, and takes action — before bad outputs reach end users.

**Architecture:** `prompt → detectors → aggregator → log` with an agentic layer: `event → signals → reasoning → actions`

**What is actually built (verified from repo):**

- FastAPI backend with DB-backed persistence (risk logs, settings with version history, baselines)
- `/api/analyze` — core risk analysis endpoint
- `/api/logs` — full interaction audit trail
- `/api/settings` + `/api/settings/history` — configurable detection rules with versioning
- `/api/baselines` — stored baseline profiles for distribution shift detection
- Prompt anomaly detection via embedding similarity (distribution shift)
- Risky output flagging via rule-based heuristics
- Unified risk score with allow / warn / block / escalate decisions
- Human-readable explanations for every flag (key differentiator)
- Multi-turn conversation tracking
- **Python SDK** (`pip install sentinelai-sdk`) — 3-line integration, built-in retries, timeouts, error handling
- **Frontend dashboard** (TypeScript/React) for monitoring and management
- Deployed on Render (backend) + Firebase/Vercel (frontend)
- CI/CD via GitHub Actions

**Tech stack:** Python (FastAPI) backend, TypeScript/React frontend, Python SDK published to PyPI.

**Non-goals:** Does not generate outputs, does not guarantee alignment, favors explainability over black-box models.

## ICP

**Primary:** AI/ML engineers at mid-size SaaS companies (roughly 50–500 employees) who are actively shipping LLM-powered features in production. These engineers own the integration decision, feel the pain of silent AI failures firsthand, and can adopt a new tool without a lengthy procurement process. The Python SDK (`pip install sentinelai-sdk`) is designed specifically for this persona — minimal friction, works in minutes.

**Use cases most likely to convert:**
- Customer support chatbots (explicit in the SDK README)
- Content moderation pipelines
- AI assistant products with safety/compliance requirements
- Multi-application LLM monitoring

**Secondary (future):** Engineering leads at larger companies with regulatory/compliance requirements around AI outputs — the settings history and audit trail features already support this.

## Mission

To make AI systems observable and safe by default — giving every engineering team a clear, explainable view of risk before it reaches their users.

## Business Classification
- Company Type: B2B SaaS
- Industry: AI Infrastructure / Developer Tools
- User Type: Technical (AI/ML Engineers, Software Engineers shipping LLM features)

## Company Values
- Explainability first — every signal should be understandable, not just a score
- Lightweight by design — 3-line SDK integration, no vendor lock-in, easy to drop in and remove
- Engineer empathy — built by engineers who felt the pain, for engineers who feel it now
- Honest about limits — we flag risk, we do not claim to guarantee safety or alignment
- Open by default — open-source core as a trust-building and adoption mechanism

## Go-To-Market Strategy

**Wedge:** Developer community and open-source traction. The Python SDK on PyPI (`pip install sentinelai-sdk`) is the primary acquisition surface. Strong docs, real examples, and framework integrations (LangChain, LlamaIndex) will drive organic discovery.

**Activation path:** Free self-hosted tier (open-source) → engineers integrate via SDK → upgrade to managed cloud tier for dashboards, alerting, settings management, audit logs, and team features.

**Key channels:**
- PyPI / GitHub — SDK discoverability (`pip install sentinelai-sdk`)
- Hacker News, Reddit (r/MachineLearning, r/LLMDevs), Discord AI communities
- LangChain / LlamaIndex plugin ecosystem (integration listings)
- Technical blog posts and SEO — own "LLM safety monitoring", "prompt anomaly detection", "AI output risk scoring"

**First milestone:** 100 GitHub stars + 10 SDK installs in real production apps within 60 days of a clean public launch.

**Important gap to address:** The repo currently has 0 stars. Before any outreach, the README and SDK docs need a polish pass — a clear "why Sentinel over Langfuse/Arize" section and a working demo GIF or video will materially improve cold conversion.

## Business Model

Usage-based SaaS: free self-hosted tier (open-source), paid managed cloud tier priced per 1,000 interactions analyzed. Pricing aligns cost with value and removes friction for early adoption.

**Tier structure (proposed):**
- Free: self-hosted, open-source, community support
- Pro: managed cloud, dashboards, alerting, settings history, $X per 1k interactions
- Enterprise (TBD): SLAs, SSO, audit logs, custom data retention, compliance reports

**PyPI package** (`sentinelai-sdk`) is the top-of-funnel; the managed backend is the monetization layer.

## Competitive Landscape

| Tool | Gap Sentinel fills |
|---|---|
| Langfuse | Tracing/observability focus; no real-time risk scoring or intervention layer |
| Arize AI | Powerful but heavyweight and expensive; overkill for mid-size teams |
| Whylabs | Data drift detection; not LLM-output-specific, less explainable |
| Guardrails AI | Input/output validation but rule-heavy; no unified risk score or agentic layer |

Sentinel's position: explainable, lightweight, real-time risk scoring with a Python SDK that gets you running in 3 lines — not just passive logging.

## Current Stage

Working MVP with core detection pipeline, FastAPI backend, Python SDK (on PyPI), and a React dashboard all built. Deployed on Render + Firebase. 137 commits. No paying customers yet. No public GitHub traction (0 stars). Seeking first design partners and open-source early adopters.

## One Sentence Summary

Sentinel AI is a lightweight LLM risk monitoring platform with a drop-in Python SDK that gives AI/ML engineers at mid-size SaaS companies real-time, explainable safety signals — allowing, warning, or blocking risky model outputs before they reach users.
