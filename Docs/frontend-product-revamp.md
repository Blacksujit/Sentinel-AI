# SentinelAI — Frontend Product Revamp

**Author:** Principal Product Designer (ex-Datadog, ex-CrowdStrike, ex-Stripe, ex-Linear, ex-Vercel)
**Date:** 2026-06-23
**Status:** Approved — Ready for Phased Implementation
**Target Quality Bar:** Datadog × CrowdStrike Falcon × Linear × Stripe Dashboard

---

## Table of Contents

1. [Product Story & Narrative Arc](#1-product-story--narrative-arc)
2. [Landing Page Strategy](#2-landing-page-strategy)
3. [Authentication & Onboarding Experience](#3-authentication--onboarding-experience)
4. [Application Shell & Navigation](#4-application-shell--navigation)
5. [Typography & Spacing System](#5-typography--spacing-system)
6. [Visual Language & Design Principles](#6-visual-language--design-principles)
7. [Page-by-Page Revamp Plan](#7-page-by-page-revamp-plan)
8. [Implementation Phases & Dependencies](#8-implementation-phases--dependencies)
9. [Success Metrics & Quality Gates](#9-success-metrics--quality-gates)

---

## 1. Product Story & Narrative Arc

### 1.1 The Core Journey

Every user flow maps to a four-stage narrative:

```
MONITOR → INVESTIGATE → UNDERSTAND → ACT
```

| Stage | Question Answered | User Action | Primary Pages |
|-------|-------------------|-------------|---------------|
| **MONITOR** | Is my AI system safe? | Scan, triage, prioritize | Dashboard, Risk Events |
| **INVESTIGATE** | What happened and why? | Drill-down, correlate, analyze | Event Detail, Investigation |
| **UNDERSTAND** | What does this mean? | Contextualize, pattern-recognize | Analytics, Compliance |
| **ACT** | What should I do about it? | Respond, configure, document | Policies, Settings, Evidence Export |

### 1.2 Persona Journey Mapping

```
                    MONITOR          INVESTIGATE        UNDERSTAND           ACT
                    ───────          ───────────        ──────────           ───
MAYA (Engineer)     Dashboard        Event Detail       Token Heatmap        Block pattern,
                    Alerts feed      Investigation      Similar events       Create rule,
                                                                             Adjust threshold

PRIYA (Security)    Risk Events      Investigation      Kill-chain view      Escalate,
                    SIEM alert       Evidence pkg        Timeline             Generate report,
                                                                             Create Jira

DAVID (Compliance)  Compliance tab   Audit log          Compliance report    Export evidence,
                    Dashboard        Control checklist   Framework mapping    Freeze baseline

MARCUS (CTO)        Health score     Analytics trends   Model comparison     Approve policy,
                    Weekly digest    Team metrics        Risk/ROI analysis    Allocate budget
```

### 1.3 Product Story per Page

Every page title must communicate purpose, not just location:

| Current | Proposed | Why |
|---------|----------|-----|
| Dashboard | Dashboard | Keep — it's universal |
| Logs | Risk Events | "Logs" is too generic; security teams think in "events" |
| Log Detail | Investigation | "Log Detail" sounds technical; "Investigation" is purpose-driven |
| Settings | Settings | Keep |
| Analyze | (fold into Risk Events) | Duplicate surface — Playground is enough |
| — | Compliance | New section for David's persona |
| — | Policies | Currently buried in Settings |

---

## 2. Landing Page Strategy

### 2.1 Current State

The landing page at `(public)/page.tsx` currently uses generic SaaS template patterns. Full rewrite needed.

### 2.2 Narrative Structure

The landing page must communicate:

```
PROBLEM → RISK → SOLUTION → PRODUCT → TRUST → ACTION
```

### 2.3 Sections Defined

#### HERO

**Purpose:** Communicate in under 5 seconds that SentinelAI is the AI security platform.

| Element | Content |
|---------|---------|
| Headline | "AI risk monitoring for the enterprise" |
| Subheadline | "Real-time detection of prompt injections, data leakage, drift, and policy violations across your LLM stack." |
| CTA | "Start monitoring" — primary button |
| Secondary CTA | "View demo" — ghost button |
| Trust badges | "SOC 2 Certified" + "GDPR Compliant" + "EU AI Act Ready" |
| Visual | Architecture diagram showing: User → LLM → SentinelAI (shield) → Decision, with risk score overlay |

**Rules:**
- No hero animations, no floating particles, no AI robot imagery
- Professional product screenshot or diagram only
- Single CTA, not three

#### PROBLEM SECTION

**Purpose:** Make the visitor feel the pain before offering the solution.

| Block | Headline | Body |
|-------|----------|------|
| 1 | "AI systems are a new attack surface" | "72% of enterprises deploying LLMs have experienced a security incident. Traditional tools can't detect prompt injections, data exfiltration, or model drift." |
| 2 | "Compliance mandates are arriving" | "EU AI Act, NIST AI RMF, and SOC 2 now require explainability and audit trails for AI decision-making. The deadline is not optional." |
| 3 | "Your teams are flying blind" | "AI engineers, security analysts, and compliance officers need a shared view of AI risk — not fragmented tools built for one persona." |

#### RISK VISIBILITY SECTION

**Purpose:** Show the product solving the problem — real screenshots.

Show three core views:
1. **Dashboard** — Health score, active alerts, risk trend
2. **Investigation** — Token heatmap with risk breakdown
3. **Compliance** — Audit log with signed manifests

Each: 50% screenshot, 50% explanation of what the user sees and does.

#### PRODUCT OVERVIEW

**Purpose:** Three-pillar product explanation.

| Pillar | Icon | Description |
|--------|------|-------------|
| Real-time monitoring | Shield | Detect prompt injections, PII leaks, jailbreak attempts, and drift as they happen |
| Deep investigation | Search | Token-level explainability, timeline correlation, root cause analysis |
| Compliance automation | FileText | One-click audit reports, tamper-evident logs, framework-aligned evidence packages |

#### FEATURES

12 features in a 3×4 grid. Each card: icon + feature name + one-line description.

| Feature | Category |
|---------|----------|
| Prompt injection detection | Security |
| PII / data leakage detection | Security |
| Output risk scoring | Security |
| Token-level explainability | Investigation |
| Event timeline & correlation | Investigation |
| Root cause analysis | Investigation |
| Immutable audit logs | Compliance |
| Compliance report templates | Compliance |
| Signed evidence packages | Compliance |
| Model baseline & drift detection | Monitoring |
| Custom guardrail rules | Policies |
| SIEM integration (Splunk, Elastic) | Integration |

#### ENTERPRISE TRUST SECTION

| Element | Content |
|---------|---------|
| SOC 2 Type II | "Certified — report available on request" |
| GDPR Compliant | "Data residency controls, DPA signed" |
| EU AI Act Ready | "High-risk AI system compliance framework" |
| Encryption | "AES-256 at rest, TLS 1.3 in transit" |
| RBAC | "Role-based access with workspace isolation" |
| SSO/SAML | "Okta, Azure AD, Google Workspace" |

#### SECURITY SECTION

Brief architecture explainer showing:
- Data flow: User prompt → SentinelAI analysis → Decision → Logged
- What is analyzed (prompt, response, metadata)
- What is NOT stored (raw model weights, customer training data)
- Data residency options (US, EU, custom)

#### CTA SECTION

"Start monitoring your AI systems in minutes" with:
- Primary CTA: "Start free trial"
- Secondary: "Book a demo"
- Trust signal: "No credit card required. SOC 2 certified."

---

## 3. Authentication & Onboarding Experience

### 3.1 Login Page

**Purpose:** Professional authentication, not a marketing page.

Layout:
- Left panel: SentinelAI logo + product tagline ("AI risk monitoring for the enterprise")
- Right panel: Login form (email + password OR SSO buttons)

SSO buttons: Okta, Azure AD, Google Workspace, GitHub (styled as brand buttons, not generic OAuth icons)

Below form: "Don't have an account? [Sign up]" + "Privacy Policy" + "Terms of Service"

No background illustration, no decorative elements, no "welcome back" marketing copy.

### 3.2 Signup Page

**Purpose:** Collect minimum information to get value fast.

Form fields:
- Email
- Password (with strength indicator)
- Company name
- Role (dropdown: AI Engineer, Security, Compliance, Executive, Other)

After submit:
- Email verification screen
- Or: "We sent a magic link to [email]"

### 3.3 Workspace Creation (Post-Auth)

**Purpose:** First-run onboarding — guide user to value in under 2 minutes.

Step 1: "Name your workspace"
- Workspace name input
- Optional: company size, industry (for compliance template defaults)

Step 2: "What's your primary use case?"
- Three cards: "Monitor production AI", "Prepare for compliance audit", "Evaluate AI risk"
- Selection sets default dashboard view

Step 3: "Connect your first model"
- API key input OR "Skip to dashboard" with guided empty state

Step 4: "You're all set"
- Dashboard preview
- CTA: "Go to dashboard" + "Quickstart guide"

Empty state (if skipped): Dashboard shows hero empty state:
- "Your AI systems are unmonitored"
- "Connect a model to start seeing risk data"
- Quickstart guide link
- API docs link

---

## 4. Application Shell & Navigation

### 4.1 Layout Architecture

Per `docs/frontend-architecture.md` and `docs/design-system.md`:

```
┌─────────────────────────────────────────────────────────────┐
│ TOP NAV (56px) — empty on desktop, breadcrumb on tablet     │
│                    [Cmd+K Search] [Notifications] [Profile] │
├────────┬────────────────────────────────────────────────────┤
│        │                                                     │
│ SIDE   │  CONTENT (flex-grow, 12-column grid)                │
│ BAR    │                                                     │
│ 240px  │  ┌──────────┬──────────┬──────────┐                │
│        │  │ Card     │ Card     │ Card     │                │
│        │  └──────────┴──────────┴──────────┘                │
│        │                                                     │
│        │  ┌─────────────────────────────────────────────┐   │
│        │  │ Primary content (table, chart, detail)       │   │
│        │  └─────────────────────────────────────────────┘   │
│        │                                                     │
└────────┴─────────────────────────────────────────────────────┘
```

### 4.2 Sidebar — Priority Order

Per the IA design:

```
SENTINELAI LOGO (32px + product name)
──────────────────
Dashboard          — shield icon — All roles
Models             — box icon — All roles
Risk Events        — activity icon — All roles
Investigations     — search icon — All roles
──────────────────
Audit Logs         — file-text icon — All roles
Analytics          — bar-chart icon — All roles
Policies           — shield-off icon — Admin, Editor only
──────────────────
API Usage          — terminal icon — Admin, Editor only
Team               — users icon — Admin, Editor only
Settings           — settings icon — Admin, Editor, Compliance
──────────────────
Help & Support     — help-circle icon — Bottom section
Changelog          — git-commit icon — Bottom section
```

**Implementation rules:**
- Active item: brand primary left border (2px) + brand primary light (`#E8EBFF`) background
- Inactive: text secondary (`#4B5563`), no background
- Hover: neutral 100 (`#F3F4F6`) background
- Icons: 20x20, same color as text
- Spacing: 10px vertical padding, 16px horizontal

### 4.3 Top Navigation

| Element | Behavior |
|---------|----------|
| Workspace selector | Breadcrumb area: "[Workspace Name ▾] > Page > Subpage" |
| Global Search | Cmd+K modal, searches models, events, policies, settings |
| Notification bell | Badge count, dropdown panel |
| User avatar | 24x24, fallback initials, dropdown: Preferences, Theme, Sign Out |

### 4.4 Current → Target Navigation Mapping

| Current Route | Target Route | Notes |
|---------------|--------------|-------|
| `/dashboard` | `/dashboard` | Keep — it's the home |
| `/user/dashboard` | (remove) | Duplicate — consolidate into `/dashboard` |
| `/logs` | `/risk-events` | Rename for clarity |
| `/logs/[id]` | `/investigations/[id]` | Rename; "investigation" is more accurate |
| `/settings` | `/settings` | Keep |
| `/analyze` | (fold into Risk Events) | Remove standalone page |
| `/user/playground` | `/playground` | Keep — useful for testing |
| — | `/compliance` | New — David's primary page |
| — | `/policies` | New — guardrail rule engine |
| — | `/team` | New — RBAC management |
| — | `/models` | New — model registry |

### 4.5 Card Design

Per design-system.md spec:

| Property | Value |
|----------|-------|
| Background | `bg-card` (#FFFFFF) |
| Border | `border` (#E5E7EB), 1px |
| Border radius | `rounded-xl` (12px) |
| Padding | `p-4` (16px) — card content, `p-6` (24px) — generous |
| Header | `text-sm font-semibold` (H3: 15px/500) |
| Shadow | None — flat design. Elevated cards only for modals/dropdowns |

### 4.6 Table Design

| Property | Value |
|----------|-------|
| Header | 12px/600, uppercase, text tertiary |
| Cell | 14px/400, text primary |
| Row height | 44px default, 36px compact |
| Row hover | Neutral 50 (`#F9FAFB`) |
| Stripe | Alternating rows: white / neutral 50 |
| Border | Bottom border only (neutral 200), no vertical borders |
| Selection | Brand primary light (`#E8EBFF`) |

---

## 5. Typography & Spacing System

### 5.1 Typography (Per `docs/design-system.md`)

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 36px | 700 | 44px | Health score, empty state hero |
| H1 | 24px | 600 | 32px | Page titles |
| H2 | 18px | 600 | 24px | Section headers, modal titles |
| H3 | 15px | 500 | 20px | Card titles, panel headers |
| Body | 14px | 400 | 20px | Standard content |
| Body Bold | 14px | 600 | 20px | Table values, emphasis |
| Small | 12px | 400 | 16px | Metadata, timestamps |
| Small Bold | 12px | 600 | 16px | Badge labels, metrics |
| Label | 13px | 500 | 16px | Form labels, sidebar |
| Mono | 13px | 400 | 20px | Event IDs, code, JSON |
| Mono Small | 11px | 500 | 16px | Audit hashes, hex |

### 5.2 Spacing Scale (4px Base)

| Token | PX | Usage |
|-------|----|-------|
| 1 | 4px | Icon padding, badge internal |
| 2 | 8px | Icon-text gap, badge padding |
| 3 | 12px | Button padding, table cell |
| 4 | 16px | Card padding, form gap |
| 5 | 20px | Card title-to-body gap |
| 6 | 24px | Section spacing, page padding |
| 8 | 32px | Page sections |
| 10 | 40px | Module spacing |
| 12 | 48px | Page title to content |

### 5.3 Current Violations to Fix

| Violation | Files | Fix |
|-----------|-------|-----|
| `text-2xl font-semibold` for page titles | All pages | → `text-[24px] font-semibold` or standard H1 |
| `text-base font-semibold` for section titles | All pages | → `text-lg font-semibold` (18px) |
| `p-5` (20px) card padding | dashboard, org-logs | → `p-6` (24px) |
| `text-white` instead of `text-foreground` | All pages | → semantic tokens |
| `text-muted` instead of `text-muted-foreground` | All pages | → exact semantic token |
| `bg-white/5`, `bg-black/20` opacity backgrounds | workspace-intel, settings, logs | → `bg-muted` or `bg-accent` |
| `border-white/10` | All pages | → `border-border` |

---

## 6. Visual Language & Design Principles

### 6.1 Design Position

```
                     WARM
                      │
      PLAYFUL         │         AUTHORITATIVE
      (Vercel)        │         ◉ SentinelAI
                      │
                      │         (CrowdStrike)
                      │
                      ├─────────────────────────── INFORMATIONAL DENSITY
                      │         (Datadog)
                      │
      MINIMAL         │
      (Linear)        │
                      │
                      COLD
```

SentinelAI occupies the **authoritative × high-density** quadrant. Every design decision prioritizes scanability and decision speed over visual flourish.

### 6.2 Forbidden Patterns

| Pattern | Reason | Replacement |
|---------|--------|-------------|
| Glassmorphism | Undermines trust | Solid cards with border |
| Neon / glow effects | Crypto-dashboard aesthetic | Flat colors, box-shadow only for depth |
| Gradient backgrounds | Distracting, non-professional | `bg-background` (#F3F4F6) |
| Floating widgets | Confusing layout | Fixed grid positions |
| Marketing gradients on CTAs | Inconsistent | Solid brand primary (#2B42F5) |
| Brand color as page background | Lowers information density | Neutral page background |
| Oversized hero numbers | Wastes space | `text-3xl` max (36px) |
| Decorative icons | Adds noise | Functional icons only |

### 6.3 Permitted Visual Treatments

| Treatment | Where | Implementation |
|-----------|-------|----------------|
| Brand left border | Active nav item | `border-l-2 border-primary` |
| Severity dot | Alert rows, status indicators | `h-2 w-2 rounded-full` with severity color |
| Progress bar | Health score, risk bars | `h-2 w-full rounded-full bg-muted` with colored fill |
| Tooltip | Truncated text, metadata | Standard Radix tooltip |
| Card hover | Interactive cards | `hover:bg-muted/50` |
| Focus ring | Keyboard navigation | `focus-visible:ring-2 focus-visible:ring-primary` |

### 6.4 Color Application Rules

| Rule | Enforcement |
|------|-------------|
| Severity colors are only used for risk/severity indicators | Any use of red/amber/green/blue outside risk badges must be justified |
| Icon + color + text on every severity badge | Color-blind users must receive the same signal |
| Never use severity colors for decorative elements | Buttons, borders on non-risk cards use brand colors only |
| Brand primary (#2B42F5) for CTAs, active nav, links | One primary action per view |

---

## 7. Page-by-Page Revamp Plan

### 7.1 Dashboard (`/dashboard`)

#### Current Problems
- Duplicate pages (`/dashboard` and `/user/dashboard`)
- Health score section has proper layout but typography slightly off (24px → should be 36px display for score)
- No role-adaptive views (engineer / security / compliance / executive)
- No compliance quick-action section
- Activity table is functional but column selection is missing

#### Target Layout

```
[Health Score Card — full width]
  84/100  + trend + status message + progress bar

[Top Risks] [Active Alerts]
  3 ranked items with     4 severity rows
  severity + delta + model   with counts

[Risk Trend Chart — 7d]  [Recently Resolved]
  Area chart with tooltip  3-5 items + MTTR

[Quick Actions]
  Investigate Critical Alert | Review Policy Effectiveness | Generate Compliance Snapshot
```

#### Implementation Plan
1. Consolidate `/dashboard` and `/user/dashboard` into single route
2. Add role-adaptive view via Zustand store (`roleAdaptiveView`)
3. Add "Recently Resolved" card (uses `useRiskLogs` data filtered by resolved status)
4. Add Quick Actions bar at bottom
5. Add compliance snapshot CTA for compliance/executive roles
6. Fix typography: health score number → 36px/700, section headers → 18px/600

### 7.2 Risk Events (`/risk-events`) — CURRENT `/logs`

#### Current Problems
- Path is `/logs` but purpose is risk event triage — URL doesn't match function
- Duplicate implementations (`(org)/org/[orgId]/dashboard/logs/`, `logs/`, `(dashboard)/user/logs/`)
- Refactored LogsPageClientModern is now clean but header says "Risk Events" while URL is still `/logs`
- No bulk actions on table rows
- No column visibility toggle
- No export functionality

#### Target Layout

```
[Page Header]
  "Risk Events" + count + [Export CSV] [Export JSON]

[Filter Bar]
  Search | Date Range | Severity | Risk Type | Model | Environment | Status

[Events Table — TanStack with virtualized rows]
  Select | Severity | Event ID | Risk Type | Risk Score | Model | Timestamp | Status | Actions

[Pagination — page N of M]
```

#### Implementation Plan
1. Create route at `/risk-events` (could be rewrite from `/logs`)
2. Add bulk action bar: "Dismiss Selected", "Escalate Selected" (visible when rows checked)
3. Add column visibility toggle dropdown
4. Add export CSV/JSON buttons using `getRiskLogs` data
5. Wire TanStack Table for sorting and column management
6. Add `@tanstack/react-virtual` for large lists

### 7.3 Investigation (`/investigations/[id]`) — CURRENT `/logs/[id]`

#### Current Problems
- Current `RiskLogDetailClientModern` has good content but flat single-column layout
- No timeline panel
- No recommendations panel
- No evidence export
- URL is `/logs/[id]` — should be `/investigations/[id]`

#### Target Layout (3-column)

```
[Left Panel — 280px]
  Timeline with zoom controls (1h / 6h / 24h / 7d)
  Color-coded dots: red=risk, green=deploy, blue=config
  Vertical scroll + "Now" indicator

[Center Panel — flex-grow]
  Tabs: Summary | Token Heatmap | Raw Event
  Summary: Risk breakdown (categories), input summary, similar events
  Token Heatmap: Grid of color-coded tokens
  Raw Event: Syntax-highlighted JSON viewer

[Right Panel — 300px]
  Recommendations: "Block 'ignore previous' pattern — 94% confidence — [Apply]"
  Evidence Export: [Download JSON + Manifest] [Copy Share Link]
  Quick Actions: [Escalate] [Create Rule] [Mark FP] [Dismiss]
```

#### Implementation Plan
1. Create route at `/investigations/[id]`
2. Build TimelinePanel from existing `useGroupedTimeline` data
3. Build RecommendationsPanel (uses AI summary + similar events)
4. Add Evidence Export button (JSON download)
5. Convert existing `RiskLogDetailClientModern` into the center panel content
6. Add 3-column split-view layout

### 7.4 Audit Logs (`/audit-logs`)

#### Current Problems
- No dedicated audit logs page — audit data is mixed into Risk Events table
- Settings has a "Settings history" section but it's limited to settings changes
- No tamper-evident chain verification UI
- No filter by actor, action type, or resource type

#### Target Layout

```
[Page Header]
  "Audit Logs" + integrity badge ("Chain verified ✓") + [Export CSV]

[Filter Bar]
  Actor | Action Type (created/updated/deleted) | Resource Type | Date Range | Search

[Audit Table — virtualized]
  Timestamp | Actor | Action | Resource | Details | Hash

[Entry Detail — modal on row click]
  Full metadata + Before/After diff + Hash chain info
```

#### Implementation Plan
1. Create `/audit-logs` route
2. Build data source from existing `GET /api/settings/history` + new audit API
3. Add chain verification UI (hash comparison)
4. Build actor/action/resource filters
5. Add detail modal with JSON diff viewer

### 7.5 Analytics (`/analytics`)

#### Current Problems
- No analytics page exists
- Only trend chart on dashboard is the closest thing to analytics
- No model comparison, team metrics, or compliance reporting

#### Target Layout

```
[Page Header]
  "Analytics" + Tab Nav: [Trends] [Model Comparison] [Teams] [Compliance]

[Filter Bar — shared across tabs]
  Time Range (7d / 30d / 90d / Custom) | Model(s) | Environment

[Trends Tab]
  Risk Score Trend (line chart) | Alert Volume (stacked bar) | Top Risk Types (horizontal bar)

[Model Comparison Tab]
  Model selector (checkboxes) | Comparison chart (grouped bar) | Detail table

[Teams Tab]
  Summary cards + trend chart + member activity table

[Compliance Tab]
  Framework tabs (EU AI Act / SOC 2 / ISO 42001) | Compliance gauge | Control checklist | [Generate Report]
```

#### Implementation Plan
1. Create `/analytics` route with sub-tabs
2. Build trend charts from existing `useRiskLogs` data
3. Build model comparison views
4. Build compliance reporting (framework checklists, gauge)
5. Add report generation (PDF download)

### 7.6 Policies (`/policies`)

#### Current Problems
- No dedicated policies page
- Guardrail rules are not configurable through the UI
- User can't create or manage policies visually

#### Target Layout

```
[Page Header]
  "Policies" + active rule count + [Create Rule]

[Policies Table]
  Name | Condition (IF) | Action (THEN) | Status | 24h Triggers | Effectiveness | Actions

[Rule Builder — page or modal]
  Name + Description
  Condition Builder: Field > Operator > Value (repeating rows)
  Action Select: block / flag / alert / escalate / log_only
  Scope: Models, environments, teams
  Preview: "This would have caught 47 events in last 7 days"
  Dry-run button
```

#### Implementation Plan
1. Create `/policies` route with rule list table
2. Build rule builder with condition rows, action selector, scope selector
3. Add preview panel that estimates impact against historical data
4. Add dry-run testing capability

### 7.7 Settings (`/settings`)

#### Current Problems
- Already refactored to remove vibe-coded patterns (done in current session)
- Single-page layout — needs sub-navigation for scalability
- Risk thresholds, signal weights, and enforcement mode are already properly implemented
- Missing: integrations page, SSO config, billing, API keys

#### Target Layout

```
[Settings Sidebar — 240px]
  General | Integrations | SSO | Workspaces | Billing | API Keys

[General — default]
  Workspace name, slug, timezone
  Risk thresholds (current sliders)
  Signal weights (current sliders)
  Enforcement mode (current select)

[Integrations]
  Cards for each integration (Slack, PagerDuty, Jira, Splunk)
  Each: logo + name + connection status + [Configure/Connect] + [Remove]

[SSO]
  Status card (Enabled/Disabled) + IdP metadata upload + attribute mapping

[API Keys]
  Key list with name, prefix, created date, last used
  Generate Key form
```

#### Implementation Plan
1. Add sidebar sub-navigation to settings page
2. Build Integrations page (list existing integrations, connect new ones)
3. Build API Keys management page
4. Build SSO configuration page
5. Preserve existing risk threshold/signal weight functionality

---

## 8. Implementation Phases & Dependencies

### Phase 0: Foundation (Week 1)
**Dependencies:** None

| Task | Files | Est. Effort |
|------|-------|-------------|
| Consolidate duplicate dashboard routes (`/dashboard` + `/user/dashboard`) | routing, middleware | 2h |
| Fix remaining typography violations (title 24px/600, section 18px/600) across all pages | All page files | 1h |
| Fix remaining spacing violations (`p-5` → `p-6`) | All files | 1h |
| Replace all `text-white`/`text-muted` with semantic tokens across codebase | Global search/replace | 30m |
| Replace all `bg-white/*`, `border-white/*`, `bg-black/*` with semantic tokens | All files | 1h |

### Phase 1: Navigation & Shell (Week 1-2)
**Dependencies:** Phase 0

| Task | Files | Est. Effort |
|------|-------|-------------|
| Redesign sidebar per design-system.md spec (240px, priority order, role visibility) | AppLayoutModern | 4h |
| Add Cmd+K global search component | New component | 4h |
| Add notification bell with dropdown | New component | 3h |
| Add workspace selector in breadcrumb area | New component | 2h |
| Add UserMenu with theme toggle | New component | 2h |
| Implement sidebar collapsed state (64px, icon-only) | AppLayoutModern | 3h |

### Phase 2: Landing Page (Week 2)
**Dependencies:** Phase 0

| Task | Est. Effort |
|------|-------------|
| Rewrite hero section per Section 2 spec | 3h |
| Build problem/risk sections | 3h |
| Build product overview with 3 pillars | 2h |
| Build features grid (12 features) | 2h |
| Build enterprise trust section | 1h |
| Build security/CTA sections | 1h |

### Phase 3: Dashboard Consolidation (Week 2)
**Dependencies:** Phase 1

| Task | Est. Effort |
|------|-------------|
| Consolidate `/dashboard` and `/user/dashboard` | 2h |
| Add Recently Resolved card | 2h |
| Add Quick Actions bar | 1h |
| Add role-adaptive view switcher | 3h |
| Add health score display to 36px/700 | 30m |

### Phase 4: Risk Events + Investigation (Week 3)
**Dependencies:** Phase 1

| Task | Est. Effort |
|------|-------------|
| Create `/risk-events` route (rewrite from `/logs`) | 2h |
| Add bulk actions to risk events table | 2h |
| Add column visibility toggle | 1h |
| Add export CSV/JSON | 1h |
| Create `/investigations/[id]` route | 2h |
| Build 3-column investigation layout | 4h |
| Build TimelinePanel component | 3h |
| Build RecommendationsPanel component | 2h |
| Build Evidence Export button | 1h |

### Phase 5: Audit Logs + Policies (Week 4)
**Dependencies:** Phase 1

| Task | Est. Effort |
|------|-------------|
| Create `/audit-logs` route | 2h |
| Build audit table with filters | 3h |
| Build chain verification UI | 2h |
| Build audit detail modal | 3h |
| Create `/policies` route | 2h |
| Build rule builder component | 6h |
| Build preview/dry-run panel | 3h |

### Phase 6: Analytics + Compliance (Week 4-5)
**Dependencies:** Phase 1

| Task | Est. Effort |
|------|-------------|
| Create `/analytics` route | 2h |
| Build trend charts (line + bar) | 3h |
| Build model comparison views | 3h |
| Build compliance reporting | 4h |
| Add PDF report generation | 2h |

### Phase 7: Settings Expansion (Week 5)
**Dependencies:** Phase 1

| Task | Est. Effort |
|------|-------------|
| Add settings sidebar sub-navigation | 2h |
| Build Integrations page | 4h |
| Build API Keys management | 3h |
| Build SSO configuration | 3h |

### Phase 8: Auth & Onboarding (Week 5-6)
**Dependencies:** Phase 0

| Task | Est. Effort |
|------|-------------|
| Redesign login page per spec | 2h |
| Redesign signup page | 2h |
| Build 4-step onboarding flow | 6h |
| Build empty state dashboard guidance | 2h |

---

## 9. Success Metrics & Quality Gates

### 9.1 Visual Consistency Checklist

Before any page is considered "complete", it must pass:

- [ ] All typography uses the 4px-based scale (36/24/18/15/14/12/13/11)
- [ ] All spacing uses the 4px-based scale (4/8/12/16/20/24/32/40/48)
- [ ] No `text-white`, `text-muted`, `bg-white/*`, `border-white/*`, `bg-black/*` opacity tokens
- [ ] Cards use `border bg-card` with `rounded-xl`, never `card-premium` or custom classes
- [ ] Page titles are 24px/600, section headers are 18px/600
- [ ] Tables use consistent header (12px/600 uppercase) and row (14px/400) typography
- [ ] No glassmorphism, neon, glow, gradients, or decorative elements
- [ ] All severity badges include icon + text + color (never color alone)
- [ ] Every empty state educates the user: what this section is for + what to do next
- [ ] Loading states use `bg-muted` skeleton, never custom pulse classes

### 9.2 Product Quality Gates

| Gate | Criterion | Measurement |
|------|-----------|-------------|
| Dashboard answers 3 questions | "Should I be worried? / What should I do? / How are we trending?" | User finds health score + top alerts + trend in ≤5 seconds |
| Three-click rule | Any piece of data reachable in ≤3 clicks from dashboard | Walk through all primary workflows |
| Empty states educate | Every empty state has: what this is + what to do next | Visual audit |
| Accessible | WCAG AA minimum | Automated audit (axe-core) |
| Fast | LCP < 2s, INP < 200ms, CLS < 0.1 | Lighthouse CI in pipeline |
| Bundle budget | ≤150KB gzip per route | Bundle analysis CI gate |

### 9.3 "Vibe-Coded" Detection Checklist

Any file that passes this checklist is clean. Any that fails needs refactoring:

- [ ] No `MotionCard`, `MotionBox`, or custom `motion.div` wrappers for layout (only for purposeful animations)
- [ ] No `useCursorInteractions`, `hoverGlow`, `hoverScaleLift`, `buttonPress`, `filterPanel` animation presets
- [ ] No `card-premium`, `badge-premium`, `btn-premium`, `btn-premium-outline`, `input-premium` CSS classes
- [ ] No `bg-gradient-*` on cards or page backgrounds
- [ ] No `hover:shadow-glow-*` or any glow box-shadows
- [ ] No decorative grid patterns (`bg-[linear-gradient(...)]`)
- [ ] No decorative icon in card titles (Zap, Brain, etc. as decoration)
- [ ] No marketing copy in descriptions ("AI-native", "cutting-edge", "next-gen")
- [ ] No dynamic Tailwind classes (`text-${color}-*`, `bg-${severity}-*`)
- [ ] No emoji in UI text (🤖, 🚀, etc.)
- [ ] No SweetAlert2 dialogs (use sonner toasts or standard modal)

---

## Appendix A: File Migration Map

| Current File | Target | Action |
|--------------|--------|--------|
| `app/dashboard/page.tsx` | `app/dashboard/page.tsx` | Consolidate from `(dashboard)/user/dashboard` |
| `app/(dashboard)/user/dashboard/page.tsx` | (delete) | Remove duplicate |
| `app/(dashboard)/user/logs/page.tsx` | (delete) | Remove mock page |
| `app/logs/page.tsx` | `app/risk-events/page.tsx` | Rename route |
| `app/logs/LogsPageClientModern.tsx` | `app/risk-events/LogsPageClientModern.tsx` | Move |
| `app/logs/[id]/page.tsx` | `app/investigations/[id]/page.tsx` | Rename route |
| `app/logs/[id]/RiskLogDetailClientModern.tsx` | `app/investigations/[id]/RiskLogDetailClientModern.tsx` | Move + refactor to 3-column |
| `app/settings/page.tsx` | `app/settings/page.tsx` | Add sidebar sub-nav |
| `app/(org)/org/[orgId]/dashboard/logs/page.tsx` | (delete) | Replace with `/audit-logs` |
| `app/(org)/*` | (evaluate) | Migrate org pages to flat `/app/*` structure |

## Appendix B: Component Inventory

### Already Clean (Refactored in Current Session)

| Component | Status | Notes |
|-----------|--------|-------|
| `user/dashboard/page.tsx` | ✅ Clean | Typography fixed (32px/700 title, 18px/600 sections), spacing fixed (p-6) |
| `workspace-intel/intelligence-overview.tsx` | ✅ Clean | No gauges, no pie/bar charts, no gradients, no marketing copy |
| `workspace-intel/incident-list.tsx` | ✅ Clean | Semantic tokens, educational empty state |
| `workspace-intel/timeline-view.tsx` | ✅ Clean | No emoji, semantic tokens, educational empty state |
| `workspace-intel/activity-feed.tsx` | ✅ Clean | Semantic tokens, educational empty state |
| `workspace-intel/workspace-intel-dashboard.tsx` | ✅ Clean | No decorative icons, no dynamic Tailwind classes, no marketing copy |
| `logs/page.tsx` | ✅ Clean | No gradient, no premium classes, no glow |
| `logs/LogsPageClientModern.tsx` | ✅ Clean | Filters/table/pagination preserved, no MotionCard/glow/premium classes |
| `(org)/org/[orgId]/dashboard/logs/page.tsx` | ✅ Clean | No gradient buttons, no premium classes |
| `settings/page.tsx` | ✅ Clean | No MotionCard/glow/SweetAlert2/cursor-interactions/premium classes |

### Needs Refactoring (Future Phases)

| Component | Priority | Issues |
|-----------|----------|--------|
| `dashboard/page.tsx` (old) | High | May have premium classes — verify after consolidation |
| `logs/[id]/RiskLogDetailClientModern.tsx` | High | Single-column layout, no timeline/recommendations/evidence panels |
| `logs/[id]/page.tsx` | High | Duplicate implementations to consolidate |
| Remaining `(dashboard)/*` pages | Medium | Review for premium classes, semantic tokens |
| Remaining `(org)/*` pages | Medium | Review for premium classes, gradient buttons |
| Public landing page (`(public)/page.tsx`) | High | Full rewrite needed per Section 2 |
| Auth pages | Medium | Redesign per Section 3 |
