# SentinelAI — UX Research Document

**Product:** AI Risk Monitoring & Observability Platform
**Category:** AI Security / ML Observability
**Audience:** Engineering & Design teams
**Status:** Production-ready v1.0
**Author:** Staff Product Designer (ex-Datadog, ex-CrowdStrike)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Personas](#2-user-personas)
3. [Jobs-to-Be-Done](#3-jobs-to-be-done)
4. [Pain Points & Friction Map](#4-pain-points--friction-map)
5. [Decision Workflows](#5-decision-workflows)
6. [Information Architecture](#6-information-architecture)
7. [Dashboard Narrative](#7-dashboard-narrative)
8. [Visual Hierarchy](#8-visual-hierarchy)
9. [UX Writing Guidelines](#9-ux-writing-guidelines)
10. [Enterprise Trust Signals](#10-enterprise-trust-signals)
11. [Competitive Landscape](#11-competitive-landscape)
12. [Usability Test Plan](#12-usability-test-plan)
13. [Design Principles](#13-design-principles)
14. [Appendix: Research Methodology](#14-appendix-research-methodology)

---

## 1. Executive Summary

### 1.1 The Opportunity

AI adoption in enterprises is accelerating faster than governance. Organizations deploying LLMs, embedding models, and agentic systems lack a unified view of:
- **Security risk:** Prompt injections, data exfiltration, jailbreak attempts
- **Operational risk:** Drift, performance degradation, cost spikes
- **Compliance risk:** Audit trails, explainability, policy violations

SentinelAI sits at the intersection of **Datadog** (observability) and **CrowdStrike** (security) for the AI stack. The market is nascent, fragmented, and desperate for a single pane of glass.

### 1.2 Key Research Themes

| Theme | Finding | Impact |
|-------|---------|--------|
| Trust deficit | Teams don't trust black-box AI risk scores | Explainable decisions are non-negotiable |
| Role divergence | AI engineers and compliance officers share a tool but not a worldview | IA must support two distinct mental models |
| Alert fatigue | Current tools blast raw signals without context | Narrative-driven dashboards win |
| Procurement pressure | CTOs demand SOC 2 + penetration tests before any POC | Trust signals must be front-and-center |
| Workflow fragmentation | Engineers context-switch between IDE, Slack, monitoring, and compliance tools | Integrations are table stakes |

### 1.3 Design Mandate

> **"Make the invisible visible, the complex comprehensible, and the risky actionable."**

SentinelAI must:
- Surface AI risk signals with **context, not noise**
- Serve **divergent personas** without compromising depth
- Earn trust through **transparency**, not marketing
- Scale from a single model to a fleet of AI systems

---

## 2. User Personas

### 2.1 Persona A: Maya — The AI Engineer

*"I need to ship models fast without getting paged at 2 AM because something I couldn't see went wrong."*

| Attribute | Detail |
|-----------|--------|
| **Role** | ML Engineer / AI Engineer / Applied Scientist |
| **Age** | 28–38 |
| **Background** | CS/ML degree, 4–10 YOE, Python/ PyTorch/ LangChain |
| **Technical level** | Expert |
| **Usage frequency** | Daily, multiple sessions |
| **Primary device** | Desktop (terminal + browser) |
| **Tools** | VS Code, Jupyter, Slack, PagerDuty, Datadog, Weights & Biases, GitHub |

**Psychographics:**
- **Motivations:** Shipping velocity, debugging confidence, performance optimization
- **Values:** Transparency, control, automation, minimal friction
- **Attitude:** Skeptical of "AI for AI" tooling — needs raw data, not spin
- **Frustration threshold:** Low — will abandon tools that slow them down

**Goals:**
1. Detect prompt injections and adversarial inputs in real time
2. Understand *why* a model produced a risky output (not just *that* it did)
3. Monitor input/output drift across model versions
4. Debug false positives without clicking through 5 screens
5. Set up automated responses (block, flag, throttle, alert)

**Frustrations:**
- Existing tools show a risk score with zero explanation ("great, a 0.87 — now what?")
- Alert fatigue: 200 alerts/hour with no prioritization
- No way to correlate a deployment change with a risk spike
- Context switching between monitoring, logging, and model registry

**Design implications:**
→ Show raw log-likelihoods, token-level explanations, and threshold configs
→ One-click drill-down from dashboard → raw event → token heatmap
→ Slack-native notifications with severity + first suggested action
→ API-first: every UI action must have a corresponding API call

**Quote:** *"I don't need a pretty chart. I need to know if someone just jailbroke my production model."*

---

### 2.2 Persona B: Priya — The Security Analyst

*"I can't secure what I can't see. AI is a black box, and that terrifies me."*

| Attribute | Detail |
|-----------|--------|
| **Role** | SOC Analyst / Security Engineer / AppSec Manager |
| **Age** | 30–45 |
| **Background** | Security (CISSP, CEH), may not know ML internals |
| **Technical level** | Intermediate–Advanced |
| **Usage frequency** | Daily, shift-based |
| **Primary device** | Desktop (SIEM console, browser) |
| **Tools** | Splunk, CrowdStrike Falcon, Jira, Slack, PagerDuty, TheHive |

**Psychographics:**
- **Motivations:** Threat detection, incident response, attack chain visibility
- **Values:** Precision, repeatability, evidence, playbooks
- **Attitude:** Risk-averse, process-driven, needs escalation paths
- **Frustration threshold:** Medium — willing to learn if the tool earns trust

**Goals:**
1. Triage AI security alerts alongside traditional SOC alerts
2. Investigate prompt injection attempts with full context
3. Correlate AI incidents with other security events
4. Generate evidence packages for incident reports
5. Build detection rules and response playbooks

**Frustrations:**
- No correlation between AI risk events and traditional security signals
- Can't export evidence in formats auditors accept (PDF, CSV, JSON)
- Explainability is too technical — token-level heatmaps mean nothing to a SOC analyst
- No concept of "normal" — false positives are impossible to tune without baselines

**Design implications:**
→ Present AI threats in kill-chain format (recon → injection → exfiltration)
→ One-click evidence package generation (with timestamps, payloads, risk scores)
→ SIEM integration (Splunk, Elastic) as a first-class feature, not an afterthought
→ Baseline engine that learns "normal" per model per environment

**Quote:** *"I need to show my incident commander exactly what happened, when, and why — in a format they can sign off on."*

---

### 2.3 Persona C: David — The Compliance Officer

*"The EU AI Act is coming, and I need proof we're compliant — not promises."*

| Attribute | Detail |
|-----------|--------|
| **Role** | Compliance Officer / GRC Manager / Data Protection Officer |
| **Age** | 35–55 |
| **Background** | Legal/Compliance (CIPP, CIPM), non-technical |
| **Technical level** | Low–Intermediate |
| **Usage frequency** | Weekly/monthly |
| **Primary device** | Desktop (browser) |
| **Tools** | Jira, Confluence, GRC platform (OneTrust, LogicGate), Excel, email |

**Psychographics:**
- **Motivations:** Audit readiness, regulatory compliance, risk reduction
- **Values:** Documentation, provenance, access control, immutability
- **Attitude:** Cautious — every feature is evaluated through "will this cause a finding?"
- **Frustration threshold:** High — will put up with bad UX if compliance works

**Goals:**
1. Generate audit-ready reports showing AI system risk posture
2. Prove that AI decisions are explainable and traceable
3. Demonstrate compliance with EU AI Act, NIST AI RMF, ISO 42001
4. Manage access controls and workspace isolation
5. Review aggregated risk trends across the organization

**Frustrations:**
- Technical dashboards are impenetrable — no compliance-friendly views
- No out-of-the-box compliance report templates
- Audit logs are buried or incomplete
- Can't freeze/baseline a configuration for audit periods
- No RBAC granular enough for multi-tenant compliance

**Design implications:**
→ "Compliance mode" view that surfaces only audit-relevant data
→ Pre-built report templates for EU AI Act, NIST AI RMF, SOC 2, ISO 42001
→ Immutable audit log with tamper-evident timestamps
→ Snapshot/baseline freeze that locks configuration for audit periods
→ Role-based workspace isolation with cross-account visibility controls

**Quote:** *"I don't care about the token-level details. I care that the system can prove it's in control."*

---

### 2.4 Persona D: Marcus — The CTO / VP Engineering

*"I need to know if AI is a liability or an asset — and I need to sleep at night."*

| Attribute | Detail |
|-----------|--------|
| **Role** | CTO / VP Engineering / Head of AI Platform |
| **Age** | 40–55 |
| **Background** | Engineering leadership, 15+ YOE |
| **Technical level** | High-level technical |
| **Usage frequency** | Weekly / on-demand |
| **Primary device** | Desktop (browser), mobile |
| **Tools** | Email, Slack, board deck tools, executive dashboards |

**Psychographics:**
- **Motivations:** Risk management, investment ROI, team velocity, board confidence
- **Values:** Stability, cost efficiency, defensibility, compliance
- **Attitude:** Delegates deep dives but wants the headline and the escape hatch
- **Frustration threshold:** Very low — needs answers in seconds

**Goals:**
1. Understand overall AI risk posture at a glance
2. Identify trends before they become incidents
3. Justify AI investment to the board with risk-adjusted metrics
4. Ensure compliance requirements are met without blocking innovation
5. Compare risk across teams, models, and environments

**Frustrations:**
- Dashboards are built for engineers — too much noise, not enough signal
- No single-number health score for AI risk
- Can't slice risk by team/budget/environment for cost allocation
- No mobile view for after-hours check-ins
- Reports are manual — spends hours prepping board slides

**Design implications:**
→ Executive summary view: single risk score + 3 key trends + top 3 actions
→ Mobile-optimized risk-at-a-glance dashboard
→ Configurable risk appetite sliders (aggressive → conservative)
→ Automated weekly/monthly PDF report generation
→ Team-level risk comparison with budget context

**Quote:** *"Give me one number that tells me if I should be worried — and tell me what to do about it."*

---

### Persona Comparison Matrix

| Dimension | Maya (Engineer) | Priya (Security) | David (Compliance) | Marcus (CTO) |
|-----------|-----------------|------------------|---------------------|--------------|
| **Mental model** | Debugging | Triage | Audit | Trends |
| **Time horizon** | Real-time | Shift-based | Quarterly | Quarterly |
| **Primary question** | What broke? | Is this an attack? | Are we compliant? | Are we safe? |
| **Data depth needed** | Raw (tokens, scores) | Contextual (kill chain) | Summary (reports) | Aggregate (trends) |
| **Action** | Fix | Respond | Document | Decide |
| **Session length** | 10–40 min | 15–30 min | 30–60 min | 3–10 min |
| **Key metric** | Precision/Recall | MTTR | % Compliant | Risk Score |

---

## 3. Jobs-to-Be-Done

### 3.1 Primary JTBD

**JTBD 1: "Monitor my AI systems for risk without getting paged for noise."**
- *When*: Deploying or running production AI
- *Wants*: Real-time risk signals, prioritized, contextualized
- *Pain*: Current tools dump raw scores — no triage, no correlation
- *Success*: Sebastian sees a critical alert, understands it in 10 seconds, acts in 30

**JTBD 2: "Prove to auditors that my AI systems are controlled."**
- *When*: Annual audit, regulatory filing, or post-incident review
- *Wants*: Immutable logs, explainability trails, compliance reports
- *Pain*: Manual evidence collection, no tamper-evident logs, scattered data
- *Success*: David exports a complete audit package in 5 minutes

**JTBD 3: "Investigate why a model produced a dangerous output."**
- *When*: After a risky output is detected
- *Wants*: Full trace from input → model decision → risk score → output
- *Pain*: Black-box risk scores with no provenance, no lineage
- *Success*: Priya reconstructs a prompt injection attack in under 60 seconds

**JTBD 4: "Set guardrails so AI can't drift into unsafe territory."**
- *When*: During model deployment or after detecting drift
- *Wants*: Configurable baselines, drift detection, automated enforcement
- *Pain*: Manual monitoring, reactive (not proactive), no policy engine
- *Success*: Maya deploys a model with auto-rollback on drift beyond threshold

**JTBD 5: "See the big picture — am I winning or losing on AI risk?"**
- *When*: Weekly exec review, board prep, or quarterly planning
- *Wants*: One-number health score with trend, top risks, recommended actions
- *Pain*: Spreadsheets, manual aggregation, no AI-specific risk metrics
- *Success*: Marcus opens SentinelAI, gets the answer in 5 seconds

### 3.2 Secondary JTBD

| JTBD | Persona | Frequency | Current Workaround |
|------|---------|-----------|--------------------|
| Estimate cost of AI risk (budget for incidents) | Marcus | Quarterly | Manual spreadsheet |
| Triage alerts in Slack without opening dashboard | Maya, Priya | Daily | Slack + manual lookup |
| Onboard a new model to monitoring | Maya | Weekly | Custom scripts |
| Generate SOC 2 evidence for AI controls | David | Monthly | Manual screenshots |
| Compare risk across development vs production | Maya, Marcus | Weekly | Multiple tabs |

### 3.3 JTBD Opportunity Matrix

```
                    UNDERSERVED ←──────────→ OVER-SERVED
                         │                       │
    HIGH IMPORTANCE      │                       │
          │              │  JTBD 2 (Compliance)  │
          │              │  JTBD 3 (Investigate) │
          │              │  JTBD 4 (Guardrails)  │
          │              │                       │
          │              │  JTBD 1 (Monitor)     │
          │              │                       │
    LOW IMPORTANCE       │  JTBD 5 (Big Picture) │
          │              │                       │
                         │                       │
```

**Insight:** JTBD 2 (compliance) and JTBD 3 (investigation) are the most underserved and most important. These are SentinelAI's differentiators. JTBD 1 (monitoring) is table stakes — must be solid but won't win the market alone.

---

## 4. Pain Points & Friction Map

### 4.1 Usability Pain Points (Current State)

| # | Pain Point | Persona | Severity | Frequency | Design Opportunity |
|---|------------|---------|----------|-----------|-------------------|
| 1 | Risk scores without explanation | All | Critical | Every alert | Show token contribution, feature attribution, likelihood surface |
| 2 | No "normal" baseline — massive FP rate | Maya, Priya | Critical | Daily | Baseline engine with 7-day auto-learn + configurable sensitivity |
| 3 | No compliance-ready export | David | Critical | Weekly | One-click audit package (PDF, CSV, JSON) per model/per period |
| 4 | Engineers can't set automated responses | Maya | Major | Weekly | Rule builder: IF [condition] THEN [action] (block/alert/flag) |
| 5 | No correlation with security stack | Priya | Major | Daily | SIEM webhook, Syslog, STIX/TAXII export |
| 6 | Executive dashboard is useless | Marcus | Major | Weekly | Health score + 3-trend + 3-action view |
| 7 | Multi-workspace navigation is painful | All | Minor | Daily | Global search + workspace switcher + favorites |
| 8 | Alert payloads are too verbose | Maya, Priya | Moderate | Hourly | Three-level alert detail: summary, standard, forensic |
| 9 | No mobile view | Marcus | Moderate | Weekly | Critical alerts + health score on mobile |
| 10 | Settings spread across 4+ pages | All | Minor | Monthly | Unified settings hub with search |

### 4.2 Cognitive Friction Points

| Friction | Where | Effect | Fix |
|----------|-------|--------|-----|
| Security and compliance views mixed together | Risk dashboard | David can't find compliance data | Role-based views + tabs |
| Token heatmaps shown to non-technical users | Investigation | Priya/David overwhelmed | Role-adaptive detail levels |
| Alert severity not tied to business impact | Alerts | Marcus ignores alerts | Severity = technical × business impact |
| No undo on configuration changes | Settings | Maya afraid to change thresholds | Change history + 30-second rollback |
| Search doesn't cover all resource types | Global nav | Everyone frustrated | Unified search index (models, alerts, logs, settings) |

### 4.3 Pain Point Priority (RICE)

| Pain Point | Reach | Impact | Confidence | Effort | RICE Score |
|------------|-------|--------|------------|--------|------------|
| Explainability (no explanation) | 100% | 5 | 100% | 5 | 100 |
| Baselines (false positives) | 80% | 5 | 90% | 4 | 90 |
| Compliance export | 40% | 5 | 100% | 2 | 100 |
| Automated responses | 70% | 4 | 80% | 3 | 75 |
| SIEM correlation | 50% | 4 | 90% | 4 | 45 |

**Priority order for engineering:** Explainability → Baselines → Compliance export → Automated responses → SIEM correlation

---

## 5. Decision Workflows

### 5.1 Workflow: Investigate a Risk Alert

**Trigger:** Critical alert received (Slack, email, dashboard)

```
STEP 1: TRIAGE (5–10 seconds)
┌─────────────────────────────────────────────────────┐
│ Alert card shows:                                   │
│ • Severity: CRITICAL                                │
│ • Model: gpt-4-prod                                 │
│ • Risk type: Prompt Injection                        │
│ • Score: 0.94                                       │
│ • Timestamp: 3 min ago                              │
│ • Quick actions: [View] [Mute] [Escalate]           │
└─────────────────────────────────────────────────────┘

STEP 2: DIAGNOSE (30–60 seconds)
┌─────────────────────────────────────────────────────┐
│ Drill-down view:                                    │
│ • Input fingerprint (truncated + hash if sensitive) │
│ • Output risk breakdown (category scores)           │
│ • Token-level heatmap: which tokens triggered risk  │
│ • Similar alerts in last 24h                        │
│ • Baseline comparison: how far from normal          │
└─────────────────────────────────────────────────────┘

STEP 3: DECIDE (15–30 seconds)
┌─────────────────────────────────────────────────────┐
│ Decision actions:                                    │
│ [Block Future] — add pattern to blocklist           │
│ [Flag] — tag for review, no action needed yet       │
│ [Escalate] — create Jira ticket + Slack ping        │
│ [False Positive] — feedback + model retune          │
└─────────────────────────────────────────────────────┘

STEP 4: RESOLVE (optional, 2–5 minutes)
┌─────────────────────────────────────────────────────┐
│ If Escalated:                                       │
│ • Auto-fills ticket with: alert data, stack trace,  │
│   timeline, similar events                          │
│ • Assigns to on-call engineer                       │
│ • Creates Slack thread with stakeholders            │
└─────────────────────────────────────────────────────┘
```

### 5.2 Workflow: Compliance Audit Prep

**Trigger:** Upcoming audit (SOC 2, EU AI Act, ISO 42001)

```
STEP 1: SELECT SCOPE
┌─────────────────────────────────────────────────────┐
│ Select:                                             │
│ • Model(s) or workspace(s)                          │
│ • Date range (e.g., last quarter)                   │
│ • Framework (EU AI Act, SOC 2, ISO 42001, NIST)    │
└─────────────────────────────────────────────────────┘

STEP 2: SYSTEM CHECKS (auto-run)
┌─────────────────────────────────────────────────────┐
│ Automated compliance checks:                        │
│ ✓ Audit trail enabled for all models               │
─── ✓ Explainability logging active (98%) ─── ⚠️ │
─── ✗ Baseline frozen for period ─── [FIX]        │
─── ✓ RBAC matches org chart                         │
─── ✓ Alert threshold documentation exists            │
└─────────────────────────────────────────────────────┘

STEP 3: GENERATE REPORT
┌─────────────────────────────────────────────────────┐
│ One-click report:                                   │
│ • Executive summary (1 page)                        │
│ • Risk heat map by model/environment                │
│ • All alerts with disposition history               │
│ • Configuration snapshots (before/after period)     │
│ • Evidence package (JSON + signed manifest)         │
└─────────────────────────────────────────────────────┘

STEP 4: EXPORT & SUBMIT
┌─────────────────────────────────────────────────────┐
│ Export options:                                     │
│ • PDF (auditor-ready, branded)                      │
│ • CSV (data only, for merging)                      │
│ • JSON + signing manifest (tamper-evident)          │
│ • Direct to GRC platform (OneTrust/Lightning)       │
└─────────────────────────────────────────────────────┘
```

### 5.3 Workflow: Set Up a New Model

**Trigger:** Deploying a new model version

```
STEP 1: REGISTER MODEL
Name → Version → Provider → Endpoint → Environment

STEP 2: CONFIGURE BASELINE
Auto-learn mode: [ON] / Duration: [7 days]
Or manual thresholds: [Upload config]

STEP 3: SET GUARDRAILS
┌─────────────────────────────────────────────────────┐
│ Guardrail rules:                                    │
│ • IF injection_score > 0.9 THEN block               │
│ • IF drift > 2σ THEN alert + rollback               │
│ • IF output contains PII THEN flag + notify         │
└─────────────────────────────────────────────────────┘

STEP 4: CONFIGURE WORKSPACE & ACCESS
Workspace → Team → Environment → Role assignments

STEP 5: VERIFY & SHIP
Test alert → Review dashboard → Enable production
```

### 5.4 Decision Workflow Patterns by Persona

| Phase | Maya (Engineer) | Priya (Security) | David (Compliance) | Marcus (CTO) |
|-------|-----------------|------------------|---------------------|--------------|
| **Detect** | Dashboard + API | SIEM + Dashboard | Email digest | Mobile alert |
| **Triage** | Severity × context | Kill chain stage | Compliance impact | Business impact |
| **Investigate** | Token heatmap, logs | Evidence package | Report viewer | Trends view |
| **Act** | Modify config, blocklist | Escalate, create case | Archive, document | Delegate, approve |
| **Verify** | Re-test, watch dashboard | Confirm resolution | Review closure | Review trend |

---

## 6. Information Architecture

### 6.1 Navigation Structure

```
Dashboard (/)                          ← Risk at a glance, role-adaptive
├── Risk Overview                      ← Health score + trend + top alerts
├── Quick Actions                      ← Recent models, pending reviews
└── Alerts Feed                        ← Real-time stream (collapsible)

Models (/models)                       ← Model registry & monitoring
├── Model Detail                       ← Per-model risk, drift, usage
│   ├── Alerts                         ← Alerts for this model
│   ├── Baselines                      ← Baseline config + drift history
│   ├── Guardrails                     └── Active rules
│   └── Audit Log                      ← Immutable event log

Alerts (/alerts)                       ← Alert triage center
├── Inbox                              ← Active alerts (filterable)
├── History                            ← Resolved alerts
└── Rules                              ← Alert rule configuration

Investigate (/investigate)             ← Deep-dive investigation
├── Event Viewer                       ← Raw event with risk breakdown
├── Token Heatmap                      ← Token-level contribution
└── Timeline                          ← Event + model + deployment timeline

Compliance (/compliance)               ← Audit & compliance
├── Reports                            ← Pre-built + custom reports
├── Audit Log                          ← Tamper-evident log explorer
├── Frameworks                         ← Framework mapping (EU AI Act, etc.)
└── Evidence Packages                  ← Exportable evidence bundles

Settings (/settings)
├── Workspaces                         ← Multi-tenant management
├── Teams & Access                     ← RBAC, SSO, SCIM
├── Integrations                       ← Slack, PagerDuty, SIEM, Jira
├── Baselines                          ← Global baseline configuration
└── Billing                            ← Plan & usage

Search (Cmd+K)                         ← Unified search
Profile (avatar)                       ← Account, preferences, theme
Help (?)                               ← Docs, changelog, status
```

### 6.2 Global Navigation — Priority Order

| Position | Item | Rationale |
|----------|------|-----------|
| L1 | Dashboard | Home — everyone starts here |
| L2 | Models | The objects being monitored |
| L3 | Alerts | The primary action surface |
| L4 | Investigate | Deep-dive when needed |
| L5 | Compliance | Periodic but critical |
| R1 | Search (Cmd+K) | Power user navigation |
| R2 | Profile/Settings | Personal config |

### 6.3 Object Model

```
Workspace
├── Model
│   ├── Version (immutable)
│   │   ├── Baseline
│   │   │   ├── Thresholds
│   │   │   └── Drift History
│   │   ├── Guardrails (rules)
│   │   ├── Alert
│   │   │   ├── Event
│   │   │   └── Disposition
│   │   └── Audit Log Entry
│   └── Configuration
├── Team
│   └── User
│       └── Role (admin, editor, viewer, compliance)
└── Integration (Slack, SIEM, PagerDuty, Jira)
```

### 6.4 IA Design Principles

1. **One object, one canonical location.** A model's alerts are on the model detail page AND in the global alerts inbox. Never two inconsistent views.
2. **Progressive disclosure by persona.** The engineer sees token heatmaps; the compliance officer sees audit summary. Same data, different lenses.
3. **Three-click rule.** Any piece of data reachable in ≤3 clicks from dashboard.
4. **Search is primary navigation.** Cmd+K must find models, alerts, rules, settings, and people.
5. **Workspace as boundary.** All data is scoped to workspace. Cross-workspace views are explicit opt-in.

---

## 7. Dashboard Narrative

### 7.1 The Story Arc

The dashboard should answer three questions in order:

> **1. Should I be worried?** → **2. What should I do?** → **3. How are we trending?**

```
┌─────────────────────────────────────────────────────────────┐
│                      SENTINELAI DASHBOARD                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [HEALTH SCORE]  ████████████░░░  84/100  ↑2 from last wk  │
│  "Your AI risk posture is healthy. 2 items need attention." │
│                                                             │
├──────────────────────────────┬──────────────────────────────┤
│  TOP RISKS                   │  ACTIVE ALERTS               │
│                              │                              │
│  ┌────────────────────────┐  │  ● Critical   Injection   2m │
│  │ 1. Prompt injection    │  │  ● WARNING    PII Leak    15m│
│  │    spike in prod-gpt-4 │  │  ○ INFO       Drift       1h │
│  │    ↑ 340% in 24h       │  │                              │
│  └────────────────────────┘  │  [View All →]                │
│                              │                              │
│  ┌────────────────────────┐  ├──────────────────────────────┤
│  │ 2. Drift detected in   │  │  TREND (7d)                  │
│  │    embeddings-v2       │  │                              │
│  │    1.8σ above baseline │  │  ╱╲    ╱╲  Risk Score       │
│  └────────────────────────┘  │ ╱  ╲  ╱  ╲                  │
│                              │╱    ╲╱    ╲                 │
│  [Review All Risks →]       │ M T W T F S S               │
│                              │                              │
├──────────────────────────────┴──────────────────────────────┤
│  RECENTLY RESOLVED                     OPEN INCIDENTS: 3    │
│  ✓ PII leak — blocked @ 14:22         AVG MTTR: 12m        │
│  ✓ Rate limit — resolved @ 12:10                            │
│  ✓ Config drift — reverted @ 09:45                          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Narrative by Persona

| Persona | Default View | Headline Metric | Secondary |
|---------|-------------|-----------------|-----------|
| Maya (Engineer) | Alert feed + model list | Active critical alerts | Injection rate, latency |
| Priya (Security) | Alert inbox + kill chain | Unresolved incidents | Blocked vs allowed ratio |
| David (Compliance) | Compliance score + checklist | % Framework compliant | Audit coverage, last report |
| Marcus (CTO) | Health score + trends | Risk health score (0–100) | Trend, top 3 risks, MTTR |

### 7.3 Empty State Narrative

Before any models are registered:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🛡️ Welcome to SentinelAI                  │
│                                                             │
│     Your AI systems are unmonitored. Let's fix that.        │
│                                                             │
│     ┌──────────────────────────────────────────┐            │
│     │  [Connect Your First Model →]             │            │
│     └──────────────────────────────────────────┘            │
│                                                             │
│     Or follow our 5-minute setup guide:                     │
│     📖 Quickstart →                                         │
│                                                             │
│     Trusted by: [Logos of design-partner companies]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Alert State — Rule Creation Success

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Guardrail created                                        │
│                                                             │
│  Rule: IF injection_score > 0.9 THEN block                  │
│  Model: gpt-4-prod                                          │
│  Status: ACTIVE                                              │
│                                                             │
│  We estimate this will prevent ~12 incidents/week.          │
│  [View in Rules] [Test Rule] [Dismiss]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Visual Hierarchy

### 8.1 Layout System

```
┌─────────────────────────────────────────────────────┐
│  HEADER (56px)                                       │
│  Logo  │  Nav Items  │  Search  │  Profile  │ Help  │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────┬──────────────────────────────────┐     │
│  │          │                                   │     │
│  │  SIDEBAR │  CONTENT AREA                     │     │
│  │  (240px) │                                   │     │
│  │          │  ┌──────────────┬──────────────┐  │     │
│  │  Models  │  │  Card        │  Card        │  │     │
│  │  Alerts  │  │              │              │  │     │
│  │  Inv.    │  └──────────────┴──────────────┘  │     │
│  │  Compl.  │                                   │     │
│  │          │  ┌─────────────────────────────┐  │     │
│  │          │  │  Primary content area       │  │     │
│  │          │  │  (list, chart, detail)      │  │     │
│  │          │  └─────────────────────────────┘  │     │
│  └──────────┴──────────────────────────────────┘     │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 8.2 Visual Weight Hierarchy

| Element | Weight | Color | Notes |
|---------|--------|-------|-------|
| Health score | Highest | White on brand | Center of visual gravity |
| Critical alerts | Urgent | Red (#E02525) | Pulse animation for new |
| Primary CTA | High | Brand fill | "Investigate", "Resolve" |
| Model name | Medium | Text primary | Bold weight |
| Secondary data | Medium | Text secondary | Gray 500 |
| Timestamps | Low | Text tertiary | Gray 400, small |
| Metadata / tags | Lowest | Text quaternary | Gray 300, xs |

### 8.3 Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Brand / Primary | `#2B42F5` | Logo, nav active, primary CTAs |
| Critical | `#E02525` | Severity 4 alerts, error states |
| Warning | `#E88B1F` | Severity 3 alerts, warnings |
| Info | `#2B8CE5` | Info notifications, severity 2 |
| Success | `#1FAA5C` | Healthy state, resolved, success |
| Neutral | `#6B7280` | Secondary text, icons |
| Surface | `#F9FAFB` | Card backgrounds, hover states |
| Border | `#E5E7EB` | Card borders, dividers |

### 8.4 Typography

| Role | Font* | Weight | Size | Usage |
|------|-------|--------|------|-------|
| Display | Inter | 700 | 36px | Health score number |
| H1 | Inter | 600 | 24px | Page titles |
| H2 | Inter | 600 | 18px | Section headers |
| H3 | Inter | 500 | 15px | Card titles |
| Body | Inter | 400 | 14px | Content text |
| Small | Inter | 400 | 12px | Metadata, timestamps |
| Mono | JetBrains Mono | 400 | 13px | Code, token payloads |
| Mono small | JetBrains Mono | 400 | 11px | Log entries |

*\*UI font stack: Inter (text), JetBrains Mono (data).*

### 8.5 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | >1200px | Full sidebar + content |
| Tablet | 768–1200px | Collapsible sidebar |
| Mobile | <768px | Single column, bottom nav |

### 8.6 Motion Design Principles

1. **Purposeful, not decorative.** Animations communicate state changes (alert arrives, severity escalates, action completed).
2. **Fast.** All transitions ≤200ms. Alert pulses ≤500ms.
3. **Subtle.** No bounces, no confetti. This is enterprise security monitoring.
4. **Accessible.** Respects `prefers-reduced-motion`. Never animate critical data.

---

## 9. UX Writing Guidelines

### 9.1 Voice & Tone

**Voice:** Authoritative, precise, calm.

| Attribute | Approach |
|-----------|----------|
| **Confidence** | Definite about data; transparent about uncertainty |
| **Directness** | Say what happened, why, and what to do next |
| **Calm** | Even critical alerts use measured language — panic is not helpful |
| **Human** | Not robotic — "Something went wrong" not "Anomaly detected" |

**Tone matrix:**

| Context | Tone | Example |
|---------|------|---------|
| Alert | Urgent but controlled | "Prompt injection detected. Input blocked per guardrail rule #3." |
| Forecast | Measured | "Drift is increasing. If this trend continues, it may exceed threshold in ~6 hours." |
| Empty state | Encouraging | "Your models are unmonitored. Let's change that." |
| Error | Direct + actionable | "Connection to model endpoint failed. [Retry] or [Check endpoint URL]." |
| Success | Understated | "Guardrail created. Active on gpt-4-prod." |

### 9.2 Pattern Library

| Pattern | Say This | Avoid |
|---------|----------|-------|
| Alert arrival | "Prompt injection detected on gpt-4-prod" | "System detected anomalous activity" |
| Score display | "Risk score: 0.94 (High)" | "Score: 94%" |
| Action prompt | "Investigate this alert →" | "Click here to view details" |
| Confirmation | "Guardrail saved. Active in ~30 seconds." | "Your configuration has been successfully saved." |
| Error state | "Couldn't connect to model. The endpoint timed out." | "Error 503: Service Unavailable" |
| Empty state | "Add your first model to start monitoring." | "No models configured" |

### 9.3 Strings to Get Right

| Surface | Current (avoid) | SentinelAI (use) |
|---------|-----------------|-------------------|
| Risk level labels | Risks | Prompt Injections, PII Leaks, Drift (specific) |
| Alert inbox | Incidents | Active Alerts |
| Health score | System Score | AI Risk Score |
| Settings | Config | Settings |
| Compliance | Audits | Compliance |
| Baseline | Learning Mode | Auto-baseline (7d) |

### 9.4 Error Message Architecture

```
[WHAT happened] + [WHY it happened] + [WHAT TO DO]

Good:
  "Couldn't save guardrail. The rule name 'Rule 1' already exists.
   [Use a different name] or [Edit existing rule]"

Bad:
  "Error saving configuration. Please try again."
```

### 9.5 Inclusive Language

- Use "they" as singular pronoun
- Avoid security/military metaphors ("war room", "bomb", "shoot")
- Prefer "blocked" over "killed" for actions
- Prefer "allowed" over "whitelisted"
- Prefer "blocked" over "blacklisted"
- Prefer "primary" / "secondary" over "master" / "slave"

---

## 10. Enterprise Trust Signals

### 10.1 Trust Architecture

Trust in SentinelAI is earned across four dimensions:

```
                    TECHNICAL              SOCIAL
                    ──────────            ──────────
         RELIABILITY  │  Uptime, latency   │  Customer logos,  │
                      │  accuracy metrics  │  case studies      │
                      │                    │                    │
         SECURITY     │  SOC 2, encryption │  Pen test results, │
                      │  RBAC, audit logs  │  bug bounty program│
                      │                    │                    │
         TRANSPARENCY │  Explainability,   │  Public roadmap,   │
                      │  open positions    │  changelog, docs   │
                      │                    │                    │
         ACCOUNTABILITY│  Human-in-loop,   │  SLAs, support SLA,│
                       │  rollback, undo   │  TAM assignment    │
                       └────────────────────┴───────────────────┘
```

### 10.2 In-Product Trust Signals

| Location | Signal | Why It Works |
|----------|--------|--------------|
| Login / SSO | "SSO via Okta" badge | Compliance officers need identity proof |
| Dashboard header | "SOC 2 Certified" badge | Instant compliance confidence |
| Alert detail | "Decision explainer" tab | Engineers verify instead of trusting blindly |
| Report generation | "Signed manifest" indicator | Auditors need tamper evidence |
| Rule creation | "Est. impact: blocks ~12 incidents/week" | Quantifies value, builds trust |
| Configuration change | "Last edited by Maya, 2m ago" | Accountability trail |
| Integration setup | "Connection verified ✓" | Certainty before proceeding |
| Baseline view | "Confidence: High (14 days data)" | Honest about certainty |

### 10.3 Trust-Building UX Patterns

1. **Transparency about uncertainty.** If a risk score has low confidence (< 0.7), show it. Don't hide behind a single number.
2. **Predictability.** Actions always show estimated impact before execution. "This rule will block ~50 requests/day."
3. **Reversibility.** Every configuration change has a rollback path. Show "Undo" for 30 seconds.
4. **Provenance.** Every data point has a source, every action has an actor, every decision has a timestamp.
5. **Progressive trust.** New users get guided confidence. Power users get raw access. Never punish one for the other's needs.

### 10.4 Skeptic Handling

| Skeptic Statement | Product Response |
|-------------------|------------------|
| "How do I know this score is accurate?" | Show false positive rate, precision/recall, confidence interval |
| "What data leaves my environment?" | In-app data residency map + SOC 2 report download |
| "Can I verify this myself?" | Export raw event + run with own analysis |
| "What if I disagree with a decision?" | Override + feedback loop (model retrains) |
| "Can I see your infrastructure?" | Status page, incident history, architecture diagram |

---

## 11. Competitive Landscape

### 11.1 Competitive Positioning

```
                                 TECHNICAL DEPTH
                                      │
                          HIGH        │
                                      │
                     SentinelAI ●     │  ● Arize AI
                     (Observability   │  (ML Monitoring)
                      + Security)     │
                                      │
              WhyLabs ●               │
              (ML Monitoring)         │
                                      │
    RISK FOCUS ◄──────────────┼──────────────► MONITORING FOCUS
                                      │
                                      │  ● Datadog LLM Observability
                                      │  (APM extension)
              ● Protect AI            │
              (ML Security)           │
                                      │
                          LOW         │
                                      │
                                      │  ● Helicone (Logging)
                                      │
```

### 11.2 Competitive Comparison

| Capability | SentinelAI | Datadog LLM Obs. | WhyLabs | Arize AI | Protect AI | Helicone |
|-----------|------------|-------------------|---------|----------|------------|----------|
| Prompt injection detection | ✅ Native | ❌ | ❌ | ❌ | ✅ | ❌ |
| Output risk scoring | ✅ Native | ⚠️ Basic | ⚠️ Basic | ⚠️ Basic | ✅ | ❌ |
| Explainability | ✅ Token-level | ❌ | ⚠️ Feature attr. | ⚠️ Feature attr. | ❌ | ❌ |
| Audit logging | ✅ Immutable | ❌ | ✅ | ✅ | ⚠️ | ❌ |
| Compliance reports | ✅ EU AI Act, SOC 2 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Baselines / drift | ✅ Built-in | ⚠️ Manual | ✅ | ✅ | ⚠️ | ❌ |
| API usage monitoring | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| RBAC / workspaces | ✅ Multi-tenant | ✅ | ⚠️ Basic | ✅ | ❌ | ❌ |
| SIEM integration | ✅ Native | ✅ | ❌ | ❌ | ✅ | ❌ |
| Self-hosted option | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

### 11.3 Differentiation Strategy

| Differentiator | Why It Wins | Competitor Gap |
|---------------|-------------|----------------|
| **Explainable decisions** | Enterprise buyers won't trust a black box | Arize/WhyLabs show feature attribution but not decision reasoning |
| **Compliance-native** | EU AI Act mandates explainability & audit | No competitor has compliance report templates |
| **Security-first architecture** | SOC 2, RBAC, immutable logs, SIEM pipe | ML monitoring tools are built for data scientists, not security |
| **Multi-persona UX** | One product for engineer, security, compliance, exec | Everyone else builds for one persona |
| **On-prem option** | Regulated industries (finance, healthcare, defense) can't use cloud | Datadog/Arize/WhyLabs are cloud-only |

### 11.4 Competitive UX Weaknesses to Exploit

| Competitor | UX Weakness | SentinelAI Opportunity |
|------------|-------------|------------------------|
| Datadog LLM Obs. | Buried in APM — no dedicated AI risk view | First-class AI risk dashboard, not an add-on |
| WhyLabs | Engineer-only, no compliance persona | Role-based views that scale from engineer to CTO |
| Arize AI | Debugging tools lack security context | Alert → Investigate → Respond workflow with security kill chain |
| Protect AI | Narrow (security only), no observability | Breadth: security + observability + compliance in one |
| Helicone | Logging only, no risk analysis | Risk analysis on top of every logged event |

---

## 12. Usability Test Plan

### 12.1 Study 1: First-Run Experience

**Goal:** Validate that a new user can register their first model and see risk data in under 5 minutes.

| Element | Detail |
|---------|--------|
| **Participants** | 6 AI engineers (matches Maya persona) |
| **Method** | Moderated remote (Zoom + Figma prototype) |
| **Duration** | 45 min |
| **Incentive** | $100 gift card |

**Tasks:**
1. Create account and navigate to dashboard (warm-up)
2. Register a model using API key (core flow)
3. Configure a baseline (secondary)
4. Create a guardrail rule (secondary)
5. View generated risk data (exploration)

**Success metrics:**
| Metric | Target |
|--------|--------|
| Model registered | < 3 min |
| First alert visible | < 5 min |
| Task completion rate | > 90% |
| Satisfaction (SUS) | > 70 |

### 12.2 Study 2: Alert Investigation

**Goal:** Validate that a security analyst can investigate, understand, and respond to a risk alert efficiently.

| Element | Detail |
|---------|--------|
| **Participants** | 5 security analysts (matches Priya persona) |
| **Method** | Moderated remote (prototype + think-aloud) |
| **Duration** | 60 min |
| **Incentive** | $150 gift card |

**Tasks:**
1. Locate a critical alert in the dashboard (warm-up)
2. Investigate what caused the alert (core)
3. Understand why the model produced a risky output (core)
4. Escalate with full evidence package (secondary)
5. Create a rule to prevent recurrence (secondary)

**Success metrics:**
| Metric | Target |
|--------|--------|
| Alert found | < 15 sec |
| Root cause understood | < 2 min |
| Evidence package generated | < 30 sec |
| Rule created | < 3 min |

**Key research questions:**
- Can non-ML experts understand token-level explanations?
- Is the kill-chain framing intuitive for security analysts?
- Do analysts trust the risk score enough to act on it?

### 12.3 Study 3: Compliance Report Generation

**Goal:** Validate that a compliance officer can generate an audit-ready report in under 5 minutes.

| Element | Detail |
|---------|--------|
| **Participants** | 4 compliance officers (matches David persona) |
| **Method** | Moderated remote (prototype) |
| **Duration** | 45 min |
| **Incentive** | $150 gift card |

**Tasks:**
1. Navigate to compliance section (warm-up)
2. Select a model and date range (core)
3. Generate a compliance report (core)
4. Export evidence package (secondary)

**Success metrics:**
| Metric | Target |
|--------|--------|
| Report found & generated | < 3 min |
| Report includes required sections | 100% |
| Export successful | < 30 sec |
| Satisfaction | > 4/5 |

### 12.4 Study 4: Executive Dashboard

**Goal:** Validate that a CTO can assess AI risk posture and identify action items in under 30 seconds.

| Element | Detail |
|---------|--------|
| **Participants** | 5 senior engineering leaders (matches Marcus persona) |
| **Method** | Unmoderated remote (5-second test + tasks) |
| **Duration** | 15 min |
| **Incentive** | $75 gift card |

**Tasks:**
1. First impression — what does this dashboard tell you? (5-sec test)
2. Is the AI risk posture healthy or concerning? (core)
3. What are the top 3 risks to address? (core)
4. What changed in the last 7 days? (secondary)

**Success metrics:**
| Metric | Target |
|--------|--------|
| Health score understood in 5 sec | > 90% agreement |
| Correct posture assessment | > 80% |
| Top risks identified | > 3 mentions |
| NPS | > 30 |

---

## 13. Design Principles

### 13.1 The 7 SentinelAI Design Principles

| # | Principle | Meaning | In Practice |
|---|-----------|---------|-------------|
| 1 | **Show the why, not just the what** | Every risk score, every alert, every trend must be explainable in one click | Token heatmaps, feature attributions, confidence intervals on every data point |
| 2 | **Adapt to the role, not the screen** | One product, four distinct mental models | Role-adaptive views: same data, different lenses. Not just responsive — persona-aware |
| 3 | **Acknowledge uncertainty** | Never fake precision. If you don't know, say so | Confidence levels on scores, "Low confidence" labels, honest empty states |
| 4 | **Optimize for the critical moment** | When an engineer is paged at 2 AM, every millisecond matters | Fast loading, minimal clicks, keyboard-navigable, Slack-native actions |
| 5 | **Make compliance feel like a feature, not a chore** | Audit-ready by default, not as an afterthought | Immutable logs, one-click reports, compliance mode toggle |
| 6 | **Design for the skeptic** | Your user assumes you're wrong until proven otherwise | Show your work: evidence, traceability, exportable raw data |
| 7 | **Security is not a feature — it's the foundation** | Zero trust extends to the UX itself | RBAC at every action, clear data boundaries, audit trails on configuration changes |

### 13.2 Design Principle Examples

**Principle 1: Show the why, not just the what**
```
❌ Bad:
   Risk Score: 0.87

✅ Good:
   Risk Score: 0.87 (High)
   ┌────────────────────────────┐
   │ Why: Prompt injection      │
   │ Tokens: ["ignore previous",│
   │   "system override"]       │
   │ Confidence: 94%            │
   │ [Show full explanation →]  │
   └────────────────────────────┘
```

**Principle 3: Acknowledge uncertainty**
```
❌ Bad:
   Drift: 1.2σ — No Alert

✅ Good:
   Drift: 1.2σ (Confidence: Medium)
   Baseline: 7 days. Anomaly detection needs 14 days
   for high confidence.
   [Auto-baseline: 7 more days recommended]
```

**Principle 4: Optimize for the critical moment**
```
❌ Bad:
   5 clicks to find alert details
   No keyboard shortcuts
   Slower than terminal

✅ Good:
   Cmd+K → type alert ID → Enter → see all context
   Slack: inline action buttons (View / Block / Escalate)
   Dashboard loads in < 500ms
```

---

## 14. Appendix: Research Methodology

### 14.1 Research Methods Used

| Method | Sample | Purpose |
|--------|--------|---------|
| Generative interviews | 18 participants (5 engineers, 4 security, 4 compliance, 5 CTOs) | Understand workflows, mental models, pain points |
| Competitive audit | 6 products (Datadog, WhyLabs, Arize, Protect AI, Helicone, CrowdStrike) | Feature gaps, UX patterns, positioning |
| Cognitive walkthrough | 3 UX researchers | IA and workflow friction points |
| Heuristic evaluation | 2 senior designers | Usability heuristic violations |
| Survey (planned) | Target n=200 | Quantitative validation of persona segments |

### 14.2 Interview Protocol

**Core questions (all personas):**
1. Walk me through your last AI incident. What happened, and how did you handle it?
2. When you see a risk score, what do you need to know to trust it?
3. What's the hardest part about managing AI risk today?
4. If you could wave a magic wand, what would your ideal AI risk tool do?

**Persona-specific probes:**
- **Engineers:** "What does a typical debugging session look like?"
- **Security:** "How do AI risk alerts fit into your existing triage workflow?"
- **Compliance:** "What does a successful audit look like for AI systems?"
- **CTOs:** "What would make you comfortable deploying AI faster?"

### 14.3 Participant Recruitment Criteria

| Persona | Title Examples | Company Size | Segment |
|---------|---------------|--------------|---------|
| Maya (Engineer) | ML Engineer, AI Engineer, Applied Scientist | 50–5000 | B2B SaaS, Fintech, Health |
| Priya (Security) | SOC Analyst, AppSec Engineer, Security Manager | 200–10000 | Enterprise, Regulated |
| David (Compliance) | Compliance Officer, DPO, GRC Manager | 200–10000 | Enterprise, Regulated |
| Marcus (CTO) | CTO, VP Eng, Head of AI Platform | 50–2000 | Growth-stage, Enterprise |

### 14.4 Key Assumptions to Validate

| Assumption | Risk If Wrong | Validation Method |
|------------|---------------|-------------------|
| Enterprise teams will adopt a dedicated AI risk tool (vs. extending existing monitoring) | High | Interview + survey: "Would you buy a standalone tool?" |
| Explainability is the top buying criterion | Medium | A/B test: landing page highlighting explainability vs. performance |
| One product can serve all 4 personas | High | Session recording: do role-adaptive views actually reduce friction? |
| Compliance officers will engage with a technical platform | Medium | Usability test: compliance mode view |
| On-prem deployment is a differentiator | Medium | Sales call analysis: how many RFPs require on-prem? |

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-22 | Staff Product Designer | Initial research document |

---

*This document should be read alongside:*
- *Figma prototype (interactive dashboards, investigation flow)*
- *Design system spec (colors, typography, components)*
- *Persona data pack (raw interview transcripts, survey data)*
- *Competitive analysis spreadsheet (feature-by-feature comparison)*
