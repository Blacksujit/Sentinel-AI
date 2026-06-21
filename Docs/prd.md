# SentinelAI — Product Requirements Document

**Product:** AI Risk Monitoring & Observability Platform
**Version:** 1.0
**Status:** Draft — Pending Design & Engineering Review
**Author:** Principal Product Manager (ex-Datadog, ex-CrowdStrike, ex-Splunk)
**Date:** 2026-06-22

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Personas](#2-user-personas)
3. [Jobs To Be Done](#3-jobs-to-be-done)
4. [Core Product Workflows](#4-core-product-workflows)
5. [Information Architecture](#5-information-architecture)
6. [MVP Scope](#6-mvp-scope)
7. [Functional Requirements](#7-functional-requirements)
8. [Dashboard Specification](#8-dashboard-specification)
9. [Investigations Module](#9-investigations-module)
10. [Analytics Module](#10-analytics-module)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Success Metrics](#12-success-metrics)
13. [Future Vision](#13-future-vision)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

### 1.1 Product Vision

> **A world where every organization can deploy AI with confidence, knowing that risk is visible, explainable, and controllable.**

SentinelAI is the single pane of glass for AI risk — serving engineers, security analysts, compliance officers, and executives with role-appropriate views into the same trusted data.

### 1.2 Problem Statement

Organizations deploying LLMs and AI agents face three converging crises:

| Crisis | The Numbers | The Consequence |
|--------|-------------|-----------------|
| **Security** | Prompt injections up 340% YoY (OWASP LLM Top 10) | Data exfiltration, brand damage, unauthorized access |
| **Observability** | 0 dedicated tools for AI risk monitoring | Teams build custom scripts, miss critical signals |
| **Compliance** | EU AI Act effective Aug 2026, ISO 42001 certifying | 6-figure fines, blocked market access |

The market today offers fragmented point solutions:
- **ML monitoring platforms** (WhyLabs, Arize) built for data scientists — no security or compliance context
- **Security tools** (Protect AI) that flag threats but don't explain or audit them
- **APM extensions** (Datadog LLM Obs.) buried in infrastructure monitoring — no dedicated risk view

**SentinelAI wins by being the first platform that connects security detection, explainable investigation, and compliance audit in a single workflow.**

### 1.3 Target Market

| Segment | Description | ACV Target | GTM Motion |
|---------|-------------|------------|------------|
| **AI-native startups** | Companies with production LLM apps (50-500 employees) | $15-40K | Product-led + Sales-assisted |
| **Mid-market enterprises** | Regulated companies deploying AI (500-5000 employees) | $40-150K | Sales-led + PoC |
| **Large enterprises** | Financial, healthcare, defense with AI pipelines | $150-500K+ | Enterprise sales + On-prem option |

**TAM:** $2.3B by 2028 (AI security + ML observability convergence)

### 1.4 Value Proposition

| For | SentinelAI delivers | Unlike |
|-----|--------------------|--------|
| **AI Engineers** | Real-time risk monitoring with explainable decisions — debug in seconds, not hours | ML monitoring tools that show scores but not reasons |
| **Security Analysts** | AI threat detection integrated with existing SOC workflows | Security tools that don't integrate with Splunk/CrowdStrike |
| **Compliance Officers** | One-click audit reports for EU AI Act, SOC 2, ISO 42001 | Manual evidence collection across fragmented systems |
| **CTOs** | A single AI risk health score with actionable trends | Spreadsheets and gut feelings |

### 1.5 Existing Backend Capabilities

The following backend services are already implemented and will be consumed by the frontend:

| Service | Capability | API Endpoint |
|---------|------------|--------------|
| Prompt Anomaly Detection | Detects prompt injections, jailbreaks, adversarial inputs | Internal gRPC |
| Output Risk Scoring | Scores model outputs across risk categories | Internal gRPC |
| Risk Aggregation Engine | Aggregates signals into unified risk events | Internal service |
| Explainable Risk Decisions | Token-level attribution for risk scores | Internal gRPC |
| Audit Logging | Immutable tamper-evident event log | POST/GET /api/v1/audit |
| REST API | `/api/analyze` — submit text for risk analysis | POST /api/analyze |
| Risk Event Storage | Persistent event store with query interface | GET /api/v1/events |

---

## 2. User Personas

### 2.1 Maya — The AI Engineer

| Attribute | Detail |
|-----------|--------|
| **Role** | ML Engineer / AI Engineer / Applied Scientist |
| **Company size** | 50–5000 employees |
| **Technical level** | Expert — Python, PyTorch, LangChain, Docker |
| **Primary concern** | Shipping velocity without production incidents |
| **Existing tools** | VS Code, Jupyter, Datadog, Weights & Biases, PagerDuty |
| **Session pattern** | Daily, 10–40 min bursts, mostly desktop |

**Responsibilities:**
- Deploy and monitor production LLM applications
- Debug risk alerts and false positives
- Configure model baselines and guardrails
- Respond to incidents during on-call rotations

**Goals:**
1. Detect prompt injections and adversarial inputs in real time
2. Understand *why* a model produced a risky output
3. Debug false positives without clicking through 5 screens
4. Set up automated responses (block, flag, throttle, alert)
5. Correlate deployment changes with risk spikes

**Pain Points:**
- Risk scores with zero explanation ("0.87 — now what?")
- Alert fatigue: 200 alerts/hour with no intelligent prioritization
- Context switching between monitoring, logging, and model registry
- No API-first access — forced to use UI for everything

**Key Decisions:**
- Is this alert a real threat or a false positive? (10+ times/day)
- Should I block this input pattern or just flag it? (5+/day)
- Did my deployment cause this drift? (weekly)
- Do I need to roll back this model version? (weekly)

**Success Metrics:**
- Time to triage an alert: <30 seconds
- False positive rate: <15%
- Time to configure a guardrail: <3 minutes

**Quote:** *"I don't need a pretty chart. I need to know if someone just jailbroke my production model."*

---

### 2.2 Priya — The Security Analyst

| Attribute | Detail |
|-----------|--------|
| **Role** | SOC Analyst / AppSec Engineer / Security Manager |
| **Company size** | 200–10000 employees |
| **Technical level** | Intermediate–Advanced — SIEMs, threat intel |
| **Primary concern** | Detecting and responding to AI threats |
| **Existing tools** | Splunk, CrowdStrike Falcon, Jira, PagerDuty, TheHive |
| **Session pattern** | Daily shift-based, 15–30 min per investigation |

**Responsibilities:**
- Triage AI security alerts alongside traditional SOC alerts
- Investigate prompt injection attempts with full context
- Correlate AI incidents with other security events
- Generate evidence packages for incident reports
- Build detection rules and response playbooks

**Goals:**
1. See AI threat signals in existing SOC workflows (Splunk, CrowdStrike)
2. Investigate attacks in kill-chain format (recon → injection → exfiltration)
3. Generate auditor-ready evidence packages in one click
4. Correlate AI events with traditional security signals
5. Build and tune detection rules without ML expertise

**Pain Points:**
- Zero correlation between AI risk events and traditional security signals
- Explainability is too technical — token heatmaps mean nothing to a SOC analyst
- Can't export evidence in formats auditors accept
- No concept of "normal" — baselines don't exist

**Key Decisions:**
- Is this an actual attack or a benign anomaly? (10+/day)
- Should I escalate to the incident commander? (daily)
- What's the kill-chain stage of this event? (per investigation)
- What evidence do I need to preserve? (per incident)

**Success Metrics:**
- Time to determine if an alert is actionable: <2 minutes
- Evidence package generation: <30 seconds
- MTTR for AI incidents: <30 minutes

**Quote:** *"I need to show my incident commander exactly what happened, when, and why — in a format they can sign off on."*

---

### 2.3 David — The Compliance Officer

| Attribute | Detail |
|-----------|--------|
| **Role** | Compliance Officer / GRC Manager / DPO |
| **Company size** | 200–10000 employees |
| **Technical level** | Low–Intermediate — GRC tools, Excel |
| **Primary concern** | Audit readiness and regulatory compliance |
| **Existing tools** | OneTrust, LogicGate, Jira, Confluence |
| **Session pattern** | Weekly/monthly, 30–60 min sessions |

**Responsibilities:**
- Ensure AI systems meet regulatory requirements
- Generate audit-ready compliance reports
- Manage access controls and workspace isolation
- Review aggregated risk trends across the organization
- Respond to auditor requests for evidence

**Goals:**
1. Generate audit-ready reports showing AI system risk posture
2. Prove that AI decisions are explainable and traceable
3. Demonstrate compliance with EU AI Act, NIST AI RMF, ISO 42001
4. Freeze/baseline configurations for audit periods
5. Manage role-based access and workspace isolation

**Pain Points:**
- Technical dashboards are impenetrable — no compliance-friendly views
- No out-of-the-box compliance report templates
- Audit logs are buried or incomplete
- Can't freeze configurations for audit periods
- RBAC isn't granular enough for multi-tenant compliance

**Key Decisions:**
- Is this system compliant with EU AI Act? (quarterly)
- What evidence do I need for the upcoming audit? (quarterly)
- Who has access to what? (monthly)
- Are our AI risk trends improving or worsening? (monthly)

**Success Metrics:**
- Time to generate audit report: <5 minutes
- Compliance framework coverage: 100% of required controls
- Audit pass rate: 100% with zero findings

**Quote:** *"I don't care about the token-level details. I care that the system can prove it's in control."*

---

### 2.4 Marcus — The CTO / VP Engineering

| Attribute | Detail |
|-----------|--------|
| **Role** | CTO / VP Engineering / Head of AI Platform |
| **Company size** | 50–2000 employees |
| **Technical level** | High-level technical — delegates deep dives |
| **Primary concern** | AI risk posture, ROI, board confidence |
| **Existing tools** | Email, Slack, board deck tools |
| **Session pattern** | Weekly on-demand, 3–10 min |

**Responsibilities:**
- Set AI risk strategy and tolerance
- Report AI risk posture to the board
- Allocate budget for AI risk management
- Ensure compliance without blocking innovation
- Evaluate AI tooling investments

**Goals:**
1. Understand overall AI risk posture at a glance (<10 seconds)
2. Identify trends before they become incidents
3. Justify AI investment to the board with risk-adjusted metrics
4. Compare risk across teams, models, and environments
5. Receive automated executive summaries

**Pain Points:**
- Dashboards built for engineers — too much noise
- No single-number health score for AI risk
- Can't slice risk by team/environment
- No mobile view for after-hours checks
- Manual board slide preparation

**Key Decisions:**
- Is our AI risk posture improving? (weekly)
- Should we increase/decrease AI investment? (quarterly)
- Which teams/models need attention? (weekly)
- Are we ready for the upcoming audit? (quarterly)

**Success Metrics:**
- Time to assess risk posture: <5 seconds
- Board report preparation time: <5 minutes (automated)
- Risk health score trend: improving MoM

**Quote:** *"Give me one number that tells me if I should be worried — and tell me what to do about it."*

---

## 3. Jobs To Be Done

### 3.1 Maya — AI Engineer

| Job Type | Statement | Desired Outcome |
|----------|-----------|-----------------|
| **Functional** | Monitor my production AI models for risk signals without getting paged for noise | See only actionable alerts with <15% false positive rate |
| **Functional** | Investigate why a model produced a risky output | Understand root cause in <60 seconds via token heatmaps |
| **Functional** | Configure automated guardrails that block risky inputs | Set IF/THEN rules in <3 minutes without writing code |
| **Functional** | Correlate a deployment change with a risk spike | See deployment events alongside risk timeline |
| **Emotional** | Feel confident that my models are safe to ship | Trust the risk scores because they are explainable |
| **Emotional** | Not be the bottleneck for AI safety decisions | Delegate guardrail management to the platform |
| **Desired Outcome** | Ship models 2x faster because risk detection is automated and trusted | Reduce mean time to detect risk events from hours to seconds |

### 3.2 Priya — Security Analyst

| Job Type | Statement | Desired Outcome |
|----------|-----------|-----------------|
| **Functional** | Triage AI risk alerts alongside my existing SOC alerts | See AI events in Splunk/CrowdStrike without context switching |
| **Functional** | Investigate a prompt injection attempt from start to finish | Reconstruct the full attack chain in <2 minutes |
| **Functional** | Generate evidence for an incident report | Export a complete evidence package in <30 seconds |
| **Emotional** | Trust that AI threat detection is as reliable as traditional security tools | See false positive rates, precision/recall, and confidence intervals |
| **Emotional** | Demonstrate competence to the incident commander | Present a clear, documented investigation timeline |
| **Desired Outcome** | Reduce AI incident MTTR from hours to <30 minutes | Handle AI threats with same rigor as traditional security incidents |

### 3.3 David — Compliance Officer

| Job Type | Statement | Desired Outcome |
|----------|-----------|-----------------|
| **Functional** | Generate an audit-ready compliance report | Export a complete report in <5 minutes with one click |
| **Functional** | Prove that AI decisions are explainable and traceable | Show auditor an immutable audit trail with decision rationale |
| **Functional** | Freeze configuration state for audit periods | Lock baseline configurations with tamper-evident timestamps |
| **Emotional** | Sleep well knowing the organization is audit-ready | Get automated compliance health score with zero manual effort |
| **Emotional** | Not be dependent on engineers to answer audit questions | Self-serve all compliance data through compliance-mode views |
| **Desired Outcome** | Reduce audit preparation from weeks to hours | Pass AI-specific audits on first attempt with zero findings |

### 3.4 Marcus — CTO / VP Engineering

| Job Type | Statement | Desired Outcome |
|----------|-----------|-----------------|
| **Functional** | Assess AI risk posture across all models in <10 seconds | See a single health score with trend and top 3 risks |
| **Functional** | Identify which teams or models have the highest risk | Slice risk by team, environment, and model type |
| **Functional** | Prepare board slides on AI risk posture | Auto-generate weekly/monthly PDF reports |
| **Emotional** | Feel confident that AI is an asset, not a liability | Trust that risk is being monitored 24/7 with expert systems |
| **Emotional** | Defend AI investment to the board | Present risk-adjusted ROI metrics |
| **Desired Outcome** | Make AI risk governance a competitive advantage | Move from reactive firefighting to proactive risk management |

---

## 4. Core Product Workflows

### 4.1 Workflow: Investigating a High Risk Event

**Trigger:** A critical alert is generated by the risk scoring engine or received via Slack/email/webhook.

**Actors:** Maya (Engineer) or Priya (Security Analyst)

**Flow:**

```
Step 1: RECEIVE ALERT
  └── Channel: Dashboard, Slack notification, PagerDuty, or email
  └── Alert card contains:
      ├── Severity (CRITICAL / WARNING / INFO)
      ├── Model name + environment
      ├── Risk type (prompt injection, PII leak, jailbreak, drift)
      ├── Risk score (0.00–1.00) with confidence level
      ├── Timestamp + "X min ago"
      └── Quick actions: [View] [Mute 1h] [Escalate]

Step 2: TRIAGE (5–15 seconds)
  └── User clicks "View" → Investigations page
  └── Investigation summary panel shows:
      ├── Risk score breakdown by category
      ├── Input summary (truncated + hashed if sensitive)
      ├── Output risk classification
      ├── Baseline comparison: "3.2σ above normal"
      └── Similar events in last 24h: count + link

Step 3: DIAGNOSE (30–120 seconds)
  └── User expands sections as needed:
      ├── Token Heatmap: colored by contribution to risk score
      │   └── Hover shows: token, score contribution, category
      ├── Feature Attribution: which input features drove the score
      │   └── Bar chart of top contributing features
      ├── Timeline: model events, deployment changes, similar alerts
      │   └── Overlay: risk score trend with markers for key events
      └── Raw Event: full JSON payload for export

Step 4: ACT (15–30 seconds)
  └── Decision options:
      ├── [Block Pattern] — add to blocklist with optional note
      ├── [Create Rule] — open guardrail builder pre-filled
      ├── [Escalate] — Jira ticket + Slack thread (auto-filled)
      ├── [Mark as FP] — feedback loop, auto-retunes model
      └── [Dismiss] — with optional reason code

Step 5: VERIFY (optional, 1–3 minutes)
  └── If Block Pattern:
      ├── Confirmation: "Pattern blocked. Estimated prevention: 12/week"
      └── Option to test with sample input
  └── If Escalated:
      ├── Ticket auto-created in Jira with full context
      ├── Slack thread posted with key stakeholders
      └── SLA clock starts for response
```

**UI States:**

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton with placeholder cards for each panel |
| **Error** | "Failed to load investigation. [Retry]" |
| **Empty** | "No investigation data available for this event." |
| **Partial Data** | Show available panels, grey out missing ones with reason |

**API Dependencies:**

| Call | Endpoint | Purpose |
|------|----------|---------|
| Get event detail | `GET /api/v1/events/{id}` | Load risk event data |
| Get explanation | `GET /api/v1/events/{id}/explain` | Token-level attribution |
| Get similar events | `GET /api/v1/events?similar_to={id}&window=24h` | Context |
| Get model timeline | `GET /api/v1/models/{id}/timeline?window=7d` | Deployment history |
| Create rule | `POST /api/v1/policies` | New guardrail |
| Export evidence | `GET /api/v1/events/{id}/evidence` | Evidence package |

---

### 4.2 Workflow: Monitoring Organizational AI Risk

**Trigger:** User opens the Dashboard or receives a periodic executive digest.

**Actors:** All personas (role-adaptive defaults)

**Flow:**

```
Step 1: LOAD DASHBOARD
  └── Role-adaptive default view loads:
      ├── Maya: Alert feed + model list (active critical alerts)
      ├── Priya: Alert inbox + kill-chain summary
      ├── David: Compliance score + framework checklist
      └── Marcus: Health score + trends + top risks

Step 2: ASSESS (3–10 seconds)
  └── User answers the "Should I be worried?" question:
      ├── Health Score widget: 0–100, color-coded, trend arrow
      ├── Alerts summary: critical/warning/info counts
      └── Status message: "Your AI risk posture is healthy. 2 items need attention."

Step 3: DRILL DOWN (15–60 seconds)
  └── User interacts with widgets:
      ├── Click alert count → filtered Alerts list
      ├── Click model name → Model detail page
      ├── Click health score → Analytics > Risk Trends
      └── Click "View All" on any widget → full section

Step 4: ACT
  └── From dashboard, user can:
      ├── Navigate to an alert investigation (click)
      ├── View model details (click)
      ├── Generate compliance snapshot (click)
      └── Share dashboard via URL or PDF export
```

**Dashboard Layout (desktop):**

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Dashboard | Models | Alerts | ...          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── AI Risk Health Score ──────────────────────────────┐   │
│  │  84/100  ↑2 from last week  "Healthy. 2 items need    │   │
│  │  attention."                                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─── Top Risks ─────────────┐  ┌─── Active Alerts ─────┐   │
│  │ 1. Prompt injection spike │  │ ● Critical: 2         │   │
│  │    in prod-gpt-4          │  │ ● Warning:  5         │   │
│  │    ↑ 340% in 24h          │  │ ○ Info:     12        │   │
│  │                           │  │                        │   │
│  │ 2. Drift in embeddings   │  │ [View All →]           │   │
│  │    1.8σ above baseline    │  └────────────────────────┘   │
│  └────────────────────────────┘                              │
│                                                              │
│  ┌─── 7-Day Risk Trend ──────────────┐  ┌─── Recent Events┐ │
│  │  ╱╲    ╱╲    Risk Score          │  │ ✓ PII leak       │ │
│  │ ╱  ╲  ╱  ╲                       │  │   blocked 14:22  │ │
│  │╱    ╲╱    ╲                      │  │ ✓ Injection      │ │
│  │ M T W T F S S                    │  │   stopped 12:10  │ │
│  └────────────────────────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.3 Workflow: Auditing Historical Risk Activity

**Trigger:** Upcoming audit, compliance review, or incident post-mortem.

**Actors:** David (Compliance Officer), supported by Priya (Security)

**Flow:**

```
Step 1: NAVIGATE TO COMPLIANCE
  └── Sidebar: Compliance section
  └── Overview shows:
      ├── Current compliance score (by framework)
      ├── Audit readiness checklist
      └── Recent evidence packages

Step 2: SELECT SCOPE
  └── Form:
      ├── Models: multi-select (all / specific)
      ├── Date range: calendar picker (presets: last 30d, quarter, custom)
      ├── Framework: dropdown (EU AI Act, SOC 2, ISO 42001, NIST AI RMF)
      └── Environment: (production, staging, all)

Step 3: RUN COMPLIANCE CHECKS (auto)
  └── System evaluates:
      ├── Audit trail enabled? ✓ (for all selected models)
      ├── Explainability logging active? ✓ (98% coverage)
      ├── Baseline frozen for period? ✗ [Fix]
      ├── RBAC matches org chart? ✓
      └── Alert thresholds documented? ✓

Step 4: PREVIEW REPORT
  └── Generated report contains:
      ├── Executive summary (1 page)
      ├── Risk heat map by model × environment
      ├── Alert timeline with dispositions
      ├── Configuration snapshots (before/after period)
      ├── Audit log excerpts (filtered to relevant)
      └── Evidence package manifest

Step 5: EXPORT
  └── Format options:
      ├── PDF (branded, auditor-ready)
      ├── CSV (raw data for merging)
      ├── JSON + signed manifest (tamper-evident)
      └── Direct to GRC platform (OneTrust, LogicGate)
```

---

### 4.4 Workflow: Reviewing AI Model Safety Trends

**Trigger:** Weekly review, quarterly planning, or incident post-mortem.

**Actors:** Marcus (CTO), supported by Maya (Engineer)

**Flow:**

```
Step 1: OPEN ANALYTICS
  └── Sidebar: Analytics
  └── Default view: Risk Trends

Step 2: SET CONTEXT
  └── Filters:
      ├── Time range: 7d / 30d / 90d / custom
      ├── Models: all / selected
      ├── Teams: all / selected
      └── Environment: production / staging / all

Step 3: ANALYZE TRENDS
  └── Charts and tables:
      ├── Risk Score Trend (line chart, by model)
      ├── Alert Volume Trend (bar chart, by severity)
      ├── Model Risk Comparison (horizontal bar chart)
      │   └── Each bar: model name + risk score + alert count
      └── Incident Frequency (area chart, by week)

Step 4: IDENTIFY ANOMALIES
  └── Charts highlight:
      ├── Statistically significant deviations
      ├── Models exceeding risk thresholds
      └── Teams with rising alert volumes

Step 5: EXPORT / SHARE
  └── Actions:
      ├── Export chart as PNG/CSV
      ├── Generate PDF report
      └── Share dashboard URL
```

---

### 4.5 Workflow: Managing Risk Policies

**Trigger:** Onboarding a new model, changing thresholds, or responding to an incident.

**Actors:** Maya (Engineer), reviewed by Priya or Marcus

**Flow:**

```
Step 1: NAVIGATE TO POLICIES
  └── Sidebar: Policies
  └── Show active rules, draft rules, and rule templates

Step 2: CREATE OR EDIT RULE
  └── Rule builder:
      ├── Name + description
      ├── Condition: IF [risk_type] [operator] [threshold]
      │   └── Risk types: injection_score, pii_score, drift, output_toxicity
      │   └── Operators: >, >=, <, <=, between
      │   └── Threshold: slider or text input
      ├── Action: THEN [block / flag / alert / escalate / log_only]
      ├── Scope: models, environments, teams
      └── Preview: "This rule would have caught 47 events in the last 7 days"

Step 3: VALIDATE
  └── Test rule against historical data:
      ├── "Test with recent events" → shows hit/miss
      └── "Simulate with specific input" → shows rule decision

Step 4: PUBLISH
  └── Confirmation:
      ├── Rule goes active in ~30 seconds
      ├── Audit log entry created
      └── Option to notify team via Slack

Step 5: MONITOR (ongoing)
  └── Rule effectiveness metrics:
      ├── Times triggered (24h)
      ├── True positive rate
      ├── False positive rate
      └── Estimated incidents prevented
```

**Rule Templates (P1):**

| Template | Rule | Description |
|----------|------|-------------|
| Block Injections | `IF injection_score > 0.9 THEN block` | Block high-confidence prompt injections |
| Flag PII Leaks | `IF pii_score > 0.7 THEN flag` | Flag potential PII exposure |
| Drift Alert | `IF drift > 2σ THEN alert` | Alert on significant distribution drift |
| Escalate Jailbreaks | `IF injection_score > 0.95 AND output_risk > 0.8 THEN escalate` | Escalate combined injection + risky output |

---

## 5. Information Architecture

### 5.1 Navigation Structure

```
Workspace (/)                              ← Scope: all data within workspace
├── Dashboard (/dashboard)                 ← Risk at a glance, role-adaptive
├── Models (/models)                       ← Model registry & risk monitoring
│   ├── [Model Detail] (/models/:id)       ← Per-model: alerts, baselines, guardrails, audit
├── Risk Events (/events)                  ← Event triage center
│   ├── [Event Detail] (/events/:id)       ← Single event investigation view
├── Investigations (/investigations)       ← Deep-dive investigation workspace
│   ├── [Active Investigation] (/investigations/:id)
├── Audit Logs (/audit)                    ← Tamper-evident log explorer
├── Analytics (/analytics)                 ← Trends, comparisons, reporting
│   ├── Risk Trends (/analytics/trends)
│   ├── Model Comparison (/analytics/comparison)
│   ├── Team Metrics (/analytics/teams)
│   └── Compliance (/analytics/compliance)
├── Policies (/policies)                   ← Guardrail rule engine
│   ├── [Rule Detail] (/policies/:id)
│   └── Templates (/policies/templates)
├── API Usage (/api-usage)                 ← Usage monitoring & quotas
├── Team (/team)                           ← Team members & roles
│   ├── Members (/team/members)
│   └── Roles (/team/roles)
└── Settings (/settings)                   ← Workspace configuration
    ├── Integrations (/settings/integrations)
    ├── Workspaces (/settings/workspaces)
    ├── Billing (/settings/billing)
    └── General (/settings/general)
```

### 5.2 Module Rationale

| Module | Why It Exists | Primary Persona | Frequency |
|--------|---------------|-----------------|-----------|
| **Dashboard** | Answer "should I be worried?" in <5 seconds | All | Every session |
| **Models** | The monitored objects — every action starts here | Maya | Daily |
| **Risk Events** | The action surface — triage and disposition | Maya, Priya | Daily |
| **Investigations** | Deep-dive workspace with timeline + explanation | Maya, Priya | Per-incident |
| **Audit Logs** | Immutable trail for compliance and forensics | David, Priya | As needed |
| **Analytics** | Trend analysis, comparisons, executive reporting | Marcus, David | Weekly |
| **Policies** | Guardrail configuration — automated response engine | Maya | Weekly |
| **API Usage** | Usage monitoring — cost, quota, rate limits | Maya | Weekly |
| **Team** | RBAC management — who can see/do what | David, Marcus | Monthly |
| **Settings** | Integration config, workspace admin | David, Maya | As needed |

### 5.3 Object Model

```
Workspace (id, name, slug, created_at, settings)
├── Model (id, name, provider, endpoint, environment, created_at)
│   ├── ModelVersion (id, version, model_id, config_hash, created_at) [immutable]
│   │   ├── Baseline (id, version_id, thresholds, confidence, data_window)
│   │   │   ├── Threshold (metric, operator, value)
│   │   │   └── DriftEvent (id, timestamp, metric, magnitude, direction)
│   │   └── Guardrail (id, name, condition, action, scope, status)
│   ├── RiskEvent (id, model_id, severity, risk_type, score, timestamp)
│   │   ├── EventExplanation (id, event_id, token_attributions, feature_importance)
│   │   ├── Disposition (id, event_id, action, actor, note, timestamp)
│   │   └── SimilarEvent (reference to another RiskEvent)
│   └── AuditEntry (id, model_id, action, actor, changes, timestamp, hash)
├── Policy (id, name, condition, action, scope, status, created_by)
│   └── PolicyExecution (id, policy_id, event_id, matched, timestamp)
├── Team (id, name, workspace_id)
│   └── User (id, email, name, role, teams)
└── Integration (id, type, config, status, workspace_id)
```

---

## 6. MVP Scope

### 6.1 MoSCoW Prioritization

| Priority | Definition | % Capacity |
|----------|------------|------------|
| **P0 — Must Have** | Core workflows fail without this | 60% |
| **P1 — Should Have** | Important but workarounds exist | 25% |
| **P2 — Could Have** | Desirable enhancements | 15% |

### 6.2 P0 — Must Have (MVP)

| Module | Feature | Rationale |
|--------|---------|-----------|
| **Dashboard** | Risk health score widget | CTOs need answer in 5 seconds |
| **Dashboard** | Active alerts summary (count by severity) | Everyone needs triage visibility |
| **Dashboard** | Top risks list (top 3 by criticality) | Urgency signal |
| **Dashboard** | 7-day risk trend chart | "Are we getting better or worse?" |
| **Dashboard** | Recent resolved events | Trust — shows system is working |
| **Risk Events** | Event list with filtering (severity, type, model, time) | Primary triage surface |
| **Risk Events** | Event detail with risk breakdown | Maya needs to understand "why" |
| **Risk Events** | Quick actions: Block, Escalate, Dismiss | Complete triage cycle |
| **Risk Events** | Token-level explanation panel | Explainability is #1 differentiator |
| **Investigations** | Incident timeline (events + model changes) | Root cause analysis |
| **Investigations** | Similar events panel | Context for triage decisions |
| **Investigations** | Evidence package export (JSON + manifest) | Compliance and forensic use |
| **Models** | Model list with risk score + alert count | Inventory of monitored assets |
| **Models** | Model detail: alerts, baselines, guardrails | Per-model operations |
| **Audit Logs** | Immutable audit log explorer (filterable) | Compliance requirement |
| **Audit Logs** | Audit entry detail (actor, action, timestamp, changes) | Transparency |
| **Policies** | Rule creation (condition + action builder) | Engineers need to set guardrails |
| **Policies** | Rule list with status indicator | Policy management |
| **Settings** | Workspace admin (name, members) | Multi-tenancy foundation |
| **Settings** | Integrations (Slack, PagerDuty, webhook) | Alert delivery |
| **Settings** | SSO/SAML configuration | Enterprise procurement requirement |
| **Navigation** | Global search (Cmd+K) | Power user efficiency |
| **UX** | Role-adaptive default views (4 personas) | Differentiated experience |
| **UX** | Empty states with setup guidance | First-run experience |
| **UX** | Loading states, error states, partial data states | Production reliability |

### 6.3 P1 — Should Have (V1.1)

| Module | Feature | Rationale |
|--------|---------|-----------|
| **Analytics** | Risk trends dashboard (7d/30d/90d) | Marcus needs trend visibility |
| **Analytics** | Model-to-model risk comparison | Cross-model health check |
| **Analytics** | Compliance report generator (PDF) | David's core workflow |
| **Analytics** | Automated weekly executive digest | Marcus's recurring need |
| **Policies** | Rule templates (pre-built guardrails) | Speed up common configurations |
| **Policies** | Rule validation / dry-run against history | Confidence before activation |
| **Policies** | Rule effectiveness metrics (TP/FP) | Trust in the system |
| **Risk Events** | SIEM webhook (Splunk, Elastic) | Priya needs SOC integration |
| **Risk Events** | Bulk disposition (select multiple events) | Operational efficiency |
| **Models** | Baseline visualization (drift history chart) | Understand normal behavior |
| **Models** | Model registration form | Self-service onboarding |
| **Audit Logs** | Compliance framework mapping (EU AI Act, SOC 2) | David's compliance workflow |
| **Audit Logs** | Evidence package download (PDF) | Audit-ready documentation |
| **Team** | Role management (admin, editor, viewer, compliance) | Enterprise RBAC |
| **Dashboard** | Mobile-optimized view (health score + critical alerts) | Marcus's after-hours check |
| **Settings** | Baselines page (global config) | Centralized baseline management |

### 6.4 P2 — Future Enhancements

| Module | Feature | Rationale |
|--------|---------|-----------|
| **Analytics** | Team risk comparison with budget context | Marcus's org view |
| **Analytics** | Incident frequency forecasting | Proactive risk management |
| **Analytics** | Custom report builder | Power user flexibility |
| **Policies** | Multi-step rules (AND/OR conditions) | Complex policy scenarios |
| **Policies** | Policy version history with rollback | Change management |
| **Risk Events** | STIX/TAXII export for threat intel | Advanced SIEM integration |
| **Risk Events** | Automated response workflows (Zapier-like) | No-code automation |
| **Models** | Auto-baseline with confidence metric | Reduces manual config |
| **Models** | Model comparison (side-by-side risk profiles) | A/B testing support |
| **Audit Logs** | 21 CFR Part 11 compliance mode | Regulated industries (pharma) |
| **Dashboard** | Custom widget builder | Enterprise flexibility |
| **Settings** | SCIM provisioning | Large enterprise HR sync |
| **Settings** | Custom branding / white-label | Enterprise identity |

---

## 7. Functional Requirements

### 7.1 Dashboard Module

**Purpose:** Provide an at-a-glance view of AI risk posture that answers "should I be worried?" in under 5 seconds, adapted to the user's role.

**User Actions:**
- View AI Risk Health Score (0–100) with trend indicator
- View active alert counts by severity (critical, warning, info)
- View top 3 risks ranked by urgency
- View 7-day risk trend line chart
- View recent resolved events (last 5)
- Click any widget to navigate to full detail
- Toggle between persona-adaptive views
- Share dashboard via URL or export

**Required Data:**
- Aggregated risk score per model per time window
- Active alert counts by severity and model
- Top risk events ranked by (score × severity × recency)
- Historical risk scores for trend calculation (7d, 30d, 90d)
- Recently resolved events with disposition

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/dashboard/summary` | `{health_score, trend, active_alerts, top_risks, recent_resolved}` | Main dashboard load |
| `GET /api/v1/dashboard/trends?window=7d` | `{daily_scores[], model_breakdown[]}` | Trend chart |
| `GET /api/v1/events?status=active&limit=5` | `{events[]}` | Active alerts widget |
| `GET /api/v1/events?status=resolved&limit=5` | `{events[]}` | Recent resolved widget |

**Success Criteria:**
- Dashboard loads in <500ms (P95)
- Health score calculation uses data from last 24h
- Widgets are independently refreshable (no full-page reload)
- All persona views share the same underlying data — only the presentation changes
- Empty state renders when no models are registered

---

### 7.2 Risk Events Module

**Purpose:** Central triage surface for all risk events, supporting filtering, investigation, and disposition.

**User Actions:**
- View paginated list of risk events
- Filter by: severity, risk type, model, environment, time range, status
- Search events by ID or input snippet
- Click event → navigate to event detail
- View event detail: risk breakdown, explanation, timeline, raw payload
- Take action: Block, Flag, Escalate, Mark FP, Dismiss
- Export single event as evidence (JSON)
- View similar events in context panel

**Required Data:**
- Event ID, timestamp, model, severity, risk type, score
- Full event payload (input, output, metadata)
- Risk breakdown by category (injection, pii, toxicity, drift, etc.)
- Token-level attribution (token, score contribution, category)
- Disposition history (who did what, when)
- Similar events (same model, same risk type, last 24h)

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/events?filters` | `{events[], total_count, page}` | Event list |
| `GET /api/v1/events/{id}` | `{event detail}` | Event detail |
| `GET /api/v1/events/{id}/explain` | `{token_attributions[], feature_importance[]}` | Explanation panel |
| `GET /api/v1/events?similar_to={id}` | `{events[]}` | Similar events |
| `POST /api/v1/events/{id}/disposition` | `{disposition}` | Take action |
| `GET /api/v1/events/{id}/evidence` | `{evidence JSON}` | Evidence export |

**Success Criteria:**
- Event list loads in <300ms (100 events)
- Search returns results in <200ms
- Event detail loads all panels in <500ms
- Disposition action confirms in <1s
- Filters persist in URL for bookmarking
- Real-time updates for new events (WebSocket or polling)

---

### 7.3 Investigations Module

**Purpose:** Deep-dive investigation workspace for analyzing a single risk event or a group of related events.

*(Full specification in Section 9)*

---

### 7.4 Audit Logs Module

**Purpose:** Tamper-evident, immutable log of all configuration changes and system events for compliance and forensics.

**User Actions:**
- View paginated audit log entries
- Filter by: actor, action, model, date range, workspace
- Search by keyword
- Click entry → view detail (actor, action, timestamp, before/after state, IP)
- Export audit log as CSV or JSON
- Verify log integrity (hash chain verification)

**Required Data:**
- Entry ID, timestamp, actor, action type, resource type, resource ID
- Before/after state (JSON diff)
- IP address, user agent
- Hash (previous hash + content) for chain integrity
- Workspace ID, model ID (if applicable)

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/audit?filters` | `{entries[], total_count, page}` | Audit log list |
| `GET /api/v1/audit/{id}` | `{entry detail with before/after}` | Entry detail |
| `GET /api/v1/audit/verify` | `{chain_valid: bool, broken_link: id}` | Integrity check |
| `GET /api/v1/audit/export` | `{CSV or JSON}` | Export |

**Success Criteria:**
- Log entries are immutable (no soft deletes)
- Each entry contains a hash linking to previous entry
- Verification endpoint confirms chain integrity
- Exports include hash chain for external verification
- Logs include all configuration changes (policies, thresholds, access control)

---

### 7.5 Analytics Module

**Purpose:** Trend analysis, model comparison, team metrics, and compliance reporting.

*(Full specification in Section 10)*

---

### 7.6 Models Module

**Purpose:** Model registry and per-model risk monitoring, baseline configuration, and guardrail management.

**User Actions:**
- View list of registered models with risk score, alert count, status
- Register a new model (name, provider, endpoint, environment)
- View model detail page with tabs:
  - **Alerts:** events for this model (filterable)
  - **Baselines:** current baseline, drift history chart, threshold config
  - **Guardrails:** active rules scoped to this model
  - **Audit Log:** model-specific audit entries
- Edit model configuration
- Delete model (soft delete with confirmation)

**Required Data:**
- Model ID, name, provider, endpoint, environment, status
- Current risk score (aggregated), alert count by severity
- Baseline thresholds per metric (injection, pii, drift, etc.)
- Drift events: timestamp, metric, magnitude, confidence
- Active guardrails scoped to model
- Audit log entries for this model

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/models` | `{models[]}` | Model list |
| `POST /api/v1/models` | `{model}` | Register model |
| `GET /api/v1/models/{id}` | `{model detail}` | Model detail |
| `GET /api/v1/models/{id}/events` | `{events[]}` | Model alerts tab |
| `GET /api/v1/models/{id}/baselines` | `{baselines[]}` | Baselines tab |
| `GET /api/v1/models/{id}/policies` | `{policies[]}` | Guardrails tab |
| `PUT /api/v1/models/{id}` | `{model}` | Edit model |

**Success Criteria:**
- Model list loads in <300ms
- Model detail tabs load independently
- Registration form validates endpoint before submission
- Soft delete with 30-day recovery window

---

### 7.7 Policies Module

**Purpose:** Guardrail rule engine for automated risk response.

**User Actions:**
- View list of policies with name, condition, action, status, trigger count
- Create policy with rule builder (IF condition THEN action)
- Edit, enable, disable, delete policy
- Test policy against historical data (dry run)
- View policy execution history
- View policy effectiveness metrics (TP, FP, prevented count)

**Required Data:**
- Policy ID, name, description, condition JSON, action, scope, status
- Execution count (24h, 7d), true positive rate, false positive rate
- Execution history: event ID, matched, action taken, timestamp

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/policies` | `{policies[]}` | Policy list |
| `POST /api/v1/policies` | `{policy}` | Create policy |
| `PUT /api/v1/policies/{id}` | `{policy}` | Edit policy |
| `PATCH /api/v1/policies/{id}/status` | `{policy}` | Enable/disable |
| `DELETE /api/v1/policies/{id}` | `204` | Delete policy |
| `POST /api/v1/policies/{id}/test` | `{matched_count, events[]}` | Dry run |
| `GET /api/v1/policies/{id}/executions` | `{executions[]}` | Execution history |

**Success Criteria:**
- Policy takes effect within 30 seconds of creation
- Dry run against historical data returns results in <2s
- Execution count updates in near real-time (<5s delay)
- Policies are versioned in audit log

---

### 7.8 API Usage Module

**Purpose:** Monitor API consumption, rate limits, and cost allocation.

**User Actions:**
- View usage dashboard: requests/day, rate limit %, cost estimate
- Filter by model, time range, environment
- View top consumers by requests and volume
- Set usage alerts (notify when approaching limits)
- Export usage report

**Required Data:**
- Request count per model per time window
- Rate limit status (current, remaining, reset)
- Cost estimate per model (if pricing is per-request)
- Error rate (4xx, 5xx) per model

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/usage?window=7d` | `{usage_by_model[], total_requests, rate_limit}` | Usage dashboard |
| `GET /api/v1/usage/top-consumers` | `{consumers[]}` | Top consumers |

**Success Criteria:**
- Usage data loads in <500ms
- Rate limit indicators are color-coded (green/yellow/red)
- Cost estimates are configurable per workspace

---

### 7.9 Team Management Module

**Purpose:** Role-based access control for workspace members.

**User Actions:**
- View team members list with roles
- Invite new members (email invite)
- Remove members
- Change member roles
- View roles and permissions matrix

**Roles:**

| Role | Models | Events | Policies | Settings | Team | Audit | Billing |
|------|--------|--------|----------|----------|------|-------|---------|
| **Admin** | CRUD | CRUD | CRUD | CRUD | CRUD | Read | CRUD |
| **Editor** | CRUD | CRUD | CRUD | Read | Read | Read | Read |
| **Viewer** | Read | Read | Read | Read | Read | Read | None |
| **Compliance** | Read | Read | None | Read | Read | Read | None |

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/team/members` | `{members[]}` | Member list |
| `POST /api/v1/team/invite` | `{invite}` | Invite member |
| `PATCH /api/v1/team/members/{id}/role` | `{member}` | Change role |
| `DELETE /api/v1/team/members/{id}` | `204` | Remove member |

**Success Criteria:**
- Role changes take effect immediately
- Invites expire after 7 days
- Cannot remove last admin
- All actions logged in audit log

---

### 7.10 Settings Module

**Purpose:** Workspace configuration, integration management, and billing.

**User Actions:**
- General settings: workspace name, slug, timezone
- Integration management: add/edit/remove integrations
- SSO/SAML configuration
- Billing: plan details, invoice history, payment method
- API keys: generate, revoke, list

**Integrations (P0):**

| Integration | Type | Purpose |
|-------------|------|---------|
| Slack | Notification | Alert delivery to channels/DMs |
| PagerDuty | Notification | On-call escalation |
| Webhook | Notification | Custom webhook targets |
| Jira | Ticketing | Escalation ticket creation |
| Email (SMTP) | Notification | Email alerts and digests |

**Integrations (P1):**

| Integration | Type | Purpose |
|-------------|------|---------|
| Splunk | SIEM | Event forwarding |
| Elastic | SIEM | Event forwarding |
| Datadog | APM | Event forwarding |

**API Dependencies:**

| Endpoint | Response | Used By |
|----------|----------|---------|
| `GET /api/v1/workspace` | `{workspace}` | General settings |
| `PUT /api/v1/workspace` | `{workspace}` | Update settings |
| `GET /api/v1/integrations` | `{integrations[]}` | Integration list |
| `POST /api/v1/integrations` | `{integration}` | Add integration |
| `DELETE /api/v1/integrations/{id}` | `204` | Remove integration |
| `GET /api/v1/billing` | `{billing}` | Billing details |

**Success Criteria:**
- Integration setup validates connectivity
- Integration health status is visible (connected/failed/pending)
- SSO configuration includes IdP metadata upload
- All settings changes logged in audit log

---

## 8. Dashboard Specification

### 8.1 Design Principles

The dashboard must answer five questions within 5 seconds:

| # | Question | Where It's Answered |
|---|----------|---------------------|
| 1 | Is my AI system safe? | AI Risk Health Score (hero widget) |
| 2 | What risks exist right now? | Active Alerts summary + Top Risks list |
| 3 | What changed recently? | 7-day risk trend chart |
| 4 | What requires investigation? | Top Risks list (each item is a link) |
| 5 | What action should I take next? | CTA on each risk item + "View All" links |

### 8.2 Widget Specification

#### Widget 1: AI Risk Health Score

| Property | Value |
|----------|-------|
| **Type** | Hero metric with trend |
| **Position** | Top-left, full-width |
| **Size** | Full-width banner |
| **Data** | 0–100 score, trend direction (↑↓→), week-over-week change |
| **Color** | Green (≥80) / Yellow (50–79) / Red (<50) |
| **Text** | "Your AI risk posture is [healthy / needs attention / critical]. [N] items need attention." |
| **Click** | Navigate to Analytics > Risk Trends |
| **Loading** | Large skeleton rectangle |
| **Error** | "Unable to load risk score. Data may be stale. [Refresh]" |
| **Empty** | "Connect your first model to see your AI risk posture. [Connect Model →]" |

#### Widget 2: Active Alerts

| Property | Value |
|----------|-------|
| **Type** | Summary card with severity counts |
| **Position** | Top-right, half-width |
| **Size** | ~300px width |
| **Data** | Count of active events by severity (Critical, Warning, Info) |
| **Color** | Red / Yellow / Blue for each severity |
| **Click** | Navigate to Risk Events filtered by active status |
| **Loading** | Three skeleton lines |
| **Empty** | "No active alerts. Everything looks good." |

#### Widget 3: Top Risks

| Property | Value |
|----------|-------|
| **Type** | Ranked list (top 3) |
| **Position** | Below health score, left half |
| **Data** | Risk title, model, delta ("↑ 340% in 24h"), severity badge |
| **Each item** | Click → navigate to investigation for that event |
| **Max items** | 3 (with "View All →" link) |
| **Loading** | 3 skeleton rows |
| **Empty** | "No risks detected in the last 24 hours." |

#### Widget 4: 7-Day Risk Trend

| Property | Value |
|----------|-------|
| **Type** | Line chart |
| **Position** | Below health score, right half |
| **Data** | Daily aggregated risk score (0–100) over 7 days |
| **Interaction** | Hover → tooltip with date and score. Click → Analytics |
| **Color** | Line: brand color. Area fill: gradient. |
| **Loading** | Skeleton chart area |
| **Empty** | "Insufficient data. Baseline requires 7 days." |

#### Widget 5: Recently Resolved

| Property | Value |
|----------|-------|
| **Type** | Activity feed (last 5) |
| **Position** | Bottom, full-width |
| **Data** | Event type, action taken, timestamp |
| **Each item** | Icon + "PII leak — blocked @ 14:22" |
| **Click** | Navigate to event detail |
| **Loading** | 5 skeleton rows |
| **Empty** | "No resolved events yet." |

### 8.3 Role-Adaptive Defaults

| Role | Default View | Sort Order | Hidden Widgets |
|------|-------------|------------|----------------|
| **Engineer** | Alerts first, models second | Critical → Warning → Info by recency | Compliance score (hidden) |
| **Security** | Alerts first, event list | Kill-chain stage → severity | Baselines widget |
| **Compliance** | Compliance score, audit checklist | Framework → model | Token heatmap preview |
| **CTO** | Health score, trends, top risks | Risk magnitude → business impact | Detailed alert counts |

### 8.4 Dashboard API Contract

```json
GET /api/v1/dashboard/summary
Response 200:
{
  "workspace_id": "ws_abc123",
  "health_score": {
    "current": 84,
    "previous": 82,
    "trend": "up",
    "status": "healthy",
    "items_attention": 2
  },
  "active_alerts": {
    "critical": 2,
    "warning": 5,
    "info": 12,
    "total": 19
  },
  "top_risks": [
    {
      "id": "evt_001",
      "title": "Prompt injection spike",
      "model": "gpt-4-prod",
      "delta": "+340%",
      "delta_unit": "24h",
      "severity": "critical",
      "score": 0.94,
      "timestamp": "2026-06-22T14:22:00Z"
    }
  ],
  "trend": {
    "daily_scores": [
      {"date": "2026-06-16", "score": 72},
      {"date": "2026-06-17", "score": 75}
    ]
  },
  "recent_resolved": [
    {
      "id": "evt_002",
      "title": "PII leak",
      "action": "blocked",
      "model": "gpt-4-prod",
      "timestamp": "2026-06-22T14:22:00Z"
    }
  ]
}
```

---

## 9. Investigations Module

### 9.1 Purpose

The Investigations module is a deep-dive workspace for analyzing risk events — whether a single critical alert or a cluster of related events. It is SentinelAI's core differentiator: the place where engineers and security analysts go from "something is wrong" to "I understand exactly what happened and what to do about it."

### 9.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR: Event ID | Severity Badge | Risk Score | Timestamp    │
│           [Back to Events] [Export Evidence] [Share]            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── LEFT PANEL (Timeline) ───────────┐  ┌─── MAIN PANEL ──┐  │
│  │                                      │  │  Tab: Summary │  │
│  │  Event Timeline:                      │  │                 │  │
│  │  ┌────────────────────────────┐     │  │  Risk Breakdown │  │
│  │  │ ● Risk Event Detected      │     │  │  └─ Injection   │  │
│  │  │   injection_score: 0.94    │     │  │     Score: 0.94 │  │
│  │  │   14:22:03                 │     │  │     Conf: 94%   │  │
│  │  ├────────────────────────────┤     │  │  └─ PII         │  │
│  │  │ ○ Model Deployed           │     │  │     Score: 0.12 │  │
│  │  │   version: 2.4.1           │     │  │                 │  │
│  │  │   14:15:00                 │     │  │  └─ Toxicity    │  │
│  │  ├────────────────────────────┤     │  │     Score: 0.03 │  │
│  │  │ ○ Similar Event (#23)      │     │  │                 │  │
│  │  │   same model, same type    │     │  │  [Tab: Token   │  │
│  │  │   12:30:00                 │     │  │   Heatmap]     │  │
│  │  └────────────────────────────┘     │  │                 │  │
│  │                                      │  │  [Tab: Raw     │  │
│  │  [Timeline Help →]                  │  │   Event]       │  │
│  │                                      │  │                 │  │
│  └──────────────────────────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─── RECOMMENDATIONS ─────────────────────────────────────────┐ │
│  │  Based on this event:                                       │ │
│  │  [Block Pattern] "Add 'ignore previous' to blocklist"      │ │
│  │  [Create Rule] "IF injection > 0.9 THEN block"             │ │
│  │  [Escalate] "Create Jira ticket + Slack thread"            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── SIMILAR EVENTS ─────────────────────────────────────────┐ │
│  │  3 similar events in last 24h:  View all →                 │ │
│  │  • injection prod-gpt-4 @ 12:30 — same type, same model   │ │
│  │  • injection staging-gpt-4 @ 08:15 — same type            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Tab Specifications

#### Tab 1: Summary (default)

| Section | Content | Data Source |
|---------|---------|-------------|
| **Risk Breakdown** | Bar or donut chart showing score by category | `GET /events/{id}` |
| **Category Cards** | Each risk category with score, confidence, trend | `GET /events/{id}` |
| **Input Summary** | Truncated input text, hash if sensitive | `GET /events/{id}` |
| **Output Classification** | Model output risk classification | `GET /events/{id}` |

#### Tab 2: Token Heatmap

| Section | Content | Data Source |
|---------|---------|-------------|
| **Heatmap** | Visual token grid, colored by score contribution | `GET /events/{id}/explain` |
| **Token detail** | Hover: token text, contribution score, category | — |
| **Legend** | Color mapping: red (high risk) → green (safe) | — |

#### Tab 3: Raw Event

| Section | Content | Data Source |
|---------|---------|-------------|
| **JSON Viewer** | Full event payload with syntax highlighting | `GET /events/{id}` |
| **Copy** | One-click copy JSON to clipboard | — |
| **Download** | Download raw event JSON | — |

### 9.4 Timeline Component

The timeline shows the sequence of events leading up to and following the risk event. It is critical for root cause analysis.

**Event types displayed:**

| Type | Icon | Description |
|------|------|-------------|
| Risk Event | 🔴 | The investigated event |
| Similar Event | 🟡 | Related event (same model, same type) |
| Model Deploy | 🟢 | Model version deployment |
| Config Change | 🔵 | Threshold or guardrail change |
| Disposition | ⚪ | Someone took action on this event |

**Interaction:**
- Click timeline entry → navigates to that event or detail
- Scrollable for long timelines
- Zoom controls (1h, 6h, 24h, 7d)
- "Now" indicator line

### 9.5 Recommendations Panel

The recommendations panel suggests actions based on the event type and context.

| Event Type | Primary Recommendation | Secondary |
|------------|----------------------|-----------|
| Prompt injection | Block injection pattern | Create guardrail rule |
| PII leak | Flag for review | Notify data owner |
| Jailbreak | Escalate to security | Block input pattern |
| Drift | Investigate deployment | Rollback model version |

### 9.6 Same Event Group

When an event matches others (same model, risk type, pattern), they are grouped:

```
┌─── Event Group: Prompt Injection — gpt-4-prod ────────────┐
│  3 similar events in last 24h                              │
│                                                             │
│  Current: injection @ 14:22 (score: 0.94) ★                │
│  Similar: injection @ 12:30 (score: 0.87)                  │
│  Similar: injection @ 08:15 (score: 0.91)                  │
│  Similar: injection @ 06:00 (score: 0.82)                  │
│                                                             │
│  [View All] [Take Action on All]                            │
└─────────────────────────────────────────────────────────────┘
```

### 9.7 Investigation API Contract

```json
GET /api/v1/investigations/{event_id}
Response 200:
{
  "event": { /* full event detail */ },
  "explanation": {
    "token_attributions": [
      {"token": "ignore", "score": 0.45, "category": "injection"},
      {"token": "previous", "score": 0.30, "category": "injection"},
      {"token": "instructions", "score": 0.19, "category": "injection"}
    ],
    "feature_importance": {
      "input_length": 0.12,
      "special_chars": 0.08,
      "instruction_count": 0.65
    }
  },
  "timeline": [
    {"type": "deploy", "timestamp": "14:15", "detail": "v2.4.1 deployed", "model": "gpt-4-prod"},
    {"type": "event", "timestamp": "14:22", "detail": "Injection detected", "event_id": "evt_001"},
    {"type": "disposition", "timestamp": "14:23", "detail": "Blocked by Maya", "action": "block"}
  ],
  "similar_events": [
    {"id": "evt_023", "score": 0.87, "timestamp": "12:30", "status": "open"}
  ],
  "recommendations": [
    {"action": "block_pattern", "label": "Block 'ignore previous' pattern", "confidence": 0.95}
  ]
}
```

---

## 10. Analytics Module

### 10.1 Purpose

Provide trend analysis, cross-model comparisons, team-level metrics, and compliance reporting for weekly and quarterly review cycles.

### 10.2 Pages

#### Page 1: Risk Trends

| Element | Type | Description |
|---------|------|-------------|
| **Time range selector** | Tabs | 7d / 30d / 90d / Custom |
| **Risk score trend** | Line chart | Daily aggregated risk score with 7d moving average |
| **Alert volume** | Stacked bar chart | Daily alert count by severity |
| **Model breakdown** | Table | Per-model: avg risk score, alert count, change vs previous period |
| **Top risk types** | Horizontal bar | Risk type (injection, pii, drift) × event count |

**Data sources:** `GET /api/v1/analytics/trends?window=7d`

#### Page 2: Model Comparison

| Element | Type | Description |
|---------|------|-------------|
| **Model selector** | Multi-select | Choose models to compare |
| **Comparison chart** | Grouped bar | Per-model: avg risk score, alert count, drift magnitude |
| **Detail table** | Data table | Model name, env, risk score, alert count, last event, trend |

**Data sources:** `GET /api/v1/analytics/comparison?model_ids=id1,id2`

#### Page 3: Team Metrics (P1)

| Element | Type | Description |
|---------|------|-------------|
| **Team selector** | Dropdown | Choose team |
| **Team summary** | Cards | Team size, models, alert count, MTTR, risk score |
| **Team trend** | Line chart | Team's risk score over time |
| **Member activity** | Table | Member, investigations done, avg resolution time |

**Data sources:** `GET /api/v1/analytics/teams/{team_id}`

#### Page 4: Compliance Reporting (P1)

| Element | Type | Description |
|---------|------|-------------|
| **Framework selector** | Tabs | EU AI Act / SOC 2 / ISO 42001 / NIST AI RMF |
| **Compliance score** | Gauge | 0–100% compliance per framework |
| **Control checklist** | Table | Control ID, status (pass/fail/na), evidence link, last verified |
| **Report generator** | Button | "Generate PDF Report" — downloads compliance report |

**Data sources:** `GET /api/v1/analytics/compliance?framework=eu_ai_act`

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Dashboard load time (P95) | <500ms | Synthetic monitoring |
| Page navigation (P95) | <300ms | RUM |
| API response time (P95) | <200ms | Server-side metrics |
| Search results (P95) | <200ms | Server-side metrics |
| Report generation | <5s | Server-side metrics |
| Real-time alert delivery | <2s from event creation | End-to-end monitoring |
| Concurrent users | Support 1000+ per workspace | Load testing |

### 11.2 Scalability

| Requirement | Target | Notes |
|-------------|--------|-------|
| Models per workspace | 1,000+ | Horizontal scaling |
| Events per day | 10M+ | Partitioned storage |
| Audit log retention | 7 years | Warm + cold storage tiers |
| Concurrent investigations | 100+ per workspace | Stateless UI |
| Workspace members | 500+ per workspace | RBAC caching |

### 11.3 Security

| Requirement | Implementation | Priority |
|-------------|----------------|----------|
| Authentication | SSO/SAML, OAuth 2.0, API keys | P0 |
| Authorization | RBAC with 4 roles (admin, editor, viewer, compliance) | P0 |
| Data encryption | TLS 1.3 in transit, AES-256 at rest | P0 |
| Audit logging | All configuration changes logged immutably | P0 |
| Session management | 24h session with idle timeout (configurable) | P0 |
| API rate limiting | Per-workspace, per-endpoint limits | P1 |
| Secrets management | API keys stored hashed (bcrypt) | P0 |
| CSP headers | Strict Content-Security-Policy | P0 |
| CSRF protection | SameSite cookies + CSRF tokens | P0 |

### 11.4 Reliability

| Requirement | Target | Notes |
|-------------|--------|-------|
| Uptime SLA | 99.9% (8.76h downtime/year) | Cloud deployment |
| Uptime SLA (enterprise) | 99.95% (4.38h downtime/year) | Dedicated deployment |
| Error rate | <0.1% of requests | 5xx errors |
| Backup | Daily automated backups | Point-in-time recovery |
| Disaster recovery | RTO <4h, RPO <1h | Cross-region failover |
| Degraded mode | Read-only cache if backend unavailable | Dashboard shows cached data |

### 11.5 Accessibility

| Requirement | Standard | Notes |
|-------------|----------|-------|
| Color contrast | WCAG 2.1 AA (4.5:1 text, 3:1 large text) | All text and UI elements |
| Keyboard navigation | Full keyboard operability | Tab order, shortcuts, focus indicators |
| Screen reader support | ARIA labels, semantic HTML | All interactive elements |
| Reduced motion | Respect `prefers-reduced-motion` | Animations disabled |
| Font sizing | Relative units (rem/em), zoom to 200% | No fixed pixel sizes for text |

### 11.6 Auditability

| Requirement | Implementation | Notes |
|-------------|----------------|-------|
| Immutable audit log | Append-only, hash-chained | No deletes or updates |
| Actor identification | Every action attributed to user or API key | IP + user agent logged |
| Timestamp accuracy | NTP-synchronized, ISO 8601 with timezone | Sub-second precision |
| Before/after state | All configuration changes record diff | JSON patch format |
| Log retention | 7 years (configurable) | Warm storage 90 days, cold thereafter |
| Log export | CSV, JSON, signed manifest | Tamper-evident package |

---

## 12. Success Metrics

### 12.1 Product Metrics

| Metric | Definition | Target (V1 Launch) | Target (V1.3, 6mo) |
|--------|------------|---------------------|---------------------|
| **Active Workspaces** | Workspaces with >0 events in last 7d | 50 | 500 |
| **Investigations Completed** | Events with a disposition action | 1,000/week | 50,000/week |
| **Risk Events Processed** | Events ingested and scored | 1M/day | 100M/day |
| **Alert Resolution Time (MTTR)** | Median time from alert to disposition | <15 min | <5 min |
| **Dashboard Load Time** | P95 page load | <500ms | <300ms |
| **Search Success Rate** | Searches returning results | >95% | >99% |
| **API Uptime** | 200 status for health endpoint | 99.9% | 99.95% |

### 12.2 Business Metrics

| Metric | Definition | Target (6mo) | Target (12mo) |
|--------|------------|--------------|---------------|
| **Net Revenue Retention** | NRR (expansion + contraction) | 120% | 130% |
| **Monthly Retention** | % paying workspaces active | 95% | 98% |
| **Activation Rate** | % signups with model registered in 7d | 60% | 80% |
| **Time to Value** | First alert from registration | <5 min | <2 min |
| **NPS** | User satisfaction | >30 | >50 |
| **Expansion Rate** | % workspaces adding models MoM | 20% | 30% |
| **Enterprise Deal Size** | Average ACV for >500 seat deals | $40K | $100K |

### 12.3 Signal Detection

**Leading indicators that predict retention:**
- Team member completes investigation within first 7 days
- At least 2 models registered per workspace
- At least 1 policy created within first 14 days
- Dashboard viewed >3 times/week by non-admin user

**Leading indicators that predict churn:**
- No events processed in 7 days
- No logins in 14 days
- Dashboard viewed 0 times in 7 days
- Support ticket with "confusing" or "too complex" language

---

## 13. Future Vision

### 13.1 6 Months: Platform Maturity

**Theme:** Depth over breadth — double down on investigation and compliance.

**Ship:**
- Analytics module (trends, model comparison, compliance reporting)
- SIEM integrations (Splunk, Elastic)
- Policy templates and dry-run validation
- Compliance report templates (EU AI Act, SOC 2, ISO 42001)
- Mobile-optimized dashboard for executives
- Automated weekly executive email digest
- SCIM provisioning for large enterprises

**Metrics target:**
- 500 active workspaces
- 50M events/day
- 10 enterprise customers >$50K ACV

### 13.2 12 Months: Platform Expansion

**Theme:** Breadth — enter new segments and use cases.

**Ship:**
- Multi-step policies (AND/OR conditions)
- Custom dashboard widgets
- STIX/TAXII threat intel export
- 21 CFR Part 11 compliance mode (pharma)
- Custom branding / white-label
- Usage-based billing metering
- Public API marketplace (community integrations)
- AI assistant for investigation (natural language query)
- Self-hosted / on-prem deployment option

**Market expansion:**
- Financial services (regulatory focus)
- Healthcare / Pharma (HIPAA + 21 CFR Part 11)
- Government / Defense (on-prem + air-gapped)

**Metrics target:**
- 2,000 active workspaces
- 500M events/day
- 50 enterprise customers >$100K ACV
- SOC 2 Type II certified
- ISO 42001 certified

### 13.3 24 Months: Platform Dominance

**Theme:** Category creation — SentinelAI becomes the standard for AI risk.

**Ship:**
- Multi-modal risk detection (vision, audio, code models)
- Real-time agent monitoring (autonomous AI agent observability)
- AI risk benchmarking (industry peer comparison)
- Automated compliance evidence collection (continuous audit)
- AI risk marketplace (third-party risk models, data sources)
- Root cause prediction (ML models predicting incidents before they happen)
- Federated workspace (cross-org risk aggregation)

**Market position:**
- Category-defining product for AI Risk Monitoring
- 10,000+ active workspaces
- $50M+ ARR
- Named in Gartner Hype Cycle for AI Governance
- SOC 2 Type II + ISO 42001 + FedRAMP authorized

---

## 14. Acceptance Criteria

### 14.1 Dashboard

| ID | Criterion | Verification |
|----|-----------|--------------|
| DASH-01 | Dashboard loads in <500ms (P95) for 50 models | Synthetic monitoring test |
| DASH-02 | Health score correctly reflects last 24h of data | Integration test with known data |
| DASH-03 | Health score color changes at correct thresholds (80, 50) | Unit test |
| DASH-04 | Active alerts count matches events API | Integration test |
| DASH-05 | Top risks list shows max 3 items with "View All" link | Visual regression test |
| DASH-06 | 7-day trend chart renders with correct data | Integration test |
| DASH-07 | Recently resolved shows last 5 items | Integration test |
| DASH-08 | Clicking any widget navigates to correct page | E2E test |
| DASH-09 | Empty state shows when no models registered | E2E test |
| DASH-10 | Error state shows when API fails | E2E test with mock failure |
| DASH-11 | Loading state shows skeleton for each widget | Visual regression test |
| DASH-12 | Role-adaptive defaults load correctly for each role | E2E test (4 role logins) |
| DASH-13 | Dashboard URL is shareable (all filters in URL) | E2E test |

### 14.2 Risk Events

| ID | Criterion | Verification |
|----|-----------|--------------|
| EVT-01 | Event list loads <300ms for 100 events | Synthetic monitoring |
| EVT-02 | Filtering by severity returns correct subset | Integration test |
| EVT-03 | Filtering by risk type returns correct subset | Integration test |
| EVT-04 | Filtering by model returns correct subset | Integration test |
| EVT-05 | Filtering by time range returns correct subset | Integration test |
| EVT-06 | Search by event ID returns exact match | E2E test |
| EVT-07 | Search by input text returns matching events | E2E test |
| EVT-08 | Event detail shows risk breakdown chart | Visual regression |
| EVT-09 | Event detail shows token attribution | Integration test |
| EVT-10 | Block action creates blocklist entry + confirmation toast | E2E test |
| EVT-11 | Escalate action creates Jira ticket (via integration) | Integration test |
| EVT-12 | Mark as FP sends feedback to model | Integration test |
| EVT-13 | Dismiss action with reason code persists | E2E test |
| EVT-14 | Evidence export returns downloadable JSON | E2E test |
| EVT-15 | Filters persist in URL for bookmarking | E2E test |
| EVT-16 | Pagination works correctly (next/prev, page numbers) | E2E test |

### 14.3 Investigations

| ID | Criterion | Verification |
|----|-----------|--------------|
| INV-01 | Investigation page loads event detail + explanation + timeline | Integration test |
| INV-02 | Timeline shows correct sequence of events | Integration test |
| INV-03 | Token heatmap renders with correct colors per contribution | Visual test |
| INV-04 | Token hover tooltip shows token + score + category | E2E test |
| INV-05 | Recommendations panel shows contextually relevant actions | Integration test |
| INV-06 | Similar events list shows correct matches | Integration test |
| INV-07 | Summary tab is selected by default | E2E test |
| INV-08 | Token Heatmap tab loads explanation data | E2E test |
| INV-09 | Raw Event tab shows formatted JSON | E2E test |
| INV-10 | Copy JSON button copies to clipboard | E2E test |
| INV-11 | Download raw event downloads file | E2E test |
| INV-12 | Export evidence creates downloadable package | E2E test |

### 14.4 Models

| ID | Criterion | Verification |
|----|-----------|--------------|
| MOD-01 | Model list loads <300ms for 50 models | Synthetic monitoring |
| MOD-02 | Each model card shows name, risk score, alert count | Visual regression |
| MOD-03 | Registration form validates required fields | E2E test |
| MOD-04 | Registration validates endpoint connectivity | Integration test |
| MOD-05 | Model detail shows 4 tabs (Alerts, Baselines, Guardrails, Audit) | E2E test |
| MOD-06 | Alerts tab shows model-scoped events | Integration test |
| MOD-07 | Baselines tab shows current thresholds + drift history | Integration test |
| MOD-08 | Guardrails tab shows active policies for this model | Integration test |
| MOD-09 | Model edit saves changes | E2E test |
| MOD-10 | Model delete is soft delete with confirmation dialog | E2E test |

### 14.5 Audit Logs

| ID | Criterion | Verification |
|----|-----------|--------------|
| AUD-01 | Audit log loads entries in reverse chronological order | Integration test |
| AUD-02 | Filtering by actor returns correct subset | Integration test |
| AUD-03 | Filtering by action type returns correct subset | Integration test |
| AUD-04 | Filtering by date range returns correct subset | Integration test |
| AUD-05 | Entry detail shows before/after state diff | Integration test |
| AUD-06 | Integrity verification confirms chain is valid | Integration test |
| AUD-07 | Export CSV includes all visible entries | E2E test |
| AUD-08 | No action in UI deletes or edits audit entries | Security test |

### 14.6 Policies

| ID | Criterion | Verification |
|----|-----------|--------------|
| POL-01 | Policy list shows all rules with status indicator | Integration test |
| POL-02 | Rule builder allows IF condition configuration | E2E test |
| POL-03 | Rule builder allows THEN action selection | E2E test |
| POL-04 | Rule builder allows model/environment scoping | E2E test |
| POL-05 | Preview shows estimated historical matches | Integration test |
| POL-06 | Dry run against history returns correct match count | Integration test |
| POL-07 | Policy save creates audit log entry | Integration test |
| POL-08 | Policy takes effect within 30 seconds | Integration test |
| POL-09 | Enable/disable toggle works immediately | E2E test |
| POL-10 | Delete confirmation prevents accidental removal | E2E test |

### 14.7 Settings

| ID | Criterion | Verification |
|----|-----------|--------------|
| SET-01 | Workspace name can be updated | E2E test |
| SET-02 | Integration setup validates connectivity | Integration test |
| SET-03 | Integration health status is displayed | API integration test |
| SET-04 | SSO configuration accepts IdP metadata XML | E2E test |
| SET-05 | API key generation creates key with description | E2E test |
| SET-06 | API key revocation immediately invalidates key | Security test |
| SET-07 | All settings changes are logged in audit | Integration test |

### 14.8 Team Management

| ID | Criterion | Verification |
|----|-----------|--------------|
| TMM-01 | Member list shows all workspace members | Integration test |
| TMM-02 | Invite sends email with activation link | E2E test |
| TMM-03 | Role change takes effect immediately | Integration test |
| TMM-04 | Viewer role cannot edit models or policies | E2E test |
| TMM-05 | Compliance role sees audit and reports but not policies | E2E test |
| TMM-06 | Admin can remove members | E2E test |
| TMM-07 | Cannot remove last admin | E2E test |

### 14.9 Global

| ID | Criterion | Verification |
|----|-----------|--------------|
| GBL-01 | Cmd+K search finds models, events, policies, settings | E2E test |
| GBL-02 | Keyboard navigation works for all interactive elements | Accessibility audit |
| GBL-03 | Color contrast meets WCAG AA (4.5:1) | Automated audit |
| GBL-04 | Screen reader announces dynamic content changes | Accessibility audit |
| GBL-05 | Responsive layout works at 1280px, 1024px, 768px | Visual regression |
| GBL-06 | All API calls include authentication header | Security test |
| GBL-07 | Session expires after 24h inactivity | Security test |
| GBL-08 | Error boundary catches React errors without white screen | E2E test |

---

## 15. Open Questions

| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| 1 | Do we need a public API-first product (no dashboard) for enterprise resale? | PM | V1.0 |
| 2 | What is the pricing model — per-event, per-model, per-user, or hybrid? | PM + Finance | V1.0 |
| 3 | Should the compliance report format be customizable per framework? | Design + PM | V1.1 |
| 4 | What is the maximum event retention for non-enterprise tiers? | Engineering | V1.0 |
| 5 | Do we need a desktop/mobile native app or is PWA sufficient? | Design | V1.1 |
| 6 | Should investigations support collaborative real-time viewing? | Design + Engineering | V1.2 |
| 7 | What is the SLA for on-prem deployments vs cloud? | Engineering + Sales | V1.0 |

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-22 | Principal PM | Initial PRD |

---

*This document should be read alongside:*
- *UX Research Document (`Docs/ux-research-sentinelai.md`)*
- *Design system specification*
- *API contract documentation*
- *Architecture decision records (ADRs)*
