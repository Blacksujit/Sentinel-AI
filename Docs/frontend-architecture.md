# SentinelAI — Frontend Architecture Document

**Product:** AI Risk Monitoring & Observability Platform
**Version:** 1.0
**Status:** Draft — Pending Engineering Review
**Author:** Staff Frontend Architect (ex-Datadog, ex-Vercel, ex-CrowdStrike)
**Date:** 2026-06-22

---

## Table of Contents

1. [Technology Decisions](#1-technology-decisions)
2. [Application Architecture](#2-application-architecture)
3. [Route Structure](#3-route-structure)
4. [Layout Architecture](#4-layout-architecture)
5. [Component Architecture](#5-component-architecture)
6. [State Management Architecture](#6-state-management-architecture)
7. [API Integration Layer](#7-api-integration-layer)
8. [Design System Architecture](#8-design-system-architecture)
9. [Data Visualization Architecture](#9-data-visualization-architecture)
10. [Folder Structure](#10-folder-structure)
11. [Security Considerations](#11-security-considerations)
12. [Performance Requirements](#12-performance-requirements)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. Technology Decisions

### Framework: Next.js 15 (App Router)

| Criterion | Decision | Rationale |
|-----------|----------|-----------|
| **Framework** | Next.js 15 App Router | Required for server components, streaming SSR, and parallel routes in investigation workspace. App Router provides layout nesting, loading states, and error boundaries at the route segment level — critical for the module-based IA. |
| **Language** | TypeScript 5.6 (strict mode) | Non-negotiable for enterprise codebase. `strict: true` with `noUncheckedIndexedAccess` catches null/undefined bugs in risk score calculations and filter state. |
| **Styling** | Tailwind CSS v4 + `tailwind-variants` | Utility-first with component-level variants. The design system has 4 severity levels × 3 size variants × 2 states = 24 alert badge permutations — `tailwind-variants` handles this without runtime overhead. No CSS-in-JS runtime for bundle size. |
| **State (Client)** | Zustand + `zustand/middleware` (persist, devtools, immer) | Lightweight (1.2KB) compared to Redux (12KB+). Persist middleware handles workspace preferences and role-adaptive view state. Immer middleware simplifies nested state updates for filter/query objects. |
| **State (Server)** | TanStack Query v5 (`@tanstack/react-query`) | De facto standard for server state. Provides caching, deduplication, stale-while-revalidate, and optimistic updates for disposition actions. Refetch intervals for real-time dashboard widgets. |
| **API Client** | `tRPC` client + `zod` validation | End-to-end type safety from API handlers to React components. Zod schemas validate both API responses and form inputs. For external integrations (Slack, PagerDuty), use plain fetch with typed wrappers. |
| **Data Fetching** | Next.js Server Components (default) + TanStack Query (client interactions) | Server components fetch initial page data (dashboard summary, model list). TanStack Query handles client-side mutations, refetching, and pagination for event lists and audit logs. |
| **Forms** | `react-hook-form` + `zod` | Policy rule builder has nested conditional fields (IF/THEN/scope). React Hook Form handles dynamic field arrays without re-renders. Zod validates before submission. |
| **Charts** | `@observablehq/plot` + `recharts` for interactive | Observable Plot for trend charts and severity distribution (density, concise API). Recharts for interactive bar/line charts in Analytics module (tooltips, zoom, legends). |
| **Tables** | `@tanstack/react-table` v8 | Headless table with sorting, filtering, column visibility, pagination, and row selection. Event list (50+ columns with virtualized rows), audit log, model list — all use the same table primitives. |
| **Virtualization** | `@tanstack/react-virtual` | Virtualized rows for event lists (potentially 10K+ events), audit log entries, and compliance control checklists. Only visible rows render in the DOM. |
| **Animation** | `framer-motion` | Purpose-built for layout animations (sidebar collapse, alert pulse, skeleton transitions). Respects `prefers-reduced-motion`. Only 5KB tree-shaken. |

### Why Not Alternatives

| Rejected | Reason |
|----------|--------|
| Remix | Weaker data fetching story for real-time dashboard widgets. No parallel routes like Next.js App Router. |
| SPA (React Router) | No SSR for marketing site, no streaming for slow API responses, no RSC for zero-bundle dashboard data. |
| Redux | Overkill. Our global state is small (user, workspace, UI preferences). Zustand handles it. |
| vanilla-extract / Panda CSS | Tailwind's utility model matches our design token system. CSS-in-JS adds runtime cost. |
| Chart.js / D3 | D3 is too low-level for dashboard velocity. Chart.js has worse React integration than Recharts. |

### Package Versions (Baseline)

```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "typescript": "^5.6.0",
  "tailwindcss": "^4.0.0",
  "zustand": "^5.0.0",
  "@tanstack/react-query": "^5.60.0",
  "@tanstack/react-table": "^8.20.0",
  "@tanstack/react-virtual": "^3.10.0",
  "react-hook-form": "^7.53.0",
  "zod": "^3.23.0",
  "@observablehq/plot": "^0.6.0",
  "recharts": "^2.13.0",
  "framer-motion": "^11.11.0",
  "tailwind-variants": "^0.2.0"
}
```

---

## 2. Application Architecture

### High-Level Module Map

```
sentinelai-app (Next.js 15)
├── marketing          # Public marketing site (static)
│   ├── pages: /, /pricing, /docs, /changelog, /status
│   └── SSR: none (static generation, ISR)
│
├── auth               # Authentication
│   ├── pages: /login, /login/sso, /auth/callback
│   ├── login modes: SSO/SAML, OAuth, Magic Link
│   └── session: NextAuth.js / custom JWT handler
│
├── app                # Authenticated application shell
│   ├── layout         # Sidebar + TopNav + WorkspaceSelector
│   ├── dashboard      # Risk at a glance, role-adaptive
│   ├── models         # Model registry & monitoring
│   ├── risk-events    # Event triage center
│   ├── investigations # Deep-dive investigation workspace
│   ├── audit-logs     # Immutable log explorer
│   ├── analytics      # Trends, comparisons, compliance reports
│   ├── policies       # Guardrail rule engine
│   ├── api-usage      # API consumption & rate limits
│   ├── team           # RBAC management
│   └── settings       # Workspace configuration
│
├── shared             # Cross-cutting concerns
│   ├── components     # Design system primitives
│   ├── hooks          # Shared React hooks
│   ├── lib            # Utilities, constants
│   └── types          # Global TypeScript types
```

### Module Responsibilities

| Module | Page(s) | Owner Persona | Data Sources | Server Component? |
|--------|---------|---------------|--------------|-------------------|
| **Dashboard** | `/dashboard` | All | `GET /dashboard/summary`, `GET /dashboard/trends` | Yes — initial data HTML-streamed |
| **Models** | `/models`, `/models/[id]` | Maya | `GET /models`, `GET /models/[id]` | Yes — list, detail server-rendered |
| **Risk Events** | `/risk-events`, `/risk-events/[id]` | Maya, Priya | `GET /events`, `GET /events/[id]` | Partial — list server, detail client |
| **Investigations** | `/investigations/[id]` | Maya, Priya | `GET /investigations/[id]` | Client — heavy interactivity |
| **Audit Logs** | `/audit-logs` | David, Priya | `GET /audit` | Partial — table client-rendered |
| **Analytics** | `/analytics/*` | Marcus, David | `GET /analytics/*` | Client — chart interactivity |
| **Policies** | `/policies`, `/policies/[id]` | Maya | `GET /policies`, `POST /policies` | Partial — list server, editor client |
| **API Usage** | `/api-usage` | Maya | `GET /usage` | Client — real-time metrics |
| **Team** | `/team/*` | David, Marcus | `GET /team/*` | Yes — CRUD forms server-rendered |
| **Settings** | `/settings/*` | All | `GET /workspace`, `GET /integrations` | Partial — config pages server-rendered |

### Route Type Classification

| Type | Behavior | Examples |
|------|----------|---------|
| **Server Page** | Data fetched in server component, HTML streamed. Zero client JS for data loading. | Dashboard, Model List, Settings General |
| **Hybrid Page** | Server component shell + client component island. Skeleton shown immediately, interactive content hydrates. | Risk Event List, Audit Log |
| **Client Page** | Full client-side rendering. Required for heavy interactivity (charts, drag-and-drop, real-time collaboration). | Investigations, Analytics |
| **Modal / Parallel** | Rendered as a modal overlay without leaving the current page. URL updates independently. | Create Rule (from event), Invite Member |

---

## 3. Route Structure

### Complete Route Map

```
/                                       → Marketing Site (Landing)
/pricing                                → Marketing Site (Pricing)
/docs                                   → Documentation
/changelog                              → Changelog
/status                                 → Status Page

/login                                  → Auth: Sign In
/login/sso                              → Auth: SSO/SAML
/auth/callback                          → Auth: OAuth callback
/auth/error                             → Auth: Error display

/app                                    → Application Shell (redirect to /app/dashboard)

/app/dashboard                          → Dashboard (role-adaptive)

/app/models                             → Model List
/app/models/new                         → Model Registration Form
/app/models/[id]                        → Model Detail
/app/models/[id]/alerts                 → Model Alerts Tab (default)
/app/models/[id]/baselines              → Model Baselines Tab
/app/models/[id]/policies               → Model Guardrails Tab
/app/models/[id]/audit                  → Model Audit Tab

/app/risk-events                        → Risk Event List
/app/risk-events/[id]                   → Risk Event Detail
/app/risk-events/[id]/evidence          → Evidence Export (download)

/app/investigations                     → Investigation List
/app/investigations/[id]                → Investigation Workspace

/app/audit-logs                         → Audit Log Explorer
/app/audit-logs/[id]                    → Audit Entry Detail

/app/analytics                          → Analytics Overview
/app/analytics/trends                   → Risk Trends Dashboard
/app/analytics/comparison               → Model Comparison
/app/analytics/teams                    → Team Metrics
/app/analytics/compliance               → Compliance Reporting

/app/policies                           → Policy List
/app/policies/new                       → Rule Builder
/app/policies/[id]                      → Rule Detail / Edit
/app/policies/templates                 → Rule Templates

/app/api-usage                          → API Usage Dashboard

/app/team                               → Team Overview
/app/team/members                       → Member List
/app/team/members/invite                → Invite Member
/app/team/roles                         → Roles & Permissions

/app/settings                           → Settings Overview
/app/settings/general                   → General Settings
/app/settings/integrations              → Integration Management
/app/settings/integrations/[type]/setup → Integration Setup Wizard
/app/settings/sso                       → SSO Configuration
/app/settings/workspaces                → Workspace Management
/app/settings/billing                   → Billing & Plan
/app/settings/billing/invoices          → Invoice History
/app/settings/api-keys                  → API Key Management

### Parallel Routes (Modals)

Create Rule from Event Investigation:
/app/investigations/[id]                → Background page
/app/investigations/[id]/create-rule    → Modal overlay (parallel route @modal)

Invite Member:
/app/team/members                       → Background page
/app/team/members/invite                → Modal overlay (parallel route @modal)

### Route Behavior Rules

| Rule | Implementation |
|------|---------------|
| All `/app/*` routes require authentication | `middleware.ts` checks session, redirects to `/login` |
| Role-based access enforced at route level | `/app/policies/*` blocked for `compliance` role (redirect to 403) |
| Workspace ID in URL? | No — workspace is session-level. Workspace switch = session refresh |
| Modal routes change URL | Parallel route modals push a new URL entry. Browser back closes modal, not page |
| 404 for unknown routes | `not-found.tsx` at `/app` segment |
| 403 for unauthorized access | `forbidden.tsx` at `/app` segment |
```

### Route Architecture Implementation

```typescript
// src/app/app/layout.tsx — Authenticated layout
export default function AppLayout({ children, modal }: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <AppProviders>
      <Sidebar />
      <main>
        <TopNav />
        {children}
      </main>
      {modal} {/* Parallel route renders here */}
    </AppProviders>
  );
}

// src/app/app/investigations/[id]/layout.tsx
export default function InvestigationLayout({ children, modal }: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal} {/* "Create Rule" modal over investigation */}
    </>
  );
}
```

---

## 4. Layout Architecture

### Layout Hierarchy

```
RootLayout (html, body, fonts)
├── MarketingLayout (/, /pricing, /docs, /changelog, /status)
│   └── Marketing header + footer (no auth)
│
└── AppLayout (/app/*)
    ├── Sidebar (240px, collapsible to 64px)
    ├── TopNav (56px)
    ├── Content Area (flex-grow)
    │   ├── ModuleLayout (per-module: /dashboard, /models, etc.)
    │   │   └── Page Shell (header, breadcrumbs, actions)
    │   └── Modal Slot (parallel route, optional)
    └── Global Command Palette (Cmd+K)
```

### Sidebar

**States:**

| State | Width | Behavior |
|-------|-------|----------|
| Expanded | 240px | Full labels, icons, active indicator. Default for desktop (>1200px) |
| Collapsed | 64px | Icons only. Hover expands sub-items in a popover. Default for tablet (768-1200px) |
| Hidden | 0 | Slide out of view. Toggle via hamburger or Cmd+\. Mobile default (<768px) |

**Items (priority order):**

```
Logo + Product Name
──────────────
Dashboard        [icon: shield]          — All roles
Models           [icon: box]             — All roles
Risk Events      [icon: activity]        — All roles
Investigations   [icon: search]          — All roles
──────────────
Audit Logs       [icon: file-text]       — Admin, Compliance, Viewer
Analytics        [icon: bar-chart]       — All roles
Policies         [icon: shield-off]      — Admin, Editor (hidden for Compliance, Viewer)
──────────────
API Usage        [icon: terminal]        — Admin, Editor
Team             [icon: users]           — Admin, Editor (hidden for Compliance, Viewer)
Settings         [icon: settings]        — Admin, Editor, Compliance
──────────────
Help & Support   [icon: help-circle]     — Bottom section
Changelog        [icon: git-commit]      — Bottom section
```

**Implementation:**

```typescript
// Sidebar item visibility per role
const SIDEBAR_ITEMS: SidebarItem[] = [
  { href: '/app/dashboard',       icon: Shield,    label: 'Dashboard',       roles: ['admin', 'editor', 'viewer', 'compliance'] },
  { href: '/app/models',          icon: Box,       label: 'Models',          roles: ['admin', 'editor', 'viewer', 'compliance'] },
  { href: '/app/risk-events',     icon: Activity,  label: 'Risk Events',     roles: ['admin', 'editor', 'viewer', 'compliance'] },
  { href: '/app/investigations',  icon: Search,    label: 'Investigations',  roles: ['admin', 'editor', 'viewer', 'compliance'] },
  { type: 'divider' },
  { href: '/app/audit-logs',      icon: FileText,  label: 'Audit Logs',      roles: ['admin', 'editor', 'viewer', 'compliance'] },
  { href: '/app/analytics',       icon: BarChart,  label: 'Analytics',       roles: ['admin', 'editor', 'viewer', 'compliance'] },
  { href: '/app/policies',        icon: ShieldOff, label: 'Policies',        roles: ['admin', 'editor'] },
  { type: 'divider' },
  { href: '/app/api-usage',       icon: Terminal,  label: 'API Usage',       roles: ['admin', 'editor'] },
  { href: '/app/team',            icon: Users,     label: 'Team',            roles: ['admin', 'editor'] },
  { href: '/app/settings',        icon: Settings,  label: 'Settings',        roles: ['admin', 'editor', 'compliance'] },
];
```

### Top Navigation

```
┌────────────────────────────────────────────────────────────────┐
│ [☰]  [Breadcrumb: Analytics > Risk Trends]          [Notifications] [Profile ▾] │
└────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| **Hamburger** | Toggle sidebar collapsed state (mobile: toggle visibility) |
| **Breadcrumb** | Auto-generated from route segments. Clickable segments for parent navigation |
| **Workspace Selector** | Dropdown in breadcrumb area (when multi-workspace). Shows "All Workspaces" for admin |
| **Global Search (Cmd+K)** | Modal overlay. Searches: models, events, policies, settings. Recent searches shown |
| **Notification Bell** | Badge count of unread alerts. Click → dropdown of recent notifications |
| **Profile Menu** | Avatar + dropdown: Preferences, Theme, Sign Out |
| **Contextual Actions** | Right side of top nav: module-specific actions (Export, Share, Create) |

### User Menu

```typescript
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar src={user.avatar} fallback={user.initials} />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
    <DropdownMenuLabel variant="muted">{user.email}</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Preferences</DropdownMenuItem>
    <DropdownMenuItem>Theme: System / Dark / Light</DropdownMenuItem>
    <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Documentation</DropdownMenuItem>
    <DropdownMenuItem>Changelog</DropdownMenuItem>
    <DropdownMenuItem>Status</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="danger">Sign Out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Notification Center

| Feature | Detail |
|---------|--------|
| **Trigger** | Bell icon with badge (unread count) |
| **Types** | Critical alert, rule triggered, disposition completed, policy changed, weekly digest |
| **Grouping** | By severity: critical first, then by recency |
| **Actions** | Mark read, view → navigate to event, dismiss |
| **Real-time** | WebSocket connection for push notifications |
| **Empty** | "No new notifications" |

### Workspace Selector

Shown in breadcrumb area when user has access to multiple workspaces:

```
[Workspace: Acme Corp ▾] > Analytics > Risk Trends
```

- Dropdown shows workspace name + member count + active alert count
- Switching workspace triggers page reload (new session context)
- Admin sees "All Workspaces" option for cross-workspace views

---

## 5. Component Architecture

### 5.1 Design System Primitives

```
src/components/ui/
├── Button.tsx               # Variants: primary, secondary, ghost, danger. Sizes: sm, md, lg
├── Badge.tsx                # Severity: critical, warning, info, success, neutral
├── Card.tsx                 # Container with header, body, footer slots
├── Input.tsx                # Text input with label, error, hint states
├── Select.tsx               # Native select with custom styling
├── Tabs.tsx                 # Underline or contained style, keyboard navigable
├── Modal.tsx                # Dialog with overlay, close, focus trap, escape handler
├── Table.tsx                # TanStack Table primitives (Sheet, Header, Row, Cell, Pagination)
├── DropdownMenu.tsx         # Context menu with keyboard navigation
├── Skeleton.tsx             # Loading placeholder with pulse animation
├── Toast.tsx                # Toast notification system (success, error, info, warning)
├── Tooltip.tsx              # Hover tooltip with delay
├── ProgressBar.tsx          # Linear progress (for report generation, baseline learning)
├── Avatar.tsx               # User avatar with image/fallback initials
├── CommandPalette.tsx       # Cmd+K search modal
└── EmptyState.tsx           # Icon + heading + description + CTA
```

### 5.2 Dashboard Page

```
DashboardPage (server component)
├── DashboardHeader
│   ├── PageTitle ("Dashboard")
│   ├── ViewSelector           # Tabs: Engineer / Security / Compliance / Executive
│   └── DateRangePreset        # "Last 24h" (default, static for dashboard)
│
├── RiskHealthScoreCard
│   ├── HealthScoreGauge       # 0-100 with color (green/yellow/red)
│   ├── TrendIndicator         # Up/Down/Flat arrow + Δ value
│   ├── StatusMessage          # "Your AI risk posture is healthy."
│   └── SkeletonState          # Full-width skeleton rectangle
│   └── ErrorState             # "Unable to load risk score. [Retry]"
│   └── EmptyState             # "Connect your first model to see your AI risk posture."
│
├── DashboardGrid              # Responsive grid (2 columns desktop, 1 mobile)
│   ├── ActiveAlertsCard
│   │   ├── AlertCountRow     # Critical count (red) + Warning count (yellow) + Info count (blue)
│   │   │   ├── SeverityBadge (critical) + count
│   │   │   ├── SeverityBadge (warning) + count
│   │   │   └── SeverityBadge (info) + count
│   │   └── ViewAllLink
│   │
│   ├── TopRisksCard
│   │   ├── RiskItem (×3)      # Rank + title + model + delta + severity badge
│   │   │   └── Click → /app/risk-events/[id]
│   │   └── ViewAllLink
│   │
│   ├── RiskTrendChart
│   │   ├── LineChart          # Observable Plot. 7 data points. Interactive tooltip.
│   │   └── EmptyState         # "Insufficient data. Baseline requires 7 days."
│   │
│   ├── RecentIncidentsPanel
│   │   ├── IncidentItem (×5)  # Icon + "PII leak — blocked @ 14:22"
│   │   └── EmptyState         # "No resolved events yet."
│   │
│   └── IncidentMetricsPanel   # Bottom: Open incidents count, avg MTTR
│
└── DashboardActions            # Quick action bar
    ├── QuickActionButton (Investigate Critical Alert)
    ├── QuickActionButton (Review Policy Effectiveness)
    └── QuickActionButton (Generate Compliance Snapshot)
```

### 5.3 Risk Events Page

```
RiskEventsPage (hybrid: server list + client filter)
├── PageHeader
│   ├── Title ("Risk Events")
│   ├── EventCount              # Total count from API
│   └── BulkActions             # Enabled when rows selected
│       ├── BulkDismissButton
│       └── BulkEscalateButton
│
├── EventFilters
│   ├── FilterBar               # Horizontal bar of active filters
│   ├── SeverityFilter          # Multi-select: Critical, Warning, Info
│   ├── RiskTypeFilter          # Multi-select: Injection, PII, Drift, Toxicity
│   ├── ModelFilter             # Multi-select (populated from /models)
│   ├── EnvironmentFilter       # Multi-select: Production, Staging
│   ├── StatusFilter            # Multi-select: Active, Resolved, Dismissed
│   ├── DateRangeFilter         # Preset picker + custom range
│   └── SearchInput             # Search by ID or input text
│
├── EventsTable
│   ├── Table (TanStack)
│   │   ├── Column: Severity (badge with icon)
│   │   ├── Column: Event ID (truncated, monospace)
│   │   ├── Column: Risk Type (badge)
│   │   ├── Column: Risk Score (0.00-1.00 with bar)
│   │   ├── Column: Model (name + env badge)
│   │   ├── Column: Timestamp (relative + absolute tooltip)
│   │   ├── Column: Status (badge)
│   │   └── Column: Actions (View, Quick Disposition)
│   ├── VirtualizedRows        # @tanstack/react-virtual for >100 rows
│   ├── TablePagination
│   ├── ColumnVisibilityMenu   # Toggle which columns show
│   └── SortIndicator          # Click column header to sort
│
├── EmptyState                 # "No risk events match your filters."
├── LoadingState               # Skeleton table (15 rows)
└── ErrorState                 # "Failed to load events. [Retry]"
```

### 5.4 Risk Event Detail Page

```
RiskEventDetailPage (client)
├── EventDetailHeader
│   ├── BackButton            # Back to event list (preserves filters via URL)
│   ├── EventIdBadge          # "EVT-001" monospace
│   ├── SeverityBadge         # CRITICAL / WARNING / INFO
│   ├── RiskScoreDisplay      # "0.94" with mini confidence bar
│   ├── Timestamp             # "22 Jun 2026, 14:22:03 UTC" (absolute)
│   └── ActionButtons         # [Export Evidence] [Take Action ▾]
│
├── EventDetailGrid
│   ├── RiskBreakdownPanel
│   │   ├── CategoryDonutChart    # Donut: Injection (0.94), PII (0.12), Toxicity (0.03)
│   │   └── CategoryList          # Per-category: score, confidence, trend
│   │       └── CategoryItem (×N)
│   │
│   ├── InputSummaryPanel
│   │   ├── TruncatedInputText   # With "show full" toggle
│   │   ├── InputHashBadge       # SHA-256 fingerprint
│   │   └── InputMetadata        # Length, token count, special chars
│   │
│   ├── SimilarEventsPanel
│   │   ├── SimilarEventItem (×N) # Type, model, score, timestamp
│   │   └── ViewAllLink
│   │
│   ├── DispositionHistoryPanel
│   │   └── DispositionItem (×N)  # Action + actor + note + timestamp
│   │
│   └── QuickActionsCard
│       ├── QuickActionButton    # [Block Pattern] — add to blocklist
│       ├── QuickActionButton    # [Create Rule] — open rule builder (parallel modal)
│       ├── QuickActionButton    # [Escalate] — create Jira ticket
│       ├── QuickActionButton    # [Mark as FP] — feedback loop
│       └── QuickActionButton    # [Dismiss] — with reason code selector
│
└── TabsContainer
    ├── SummaryTab              # Default — risk breakdown + input summary
    ├── TokenHeatmapTab
    │   ├── TokenHeatmap        # Grid of tokens, colored by contribution
    │   │   └── TokenCell (×N)  # Background color: red→green gradient
    │   ├── HeatmapLegend       # Color scale: High Risk → Safe
    │   └── TokenDetailTooltip  # Hover: token text, contribution score, category
    │
    └── RawEventTab
        ├── JsonViewer           # Syntax-highlighted JSON
        ├── CopyButton           # Copy to clipboard
        └── DownloadButton       # Download JSON file
```

### 5.5 Investigation Workspace

```
InvestigationPage (client)
├── InvestigationHeader
│   ├── BackButton
│   ├── EventIdBadge
│   ├── SeverityBadge + RiskScore
│   ├── ActionButtons [Export Evidence] [Share ▾] [Take Action ▾]
│   └── RecommendationsChip   # "1 action recommended"
│
├── InvestigationSplitView     # 3-column layout
│   ├── TimelinePanel (left, 280px)
│   │   ├── TimelineHeader ("Timeline") + ZoomControls (1h/6h/24h/7d)
│   │   ├── TimelineList
│   │   │   └── TimelineEvent (×N)
│   │   │       ├── TimelineDot    # Colored by type: red=risk, green=deploy, blue=config
│   │   │       ├── TimelineLine   # Vertical connector
│   │   │       ├── EventTitle     # Type + detail
│   │   │       └── EventTime      # Relative + absolute
│   │   └── NowIndicator
│   │
│   ├── DetailPanel (center, flex)
│   │   ├── SummaryTab
│   │   │   ├── RiskBreakdownChart    # Donut
│   │   │   ├── CategoryCards (×N)    # Per-category detail
│   │   │   └── InputOutputView       # Collapsible input/output
│   │   ├── TokenHeatmapTab
│   │   │   ├── TokenHeatmapGrid
│   │   │   └── Legend
│   │   └── RawEventTab
│   │       └── JsonViewer
│   │
│   └── RecommendationsPanel (right, 300px)
│       ├── RecommendationsHeader ("Recommendations")
│       ├── RecommendationCard (×N)
│       │   ├── ActionLabel       # "Block 'ignore previous' pattern"
│       │   ├── ConfidenceBadge   # "94% confidence"
│       │   └── ApplyButton       # [Apply] → confirm → execute
│       └── SimilarEventsSection
│           ├── SimilarEventItem (×N)
│           └── ViewAllLink
│
└── ModalSlot (parallel route)
    └── CreateRuleModal (when triggered from recommendation)
        ├── RuleBuilder
        └── FormActions [Save] [Cancel]
```

### 5.6 Models Page

```
ModelsPage (server component)
├── PageHeader
│   ├── Title ("Models")
│   ├── ModelCount
│   └── RegisterModelButton     # → /app/models/new
│
├── ModelsGrid                   # Responsive card grid
│   └── ModelCard (×N)
│       ├── ModelName + Provider badge
│       ├── RiskScoreMini        # Color-coded bar
│       ├── AlertCount (by severity)
│       ├── EnvironmentBadge     # Production / Staging
│       ├── StatusIndicator      # Healthy / Degraded / Down
│       └── Click → /app/models/[id]
│
└── ModelRegistrationForm (page: /app/models/new)
    ├── FormField: Name (text)
    ├── FormField: Provider (select: OpenAI, Anthropic, Azure, Custom)
    ├── FormField: Endpoint (URL with validation)
    ├── FormField: Environment (select: Production, Staging, Development)
    ├── FormField: API Key (password input, masked, optional)
    ├── ConnectionTestButton     # Validates endpoint before submit
    └── FormActions [Cancel] [Save & Start Monitoring]
```

### 5.7 Analytics Pages

```
AnalyticsOverviewPage (client)
├── PageHeader
│   ├── Title ("Analytics")
│   ├── TabNav: [Trends] [Model Comparison] [Teams] [Compliance]
│   └── FilterBar
│       ├── TimeRangeSelector    # Tabs: 7d / 30d / 90d / Custom
│       ├── ModelMultiSelect     # Filter by model(s)
│       ├── TeamFilter           # Filter by team
│       └── EnvironmentFilter    # Production / Staging / All
│
├── RiskTrendsPage
│   ├── RiskScoreTrendChart      # Line chart, multi-model overlay
│   ├── AlertVolumeChart         # Stacked bar (severity × day)
│   ├── ModelBreakdownTable      # Per-model: avg score, alerts, Δ
│   └── TopRiskTypesChart        # Horizontal bar (risk type × count)
│
├── ModelComparisonPage
│   ├── ModelSelector             # Multi-select checkboxes
│   ├── ComparisonChart           # Grouped bar chart
│   └── ComparisonDetailTable     # Data table with sort
│
├── TeamMetricsPage (P1)
│   ├── TeamSummaryCards          # Size, models, alerts, MTTR
│   ├── TeamTrendChart            # Line chart
│   └── MemberActivityTable       # Member × investigations × avg time
│
└── ComplianceReportingPage (P1)
    ├── FrameworkTabs             # EU AI Act / SOC 2 / ISO 42001 / NIST
    ├── ComplianceGauge           # 0-100% gauge chart
    ├── ControlChecklistTable     # Control ID, status (pass/fail), evidence
    └── GenerateReportButton      # → downloads PDF
```

### 5.8 Audit Logs Page

```
AuditLogsPage (hybrid)
├── PageHeader
│   ├── Title ("Audit Logs")
│   ├── IntegrityBadge              # "Chain verified ✓" or "Chain broken ✗"
│   └── ExportButton                # CSV / JSON
│
├── AuditFilters
│   ├── ActorFilter                 # Search/select by user
│   ├── ActionTypeFilter            # Multi-select (created, updated, deleted)
│   ├── ResourceTypeFilter          # Multi-select (model, policy, setting)
│   ├── DateRangeFilter
│   └── SearchInput
│
├── AuditTable                      # Virtualized
│   ├── Column: Timestamp
│   ├── Column: Actor (avatar + name)
│   ├── Column: Action (badge: created/updated/deleted)
│   ├── Column: Resource (type + name)
│   ├── Column: Details (truncated diff summary)
│   └── Column: Hash (truncated, tooltip with full hash)
│
└── AuditEntryDetailModal (parallel @modal)
    ├── EntryMetadata               # ID, timestamp, actor, IP, user agent
    ├── BeforeAfterDiff              # JSON diff viewer
    ├── HashChainInfo                # Previous hash → current hash
    └── Actions [Copy JSON] [Report Issue]
```

### 5.9 Policies Page

```
PoliciesPage (hybrid)
├── PageHeader
│   ├── Title ("Policies")
│   ├── ActiveRuleCount
│   └── CreateRuleButton           # → /app/policies/new
│
├── PoliciesTable
│   ├── Column: Name + Description
│   ├── Column: Condition (IF summary)
│   ├── Column: Action (THEN: block/flag/alert/escalate)
│   ├── Column: Status (toggle: enabled/disabled)
│   ├── Column: Triggers (24h count)
│   ├── Column: Effectiveness (TP/FP rate)
│   └── Column: Actions [Edit] [Test] [Delete]
│
├── RuleBuilderPage (client, /app/policies/new or /app/policies/[id])
│   ├── FormField: Name
│   ├── FormField: Description
│   ├── ConditionBuilder
│   │   ├── ConditionRow (×N)
│   │   │   ├── FieldSelect        # Risk type: injection_score, pii_score, drift, output_toxicity
│   │   │   ├── OperatorSelect     # >, >=, <, <=, between
│   │   │   └── ValueInput         # Number or range slider
│   │   └── AddConditionButton
│   ├── ActionSelect               # THEN: block / flag / alert / escalate / log_only
│   ├── ScopeSelector              # Models, environments, teams
│   ├── PreviewPanel               # "This rule would have caught 47 events in the last 7 days"
│   └── DryRunButton               # Test against historical data
│
└── RuleTemplatesPage
    └── RuleTemplateCard (×N)
        ├── TemplateName, Description
        ├── PreviewCondition
        └── UseTemplateButton
```

### 5.10 Settings Pages

```
SettingsPage (hybrid)
├── SettingsSidebar
│   ├── SettingsNavItem: General
│   ├── SettingsNavItem: Integrations
│   ├── SettingsNavItem: SSO
│   ├── SettingsNavItem: Workspaces
│   ├── SettingsNavItem: Billing
│   └── SettingsNavItem: API Keys
│
├── GeneralSettings
│   └── WorkspaceForm              # Name, slug, timezone
│
├── IntegrationsPage
│   ├── IntegrationCard (×N)
│   │   ├── IntegrationLogo + Name
│   │   ├── ConnectionStatusBadge  # Connected / Failed / Pending
│   │   ├── LastSyncTimestamp
│   │   ├── ConfigureButton / ConnectButton
│   │   └── RemoveButton
│   └── IntegrationSetupWizard (modal, parallel route)
│       ├── Step 1: Auth
│       ├── Step 2: Configuration
│       ├── Step 3: Test Connection
│       └── Step 4: Done
│
├── SSOPage
│   ├── SSOStatusCard              # Enabled / Disabled
│   ├── IdpMetadataUpload          # XML file upload
│   ├── AttributeMappingForm       # Email, name, role
│   └── TestSSOButton
│
├── WorkspaceSettings
│   └── WorkspaceTable             # Multi-workspace management
│
├── BillingPage
│   ├── PlanCard                   # Current plan, features
│   ├── UsageSummary               # Requests this month, rate limit %
│   ├── InvoiceTable               # Invoice history
│   └── PaymentMethodForm
│
└── ApiKeysPage
    ├── ApiKeyList
    │   └── ApiKeyItem             # Name, prefix..., created date, last used
    │       └── Actions [Copy] [Revoke]
    └── GenerateKeyForm            # Name + scope + submit → show once
```

### 5.11 Shared Components

```
Shared/Composite Components:
├── UserNav                        # Avatar + dropdown (profile, theme, sign out)
├── NotificationBell               # Bell icon + badge + dropdown list
├── GlobalSearch (Cmd+K)           # Modal with search input + results
│   ├── SearchInput                # Auto-focus, keyboard navigation
│   ├── SearchResults              # Grouped by type (Models, Events, Policies, Settings)
│   └── RecentSearches             # Persisted in localStorage
├── Breadcrumb                     # Auto-generated from route segments
├── PageHeader                     # Title + description + actions slot
├── ConfirmDialog                  # "Are you sure?" with optional reason input
├── FeedbackToast                  # Success/Error/Info toast with auto-dismiss
├── CopyButton                     # Click to copy text/JSON to clipboard
├── ExportButton                   # Dropdown: CSV, JSON, PDF
├── TimeRangeSelector              # Presets (7d, 30d, 90d) + custom date picker
├── ModelSelector                  # Multi-select dropdown of models
├── EnvironmentBadge               # "Production" / "Staging" / "Development"
└── EmptyState                     # Icon + heading + description + CTA
```

### Component Composition Rules

| Rule | Enforcement |
|------|-------------|
| Pages compose sections, sections compose widgets, widgets compose primitives | Directory structure enforces this: `ui/` → `widgets/` → `sections/` → `pages/` |
| No data fetching in primitives | `Button`, `Card`, `Table` receive data as props. No `useQuery` in `ui/` |
| Sections own their data | `RiskHealthScoreCard` calls its own `useQuery` for dashboard summary data |
| Pages own layout and orchestrate sections | `DashboardPage` arranges sections in a grid. No layout logic in sections |
| Role-adaptive logic in sections, not pages | `RiskHealthScoreCard` accepts `role` prop and adjusts content |

---

## 6. State Management Architecture

### State Categories

| Category | Tool | What It Holds | Persistence |
|----------|------|---------------|-------------|
| **Global State** | Zustand | User, workspace, role, sidebar state, preferences | localStorage (preferences), cookie (session) |
| **Server State** | TanStack Query | Dashboard data, events, models, policies, audit logs | In-memory cache + stale-while-revalidate |
| **Local State** | `useState` / `useReducer` | Form inputs, UI state (open/close), tab selection | None (resets on unmount) |
| **URL State** | `useSearchParams` | Filters, pagination, sort order, active tab | URL (bookmarkable, shareable) |
| **Form State** | `react-hook-form` | Form values, validation errors, dirty fields | None (resets on submit) |

### Global State Schema (Zustand)

```typescript
interface AppState {
  // User & Session
  user: User | null;
  workspace: Workspace | null;
  role: 'admin' | 'editor' | 'viewer' | 'compliance';

  // UI Preferences
  sidebarCollapsed: boolean;
  theme: 'system' | 'light' | 'dark';
  roleAdaptiveView: 'engineer' | 'security' | 'compliance' | 'executive';

  // Notifications
  unreadNotifications: number;
  lastNotificationCheck: string; // ISO timestamp

  // Actions
  setUser: (user: User) => void;
  setWorkspace: (workspace: Workspace) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  setRoleAdaptiveView: (view: RoleAdaptiveView) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}
```

### Server State Query Keys

```typescript
// TanStack Query key factory
export const queryKeys = {
  dashboard: {
    summary: (workspaceId: string) => ['dashboard', 'summary', workspaceId],
    trends: (workspaceId: string, window: string) => ['dashboard', 'trends', workspaceId, window],
  },
  models: {
    all: (workspaceId: string) => ['models', workspaceId],
    detail: (modelId: string) => ['models', 'detail', modelId],
    events: (modelId: string, filters: EventFilters) => ['models', modelId, 'events', filters],
    baselines: (modelId: string) => ['models', modelId, 'baselines'],
    policies: (modelId: string) => ['models', modelId, 'policies'],
  },
  events: {
    list: (filters: EventFilters) => ['events', 'list', filters],
    detail: (eventId: string) => ['events', 'detail', eventId],
    explain: (eventId: string) => ['events', 'explain', eventId],
    similar: (eventId: string, window: string) => ['events', 'similar', eventId, window],
  },
  investigations: {
    detail: (eventId: string) => ['investigations', eventId],
  },
  policies: {
    all: (workspaceId: string) => ['policies', workspaceId],
    detail: (policyId: string) => ['policies', 'detail', policyId],
    executions: (policyId: string) => ['policies', policyId, 'executions'],
  },
  audit: {
    list: (filters: AuditFilters) => ['audit', 'list', filters],
    detail: (entryId: string) => ['audit', 'detail', entryId],
    verify: () => ['audit', 'verify'],
  },
  analytics: {
    trends: (window: string, filters: AnalyticsFilters) => ['analytics', 'trends', window, filters],
    comparison: (modelIds: string[]) => ['analytics', 'comparison', ...modelIds],
    compliance: (framework: string) => ['analytics', 'compliance', framework],
  },
  team: {
    members: (workspaceId: string) => ['team', workspaceId, 'members'],
    roles: () => ['team', 'roles'],
  },
  usage: {
    summary: (window: string) => ['usage', window],
    topConsumers: () => ['usage', 'top-consumers'],
  },
  settings: {
    workspace: (workspaceId: string) => ['settings', 'workspace', workspaceId],
    integrations: (workspaceId: string) => ['settings', 'integrations', workspaceId],
  },
};
```

### Data Flow Patterns

```
Server Component                    Client Component
─────────────────                   ────────────────
Page (Server)                       
├── fetch data directly             
├── stream HTML                     
└── <ClientComponent>  ──────────>  Retrieves Server State
    ⚡ initialData from RSC props    ⚡ hydrate from server payload
                                     ⚡ refetch on interval (30s)
                                     ⚡ mutate on user action (optimistic)
                                     ⚡ invalidate related queries on success
```

### Caching Strategy

| Data Type | staleTime | gcTime | Refetch Interval | Refetch on Mount? |
|-----------|-----------|--------|------------------|-------------------|
| Dashboard summary | 10s | 5min | 30s | Yes |
| Dashboard trends | 1min | 5min | Manual pull | Yes |
| Event list | 30s | 5min | 60s (polling) | Yes |
| Event detail | 30s | 5min | None | Yes |
| Investigation | 30s | 5min | None | Yes (single view) |
| Model list | 1min | 10min | 60s | Yes |
| Model detail | 30s | 5min | 30s | Yes |
| Policy list | 1min | 5min | 60s | Yes |
| Audit log | 30s | 5min | None | Yes |
| Analytics data | 1min | 10min | Manual pull | Yes |
| Team members | 5min | 30min | None | No |
| Settings | 5min | 30min | None | No |
| Usage data | 30s | 5min | 30s | Yes |

---

## 7. API Integration Layer

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Component                    │
│  useQuery / useMutation                              │
│       │                                              │
│       ▼                                              │
│  Service Layer (typed functions)                      │
│       │                                              │
│       ▼                                              │
│  tRPC Client / Fetch Wrapper                          │
│       │                                              │
│       ▼                                              │
│  API Client (axios / fetch + interceptors)             │
│       │                                              │
│       ▼                                              │
│  Backend API (REST / gRPC-web)                        │
└─────────────────────────────────────────────────────┘
```

### Folder Structure

```
src/
└── services/
    ├── client.ts                 # Base API client (axios or fetch wrapper)
    ├── types.ts                  # API request/response types
    ├── dashboard.service.ts      # Dashboard API calls
    ├── events.service.ts         # Risk events API calls
    ├── models.service.ts         # Models API calls
    ├── policies.service.ts       # Policies API calls
    ├── audit.service.ts          # Audit log API calls
    ├── analytics.service.ts      # Analytics API calls
    ├── team.service.ts           # Team management API calls
    ├── settings.service.ts       # Settings API calls
    └── usage.service.ts          # API usage API calls
```

### API Client

```typescript
// src/services/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getSessionToken(); // from cookie or Zustand
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Session expired → redirect to login
      redirectToLogin();
    }
    if (error.response?.status === 403) {
      // Forbidden → show toast
      showForbiddenToast();
    }
    if (error.response?.status === 429) {
      // Rate limited → show toast
      showRateLimitToast(error.response.headers['retry-after']);
    }
    return Promise.reject(normalizeError(error));
  }
);

export default apiClient;
```

### Service Layer Pattern

```typescript
// src/services/events.service.ts
import apiClient from './client';
import type { EventFilters, PaginatedResponse, RiskEvent } from './types';

export const eventsService = {
  list: async (filters: EventFilters): Promise<PaginatedResponse<RiskEvent>> => {
    const { data } = await apiClient.get('/api/v1/events', { params: filters });
    return data;
  },

  getById: async (id: string): Promise<RiskEvent> => {
    const { data } = await apiClient.get(`/api/v1/events/${id}`);
    return data;
  },

  getExplanation: async (id: string): Promise<EventExplanation> => {
    const { data } = await apiClient.get(`/api/v1/events/${id}/explain`);
    return data;
  },

  getSimilar: async (id: string, window: string = '24h'): Promise<SimilarEvent[]> => {
    const { data } = await apiClient.get('/api/v1/events', {
      params: { similar_to: id, window },
    });
    return data.events;
  },

  disposition: async (id: string, action: DispositionAction): Promise<Disposition> => {
    const { data } = await apiClient.post(`/api/v1/events/${id}/disposition`, action);
    return data;
  },

  exportEvidence: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/api/v1/events/${id}/evidence`, {
      responseType: 'blob',
    });
    return data;
  },
};
```

### TanStack Query Integration

```typescript
// src/hooks/useEvents.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/services/events.service';
import { queryKeys } from '@/lib/query-keys';

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => eventsService.list(filters),
    staleTime: 30_000,          // 30s
    refetchInterval: 60_000,    // Poll every 60s
    placeholderData: keepPreviousData, // Keep old data while fetching next page
  });
}

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => eventsService.getById(eventId),
    staleTime: 30_000,
    enabled: !!eventId,
  });
}

export function useDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, action }: { eventId: string; action: DispositionAction }) =>
      eventsService.disposition(eventId, action),
    onMutate: async ({ eventId, action }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });
      const previous = queryClient.getQueryData(queryKeys.events.detail(eventId));
      queryClient.setQueryData(queryKeys.events.detail(eventId), (old: any) => ({
        ...old,
        disposition: { ...action, timestamp: new Date().toISOString(), status: 'pending' },
      }));
      return { previous };
    },
    onError: (err, { eventId }, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.events.detail(eventId), context?.previous);
      showErrorToast('Failed to apply disposition. Please try again.');
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}
```

### Error Handling

```typescript
// Normalized error type
interface ApiError {
  code: string;          // "VALIDATION_ERROR", "RATE_LIMITED", "NOT_FOUND"
  message: string;       // Human-readable
  details?: Record<string, string[]>; // Field-level errors
  retryAfter?: number;   // Seconds (for rate limiting)
}

// Component-level error handling
function EventList() {
  const { data, error, isLoading, refetch } = useEvents(filters);

  if (isLoading) return <EventTableSkeleton />;
  if (error) return (
    <ErrorState
      title="Failed to load events"
      message={(error as ApiError).message}
      action={{ label: 'Retry', onClick: () => refetch() }}
    />
  );
  if (data?.events.length === 0) return (
    <EmptyState
      icon={Activity}
      title="No risk events"
      description="No events match your filters. Try adjusting the filter criteria."
    />
  );

  return <EventsTable events={data.events} />;
}
```

### Retry Logic

```typescript
// Global retry configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const apiError = error as ApiError;
        // Don't retry 4xx errors
        if (apiError.code === 'NOT_FOUND' || apiError.code === 'FORBIDDEN') return false;
        // Retry server errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 1s, 2s, 4s, max 10s
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Real-Time Updates

```typescript
// src/lib/websocket.ts
class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(workspaceId: string) {
    this.ws = new WebSocket(`${WS_URL}/workspaces/${workspaceId}/events`);
    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      this.handlePayload(payload);
    };
    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.connect(workspaceId), 1000 * 2 ** this.reconnectAttempts);
        this.reconnectAttempts++;
      }
    };
  }

  private handlePayload(payload: WSMessage) {
    switch (payload.type) {
      case 'new_event':
        queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
        break;
      case 'disposition':
        queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(payload.eventId) });
        break;
      case 'policy_triggered':
        queryClient.invalidateQueries({ queryKey: queryKeys.policies.all() });
        break;
    }
  }
}
```

---

## 8. Design System Architecture

### 8.1 Design Tokens

```typescript
// tailwind.config.ts (partial)
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF2FF',
          100: '#DBE1FF',
          200: '#BEC8FF',
          300: '#92A2FF',
          400: '#6676FF',
          500: '#2B42F5',  // Primary brand
          600: '#1A2DE0',
          700: '#1524B8',
          800: '#131F96',
          900: '#121D7A',
        },
        severity: {
          critical: {
            DEFAULT: '#E02525',
            bg: '#FEF2F2',
            border: '#FECACA',
            text: '#991B1B',
          },
          warning: {
            DEFAULT: '#E88B1F',
            bg: '#FFFBEB',
            border: '#FDE68A',
            text: '#92400E',
          },
          info: {
            DEFAULT: '#2B8CE5',
            bg: '#EFF6FF',
            border: '#BFDBFE',
            text: '#1E40AF',
          },
          success: {
            DEFAULT: '#1FAA5C',
            bg: '#F0FDF4',
            border: '#BBF7D0',
            text: '#166534',
          },
          neutral: {
            DEFAULT: '#6B7280',
            bg: '#F9FAFB',
            border: '#E5E7EB',
            text: '#6B7280',
          },
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB',
          tertiary: '#F3F4F6',
          inverted: '#111827',
        },
        border: {
          DEFAULT: '#E5E7EB',
          strong: '#D1D5DB',
        },
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          tertiary: '#6B7280',
          quaternary: '#9CA3AF',
          inverted: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'h2': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'h3': ['15px', { lineHeight: '20px', fontWeight: '500' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'small': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'mono': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'mono-sm': ['11px', { lineHeight: '16px', fontWeight: '400' }],
      },
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        DEFAULT: '6px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.12)',
      },
    },
  },
};
```

### 8.2 Risk Severity Color System

```typescript
// Used across all components: badges, charts, tables, indicators
const SEVERITY_CONFIG = {
  critical: {
    color: '#E02525',
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#991B1B',
    icon: AlertTriangle,
    label: 'Critical',
    order: 4,
  },
  warning: {
    color: '#E88B1F',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    icon: AlertCircle,
    label: 'Warning',
    order: 3,
  },
  info: {
    color: '#2B8CE5',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1E40AF',
    icon: Info,
    label: 'Info',
    order: 2,
  },
  success: {
    color: '#1FAA5C',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    text: '#166534',
    icon: CheckCircle,
    label: 'Success',
    order: 1,
  },
} as const;
```

### 8.3 Component Variants (tailwind-variants)

```typescript
// Example: Button component variants
const button = tv({
  base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
      secondary: 'bg-surface text-text-primary border border-border hover:bg-surface-secondary',
      ghost: 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
      danger: 'bg-severity-critical text-white hover:bg-red-700 active:bg-red-800',
    },
    size: {
      sm: 'h-8 px-3 text-body gap-1.5',
      md: 'h-10 px-4 text-body gap-2',
      lg: 'h-12 px-6 text-h3 gap-2',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
```

### 8.4 Card System

```typescript
// Card with header, body, footer slots
const card = tv({
  slots: {
    base: 'rounded-lg border border-border bg-surface shadow-card',
    header: 'flex items-center justify-between px-4 py-3 border-b border-border',
    title: 'text-h3 text-text-primary',
    description: 'text-small text-text-tertiary',
    body: 'p-4',
    footer: 'flex items-center justify-between px-4 py-3 border-t border-border bg-surface-secondary rounded-b-lg',
  },
});
```

### 8.5 Table System

```typescript
const table = tv({
  slots: {
    wrapper: 'w-full overflow-auto rounded-lg border border-border',
    table: 'w-full caption-bottom text-body',
    header: 'border-b border-border bg-surface-secondary',
    headerRow: '',
    headerCell: 'h-10 px-3 text-left text-small font-medium text-text-tertiary',
    body: '',
    row: 'border-b border-border transition-colors hover:bg-surface-secondary data-[state=selected]:bg-brand-50',
    cell: 'p-3 align-middle',
    footer: 'border-t border-border bg-surface-secondary font-medium',
  },
});
```

### 8.6 Alert/Notification System

```
┌──────────────────────────────────────────────────────┐
│  ✅ Guardrail created                                 │
│  Rule: IF injection_score > 0.9 THEN block            │
│  Model: gpt-4-prod  │  Status: ACTIVE                 │
│                                                       │
│  [View Rule] [Test Rule] [Dismiss]                   │
│  ── Auto-dismiss in 8s ──                            │
└──────────────────────────────────────────────────────┘
```

| Toast Type | Icon | Color | Auto-dismiss |
|------------|------|-------|--------------|
| Success | CheckCircle | Green | 6s |
| Error | XCircle | Red | 10s (or manual) |
| Warning | AlertTriangle | Yellow | 8s |
| Info | Info | Blue | 4s |

---

## 9. Data Visualization Architecture

### Chart Type Decision Matrix

| Chart Type | Library | When to Use | Pages |
|------------|---------|-------------|-------|
| **Line chart** | Observable Plot | Risk score trends over time, moving averages | Dashboard Trends, Analytics Trends |
| **Bar chart (vertical)** | Recharts | Alert volume by day, model risk comparison | Analytics Trends, Model Comparison |
| **Bar chart (horizontal)** | Recharts | Top risk types by count, model ranking | Analytics Trends, Risk Events |
| **Stacked bar** | Recharts | Alert volume by severity × day | Analytics Trends |
| **Donut chart** | Recharts | Risk breakdown by category | Event Detail, Risk Events |
| **Grouped bar** | Recharts | Side-by-side model comparison | Analytics Comparison |
| **Area chart** | Observable Plot | Cumulative risk score, incident frequency | Analytics Trends |
| **Gauge chart** | Recharts (custom) | Compliance score 0-100% | Analytics Compliance |
| **Heatmap (token)** | Custom (div grid) | Token-level risk attribution | Investigation Token Heatmap |
| **Diff viewer** | Custom (JSON diff) | Before/after state in audit logs | Audit Entry Detail |

### Chart Specifications

#### Risk Score Trend Chart

```typescript
// src/features/analytics/components/RiskScoreTrendChart.tsx
interface RiskScoreTrendChartProps {
  data: { date: string; score: number; model?: string }[];
  window: '7d' | '30d' | '90d';
  showMovingAverage?: boolean;
  height?: number;
}

// Observable Plot implementation
function RiskScoreTrendChart({ data, window, showMovingAverage }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const plot = Plot.plot({
      marks: [
        Plot.line(data, { x: 'date', y: 'score', stroke: 'brand-500' }),
        Plot.areaY(data, { x: 'date', y: 'score', fill: 'brand-50' }),
        showMovingAverage ? Plot.line(movingAverage(data), {
          x: 'date', y: 'score', stroke: 'brand-300', strokeDash: '4,2'
        }) : null,
        Plot.crosshair(data, { x: 'date', y: 'score' }),
      ],
      y: { label: 'Risk Score', domain: [0, 100] },
      x: { label: null, tickFormat: '%b %d' },
      width: width,
      height: height || 300,
      style: { fontSize: '12px', fontFamily: 'Inter' },
    });
    plotRef.current?.append(plot);
    return () => plot.remove();
  }, [data]);

  return <div ref={plotRef} />;
}
```

#### Token Heatmap

```typescript
// Custom div-grid implementation (no chart library needed)
// src/features/investigations/components/TokenHeatmap.tsx

interface TokenAttribution {
  token: string;
  score: number;      // 0.00 - 1.00
  category: string;   // 'injection', 'pii', 'safe'
}

// Color mapping: red (high risk) → yellow (medium) → green (safe)
function getTokenColor(score: number): string {
  if (score > 0.7) return 'rgba(224, 37, 37, 0.85)';      // Critical red
  if (score > 0.4) return 'rgba(232, 139, 31, 0.75)';     // Warning yellow
  if (score > 0.1) return 'rgba(43, 140, 229, 0.5)';      // Info blue
  return 'rgba(31, 170, 92, 0.3)';                         // Safe green
}
```

### Accessibility in Charts

| Requirement | Implementation |
|-------------|----------------|
| Color-blind safe | Severity colors checked for deuteranopia/protanopia. Shapes/icons supplement color |
| Keyboard navigation | Arrow keys navigate data points. Enter/space reads value |
| Screen reader | `aria-label` on chart container. `role="img"` with `aria-describedby` link to data table |
| Reduced motion | Chart animations disabled when `prefers-reduced-motion: reduce` |
| Data table fallback | Every chart has an adjacent hidden `<table>` with raw data |

---

## 10. Folder Structure

```
sentinelai-frontend/
├── src/
│   ├── app/                           # Next.js App Router (file-based routing)
│   │   ├── layout.tsx                 # Root layout (fonts, providers)
│   │   ├── page.tsx                   # Marketing landing page
│   │   ├── pricing/
│   │   ├── docs/
│   │   ├── changelog/
│   │   ├── status/
│   │   ├── login/
│   │   ├── auth/
│   │   └── app/                       # Authenticated app
│   │       ├── layout.tsx             # App shell (sidebar, top nav, providers)
│   │       ├── dashboard/
│   │       ├── models/
│   │       ├── risk-events/
│   │       ├── investigations/
│   │       ├── audit-logs/
│   │       ├── analytics/
│   │       ├── policies/
│   │       ├── api-usage/
│   │       ├── team/
│   │       └── settings/
│   │
│   ├── features/                      # Feature modules (organized by domain)
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── RiskHealthScoreCard.tsx
│   │   │   │   ├── ActiveAlertsCard.tsx
│   │   │   │   ├── TopRisksCard.tsx
│   │   │   │   ├── RiskTrendChart.tsx
│   │   │   │   ├── RecentIncidentsPanel.tsx
│   │   │   │   └── DashboardGrid.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useDashboard.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── events/
│   │   │   ├── components/
│   │   │   │   ├── EventsTable.tsx
│   │   │   │   ├── EventDetailHeader.tsx
│   │   │   │   ├── RiskBreakdownPanel.tsx
│   │   │   │   ├── TokenHeatmap.tsx
│   │   │   │   ├── SimilarEventsPanel.tsx
│   │   │   │   ├── DispositionActions.tsx
│   │   │   │   └── EventFilters.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useEvents.ts
│   │   │   │   ├── useEventDetail.ts
│   │   │   │   └── useDisposition.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── investigations/
│   │   │   ├── components/
│   │   │   │   ├── InvestigationSplitView.tsx
│   │   │   │   ├── TimelinePanel.tsx
│   │   │   │   ├── DetailPanel.tsx
│   │   │   │   ├── RecommendationsPanel.tsx
│   │   │   │   ├── TimelineEvent.tsx
│   │   │   │   └── EvidenceExport.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useInvestigation.ts
│   │   │   │   └── useEvidenceExport.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── models/
│   │   │   ├── components/
│   │   │   │   ├── ModelCard.tsx
│   │   │   │   ├── ModelRegistrationForm.tsx
│   │   │   │   ├── ModelDetailTabs.tsx
│   │   │   │   ├── BaselinePanel.tsx
│   │   │   │   └── ModelGuardrailsPanel.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useModels.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── RiskTrendsPage.tsx
│   │   │   │   ├── ModelComparisonPage.tsx
│   │   │   │   ├── ComplianceReportingPage.tsx
│   │   │   │   ├── RiskScoreTrendChart.tsx
│   │   │   │   ├── AlertVolumeChart.tsx
│   │   │   │   ├── ComplianceGauge.tsx
│   │   │   │   └── ModelBreakdownTable.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAnalytics.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── components/
│   │   │   │   ├── AuditTable.tsx
│   │   │   │   ├── AuditEntryDetail.tsx
│   │   │   │   ├── AuditFilters.tsx
│   │   │   │   └── IntegrityBadge.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuditLogs.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── policies/
│   │   │   ├── components/
│   │   │   │   ├── PoliciesTable.tsx
│   │   │   │   ├── RuleBuilder.tsx
│   │   │   │   ├── ConditionBuilder.tsx
│   │   │   │   ├── ScopeSelector.tsx
│   │   │   │   ├── PreviewPanel.tsx
│   │   │   │   ├── DryRunButton.tsx
│   │   │   │   └── RuleTemplates.tsx
│   │   │   ├── hooks/
│   │   │   │   └── usePolicies.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   ├── GeneralSettings.tsx
│   │   │   │   ├── IntegrationCard.tsx
│   │   │   │   ├── IntegrationSetupWizard.tsx
│   │   │   │   ├── SSOPage.tsx
│   │   │   │   ├── BillingPage.tsx
│   │   │   │   └── ApiKeysPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSettings.ts
│   │   │   └── types.ts
│   │   │
│   │   └── team/
│   │       ├── components/
│   │       │   ├── MemberTable.tsx
│   │       │   ├── InviteMemberModal.tsx
│   │       │   ├── RolesMatrix.tsx
│   │       │   └── MemberRow.tsx
│   │       ├── hooks/
│   │       │   └── useTeam.ts
│   │       └── types.ts
│   │
│   ├── components/                    # Shared UI primitives
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Tabs.tsx
│   │       ├── Modal.tsx
│   │       ├── Table.tsx
│   │       ├── DropdownMenu.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Toast.tsx
│   │       ├── Tooltip.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── Avatar.tsx
│   │       ├── CommandPalette.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── CopyButton.tsx
│   │       └── ExportButton.tsx
│   │
│   ├── hooks/                         # Shared React hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useKeyboardShortcut.ts
│   │   └── useInterval.ts
│   │
│   ├── services/                      # API service layer
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── dashboard.service.ts
│   │   ├── events.service.ts
│   │   ├── models.service.ts
│   │   ├── policies.service.ts
│   │   ├── audit.service.ts
│   │   ├── analytics.service.ts
│   │   ├── team.service.ts
│   │   ├── settings.service.ts
│   │   ├── usage.service.ts
│   │   └── auth.service.ts
│   │
│   ├── store/                         # Zustand stores
│   │   ├── app.store.ts               # Global app state
│   │   ├── notification.store.ts      # Notification state
│   │   └── filter.store.ts            # Persistent filter preferences
│   │
│   ├── lib/                           # Utilities and configuration
│   │   ├── query-keys.ts              # TanStack Query key factory
│   │   ├── query-client.ts            # QueryClient configuration
│   │   ├── websocket.ts               # WebSocket connection manager
│   │   ├── formatters.ts             # Date, number, severity formatters
│   │   ├── constants.ts               # App-wide constants
│   │   ├── auth.ts                    # Auth utilities
│   │   └── rbac.ts                    # Role-based access control helpers
│   │
│   ├── types/                         # Global TypeScript types
│   │   ├── api.ts                     # API request/response types
│   │   ├── models.ts                  # Domain model types
│   │   ├── events.ts                  # Event-specific types
│   │   ├── user.ts                    # User and role types
│   │   └── common.ts                  # Shared types (pagination, filters)
│   │
│   └── utils/                         # Pure utility functions
│       ├── cn.ts                      # clsx + tailwind-merge utility
│       ├── format.ts                  # Formatting helpers
│       ├── validation.ts              # Zod schemas
│       └── severity.ts               # Severity calculation helpers
│
├── public/
│   ├── fonts/
│   ├── images/
│   └── icons/
│
├── styles/
│   └── globals.css                    # Tailwind directives + global styles
│
├── tests/
│   ├── unit/                          # Vitest unit tests
│   ├── integration/                   # Integration tests
│   └── e2e/                           # Playwright E2E tests
│
├── .env.local                         # Local environment variables
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 11. Security Considerations

### Authentication

| Requirement | Implementation |
|-------------|----------------|
| SSO/SAML | SAML 2.0 HTTP-POST binding. IdP metadata upload, attribute mapping (email, name, role) |
| OAuth 2.0 | Authorization code flow with PKCE. Supported providers: Google, GitHub, Okta, Azure AD |
| API Keys | Bearer token in `Authorization` header. Keys hashed with bcrypt at rest. Key prefix for identification |
| Session Token | JWT in httpOnly cookie (not localStorage). 24h expiry. Refresh token flow |
| Magic Link | Passwordless email login. Link expires in 15 minutes. One-time use |

### Authorization (RBAC)

```typescript
// src/lib/rbac.ts
type Role = 'admin' | 'editor' | 'viewer' | 'compliance';
type Permission = 
  | 'models:read' | 'models:write' | 'models:delete'
  | 'events:read' | 'events:write' | 'events:delete'
  | 'policies:read' | 'policies:write' | 'policies:delete'
  | 'settings:read' | 'settings:write'
  | 'team:read' | 'team:write' | 'team:delete'
  | 'audit:read'
  | 'billing:read' | 'billing:write';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['models:read', 'models:write', 'models:delete', 'events:read', 'events:write', 
          'events:delete', 'policies:read', 'policies:write', 'policies:delete', 
          'settings:read', 'settings:write', 'team:read', 'team:write', 'team:delete',
          'audit:read', 'billing:read', 'billing:write'],
  editor: ['models:read', 'models:write', 'events:read', 'events:write', 
           'policies:read', 'policies:write', 'settings:read', 'team:read', 'audit:read', 'billing:read'],
  viewer: ['models:read', 'events:read', 'policies:read', 'settings:read', 'team:read', 'audit:read'],
  compliance: ['models:read', 'events:read', 'settings:read', 'team:read', 'audit:read'],
};

export function hasPermission(user: User, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}
```

### Frontend Security Checklist

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | CSP headers | Content-Security-Policy: script-src 'self'; object-src 'none'; frame-ancestors 'none' |
| 2 | CSRF protection | SameSite=Strict on session cookies. CSRF token in forms |
| 3 | XSS prevention | React's JSX escaping. No `dangerouslySetInnerHTML`. Sanitize markdown in changelog/docs |
| 4 | Secure cookies | `httpOnly`, `secure`, `SameSite=Strict` on session cookie |
| 5 | Clickjacking | `X-Frame-Options: DENY` |
| 6 | Rate limiting UI | Disable submit buttons after click. Show "Please wait" state |
| 7 | Sensitive data masking | Token heatmap surfaces truncated input. Full payload requires explicit click |
| 8 | Session timeout | 24h idle timeout. 5min warning modal before expiry |
| 9 | Logout | Clear session cookie, invalidate server-side session, redirect to `/login` |
| 10 | API key handling | Keys shown once after generation. Masked in list. Copy to clipboard with auto-clear (10s) |

---

## 12. Performance Requirements

### Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard load (P95) | <500ms | Lighthouse, RUM |
| Page navigation (P95) | <300ms | RUM |
| Event list (100 rows) | <300ms | Synthetic |
| Search results | <200ms | Synthetic |
| Report generation | <5s | Server-side |
| JS bundle (critical path) | <150KB gzip | Webpack Bundle Analyzer |
| First Contentful Paint | <1.5s | Lighthouse |
| Largest Contentful Paint | <2.5s | Lighthouse |
| Cumulative Layout Shift | <0.1 | Lighthouse |
| Time to Interactive | <3.5s | Lighthouse |

### Code Splitting

```typescript
// Dynamic imports for heavy modules
const TokenHeatmap = dynamic(() => import('@/features/events/components/TokenHeatmap'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false, // Token heatmap is client-only
});

const RuleBuilder = dynamic(() => import('@/features/policies/components/RuleBuilder'), {
  loading: () => <Skeleton className="h-96 w-full" />,
});

const AnalyticsPage = dynamic(() => import('@/features/analytics/components/RiskTrendsPage'), {
  loading: () => <AnalyticsSkeleton />,
});
```

### Lazy Loading

| Strategy | When | Example |
|----------|------|---------|
| Route-level code splitting | Per-page bundles via App Router | `/analytics` loads chart libraries only |
| Component-level dynamic import | Heavy interactive components | TokenHeatmap, RuleBuilder |
| IntersectionObserver | Below-fold content | RecentIncidentsPanel on dashboard |
| Pagination / virtual scroll | >100 rows | EventsTable, AuditTable |
| Image lazy loading | All non-critical images | Marketing site illustrations |

### Caching Strategy

| Cache Layer | What | Strategy |
|-------------|------|----------|
| Next.js ISR | Marketing pages | Revalidate every 60s |
| TanStack Query | Dashboard data | `staleTime: 10s`, refetch on focus |
| TanStack Query | Event list | `staleTime: 30s`, polling 60s |
| TanStack Query | Model list | `staleTime: 60s`, background refetch |
| TanStack Query | Settings/team | `staleTime: 5min`, manual refetch |
| Service Worker | Static assets | Cache-first, max-age 1 year |
| CDN | Static pages, images | Edge cache, 1 hour TTL |

### Virtualization Strategy

```typescript
// Events table with virtualized rows
function VirtualizedEventsTable({ events }: { events: RiskEvent[] }) {
  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48, // Row height
    overscan: 10,            // Rows rendered above/below viewport
  });

  return (
    <div ref={scrollRef} style={{ height: '600px', overflow: 'auto' }}>
      <table style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <thead>{/* sticky header */}</thead>
        <tbody>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

### Bundle Optimization

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-table',
      'recharts',
      'framer-motion',
      'lucide-react',       // Tree-shake icon imports
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

// Import pattern to minimize bundle
// Bad: imports entire icon library
// import * as Icons from 'lucide-react';
// Good: tree-shakeable import
import { Shield, Activity, Search, Box, FileText, BarChart } from 'lucide-react';
```

### Service Worker

```typescript
// sw.ts — for offline dashboard and static asset caching
const CACHE_NAME = 'sentinelai-v1';
const STATIC_ASSETS = [
  '/fonts/inter-var.woff2',
  '/fonts/jetbrains-mono-var.woff2',
  '/images/logo.svg',
  '/images/logo-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('fetch', (event) => {
  // Cache static assets, network-first for API
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirstWithCacheFallback(event.request));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Theme:** App shell, design system, and core navigation.

| Feature | Dependencies | Deliverables |
|---------|--------------|--------------|
| Next.js project scaffold | None | `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, folder structure |
| Design system primitives | Tailwind config | 15+ UI components (Button, Badge, Card, Input, Select, Table, Modal, etc.) |
| App layout shell | UI primitives | Sidebar (expanded/collapsed), TopNav, Breadcrumb, UserMenu |
| Authentication flow | Auth service API | Login page, SSO callback, session management, AuthGuard middleware |
| RBAC implementation | Auth flow | Permission checks, route guards, component-level access control |
| API client + service layer | None | `client.ts`, service stubs, TanStack Query config, error handling |
| Global command palette | UI primitives | Cmd+K modal with search results grouping |

**Testing targets:** Unit tests for UI primitives (100%). Integration test for auth flow. Playwright: login flow, sidebar navigation.

**Gate:** All UI primitives pass visual regression tests. Auth flow end-to-end validated. Sidebar respects role permissions.

---

### Phase 2: Core Workflows (Weeks 5-10)

**Theme:** Dashboard, Risk Events, and Investigations — the primary triage workflow.

| Feature | Dependencies | Deliverables |
|---------|--------------|--------------|
| Dashboard page | Phase 1 shell, dashboard API | HealthScoreCard, ActiveAlertsCard, TopRisksCard, RiskTrendChart, RecentIncidentsPanel |
| Role-adaptive dashboard views | Dashboard page | 4 persona views: engineer, security, compliance, executive |
| Risk Events list | Phase 1 shell, events API | EventsTable with filters, pagination, sorting, virtual scroll |
| Risk Event detail | Risk Events list | EventDetailHeader, RiskBreakdownPanel, DispositionActions |
| Token heatmap | Risk Event detail | TokenHeatmapGrid with hover tooltip, color legend |
| Investigation workspace | Risk Event detail | InvestigationSplitView, TimelinePanel, RecommendationsPanel |
| Similar events panel | Investigation | SimilarEventsSection, event grouping |
| Evidence export | Risk Event detail | EvidenceExport button, JSON download, signed manifest |

**Testing targets:** Dashboard loads <500ms P95. Event list filters work end-to-end. Token heatmap passes color-blind audit. Investigation timeline scrolls smoothly.

**Gate:** All 5 dashboard widgets render with real data. Triage workflow (alert → investigate → action) works end-to-end. Evidence export produces valid JSON.

---

### Phase 3: Management Modules (Weeks 11-16)

**Theme:** Models, Policies, Audit Logs, and Settings — the configuration layer.

| Feature | Dependencies | Deliverables |
|---------|--------------|--------------|
| Models list + registration | Phase 2, models API | ModelCard, ModelRegistrationForm, endpoint validation |
| Model detail page | Models list | ModelDetailTabs (Alerts, Baselines, Guardrails, Audit) |
| Baseline visualization | Model detail | Drift history chart, threshold configuration |
| Policies list + rule builder | Phase 2, policies API | PoliciesTable, RuleBuilder, ConditionBuilder, ScopeSelector |
| Policy preview + dry run | Policies list | PreviewPanel, DryRunButton |
| Policy templates | Policies list | RuleTemplateCard, template library |
| Audit log explorer | Phase 1, audit API | AuditTable with filters, AuditEntryDetail, IntegrityBadge |
| Settings pages | Phase 1, settings API | GeneralSettings, IntegrationCard, SSOPage, ApiKeysPage |

**Testing targets:** Model registration form validates endpoint connectivity. Rule builder saves and activates policies. Audit log integrity verification passes. SSO metadata upload works.

**Gate:** Full CRUD for models, policies. Audit log chain verification end-to-end. At least 2 integrations (Slack, PagerDuty) configurable and verified.

---

### Phase 4: Analytics & Polish (Weeks 17-22)

**Theme:** Analytics, Team Management, API Usage, and production hardening.

| Feature | Dependencies | Deliverables |
|---------|--------------|--------------|
| Analytics — Risk Trends | Phase 2, analytics API | RiskScoreTrendChart, AlertVolumeChart, ModelBreakdownTable |
| Analytics — Model Comparison | Analytics | ComparisonChart, ComparisonDetailTable, ModelSelector |
| Analytics — Compliance (P1) | Analytics | ComplianceGauge, ControlChecklistTable, PDF report generation |
| Team management | Phase 1, team API | MemberTable, InviteMemberModal, RolesMatrix |
| API Usage page | Phase 2, usage API | UsageDashboard, rate limit indicators, top consumers |
| Notification center | Phase 2 | NotificationBell, dropdown list, WebSocket integration |
| Global search optimization | Phase 1 | Search ranking, recent searches, keyboard navigation |
| Performance optimization | All | Code splitting audit, bundle analysis, lazy loading pass |
| Accessibility audit | All | WCAG 2.1 AA compliance pass, screen reader testing |
| E2E test suite | All | 50+ Playwright tests covering all core workflows |
| Loading/empty/error states | All | Cover all components: skeleton, error retry, empty CTA |

**Testing targets:** 90%+ test coverage on critical paths. Lighthouse scores >90. WCAG AA compliance verified. All states (loading, empty, error, partial data) tested.

**Gate:** Zero accessibility violations. Lighthouse scores >90 on dashboard. All acceptance criteria from PRD Section 14 pass. Stakeholder demo ready.

---

## 14. Acceptance Criteria

### PRD-Based Verification

| ID | Criterion | Verification Method | Phase |
|----|-----------|-------------------|-------|
| DASH-01 | Dashboard loads <500ms (P95) | Synthetic monitoring test (Lighthouse CI) | P2 |
| DASH-12 | Role-adaptive defaults load for each role | E2E test (4 role logins, assert widget order) | P2 |
| EVT-01 | Event list loads <300ms for 100 events | Synthetic monitoring | P2 |
| EVT-15 | Filters persist in URL for bookmarking | E2E: apply filter → reload → filter preserved | P2 |
| INV-03 | Token heatmap renders with correct colors | Visual regression test | P2 |
| POL-05 | Preview shows estimated historical matches | Integration test | P3 |
| AUD-06 | Integrity verification confirms chain valid | Integration test | P3 |
| GBL-01 | Cmd+K search finds models, events, policies | E2E test | P2 |
| GBL-03 | Color contrast meets WCAG AA (4.5:1) | Automated audit (axe-core) | P4 |
| GBL-08 | Error boundary catches errors without white screen | E2E: mock API failure → error state visible | P2 |

### Architecture-Specific Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| ARCH-01 | All routes accessible only with valid session | Integration test with/without auth cookie |
| ARCH-02 | Role-based route guards block unauthorized access | E2E: compliance role attempts /policies → 403 |
| ARCH-03 | API client retries 5xx errors up to 3 times | Unit test on retry logic |
| ARCH-04 | Zustand store persists sidebar + theme preference | E2E: toggle sidebar → reload → sidebar collapsed |
| ARCH-05 | TanStack Query invalidates dashboard on WS event | Integration test: WS message triggers refetch |
| ARCH-06 | All charts have accessible data table fallback | Accessibility audit: `aria-describedby` links present |
| ARCH-07 | No component renders without loading/error/empty | Code review: every data-fetching component covers 3 states |
| ARCH-08 | Bundle size for dashboard route <150KB gzip | `next-bundle-analyzer` check in CI |

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-22 | Staff Frontend Architect | Initial architecture document |

---

*This document should be read alongside:*
- *Product Requirements Document (`docs/prd.md`)*
- *UX Research Document (`Docs/ux-research-sentinelai.md`)*
- *API contract documentation*
- *Design system specification (Figma)*
