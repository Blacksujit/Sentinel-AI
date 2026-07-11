# SentinelAI — Frontend Product Audit

**Author:** Staff Frontend Engineer & Principal Product Designer (ex-Datadog, ex-CrowdStrike, ex-Linear, ex-Stripe)  
**Date:** 2026-06-23  
**Scope:** Complete UX/UI audit of existing frontend  
**Constraint:** Preserve all existing functionality, APIs, business logic, state management, backend contracts, and authentication

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Codebase Overview Assessment](#2-codebase-overview-assessment)
3. [Page-by-Page Audit](#3-page-by-page-audit)
4. [Product Story Audit](#4-product-story-audit)
5. [Information Hierarchy Review](#5-information-hierarchy-review)
6. [Component Inventory Review](#6-component-inventory-review)
7. [Enterprise UX Gap Analysis](#7-enterprise-ux-gap-analysis)

---

## 1. Executive Summary

SentinelAI has a working, functional frontend built on Next.js 14 App Router, Tailwind CSS, and a mix of Chakra UI legacy components and modern Radix-based primitives. The engineering foundation is solid. The product layer needs significant UX refinement.

### What Works Well

- **Page routing**: Next.js App Router with route groups (`(auth)`, `(dashboard)`, `(org)`, `(setup)`) is architecturally sound. Parallel routes and proper layout nesting.
- **Data fetching**: Custom hooks (`useRiskLogs`) and `apiGet`/`apiPost`/`apiPatch`/`apiDelete` utility pattern is clean and consistent.
- **Auth integration**: Clerk auth with server-side checks, client guards (`UserGuard`), and org scoping is well-implemented.
- **Motion/animation system**: Framer Motion with reusable animation presets (`staggerContainer`, `slideUp`, `hoverScaleLift`, `buttonPress`) adds premium feel.
- **Component library footprint**: Radix-based UI primitives (Dialog, DropdownMenu, Select, Tooltip, Tabs) with proper Tailwind styling — the right foundation.
- **Workspace intelligence module**: The `workspace-intel` dashboard is the most polished part of the app. Recharts integration, health gauge, timeline view — shows what the team can do.
- **Settings page**: Comprehensive with slider controls, version history, reset-to-defaults, SweetAlert2 confirmations. Good state management.
- **Backend-warmup-banner**: Pragmatic UX for cold-start mitigation on serverless backends.

### What Needs Improvement (TL;DR)

| Category | Count | Severity |
|----------|-------|----------|
| Vibe-coded UI patterns | 8 | High |
| Information hierarchy issues | 6 | High |
| Cognitive overload problems | 5 | High |
| Missing information | 4 | Medium |
| Over-emphasized elements | 3 | Medium |
| Enterprise UX convention breaks | 7 | High |
| Trust-reducing patterns | 5 | High |

---

## 2. Codebase Overview Assessment

### 2.1 Architecture

The app has two parallel UI systems:
- **Classic (Chakra-based)**: `Sidebar.tsx`, `TopNavbar.tsx`, `AppLayout.tsx` — uses `@chakra-ui/react` with `useDisclosure`, `Flex`, `Box`, `useColorModeValue`
- **Modern (Tailwind-based)**: `SidebarModern.tsx`, `AppLayoutModern.tsx`, `TopNavbarModern.tsx` — uses Tailwind + Radix primitives

This dual-system creates inconsistency. Some pages render through `AppLayoutModern` (user dashboard, settings, playground, profile), others through the org layout (org dashboard, logs, baselines, members, api-keys, usage).

### 2.2 CSS Complexity

- `globals.css` is 405 lines with extensive SweetAlert2 overrides — a code smell
- Grid background pattern (`bg-[linear-gradient(...)]`) is duplicated across dashboard, settings, and playground — should be a layout-level effect
- Card variants are inconsistent: `card-premium`, `card-premium-glow`, `card-premium border-white/10`, `bg-white/5 border-white/10` — no single Card component being used consistently

### 2.3 Dual Layout Problem

The user-facing routes (under `AppLayoutModern`) and org-facing routes (under `OrgDashboardLayout`) have:
- Different sidebar behavior (mobile overlay vs animated width)
- Different navigation structures (top nav + sidebar vs sidebar-only)
- Different visual styling (gray tones vs dark navy)
- Inconsistent breadcrumb patterns

This breaks the enterprise expectation of a single, consistent shell.

### 2.4 Key Metrics

| Metric | Current State | Target |
|--------|---------------|--------|
| Distinct layout shells | 3 (AppLayout, AppLayoutModern, OrgLayout) | 1 |
| Component implementations per Card | 5+ | 1 |
| Pages with grid background pattern copy-pasted | 3 | 0 (layout-level) |
| SweetAlert2 CSS overrides | 30+ lines | 0 (migrate to Radix Dialog) |
| Debug console.log in production code | 2+ (members page) | 0 |

---

## 3. Page-by-Page Audit

### 3.1 User Dashboard (`/user/dashboard`)

**Current Issues:**

| Issue | Type | Detail |
|-------|------|--------|
| No health score visualization | Missing | 4 KPI cards but no aggregated "is my AI safe?" summary widget |
| Risk badge has no data anchor | Trust | Status badge shows "Needs attention" or "Stable" but no comparison to previous period or trend direction |
| Layout is a simple grid | Hierarchy | 4 KPI cards in a row, then chart + top flags, then activity — no visual hierarchy or weight distribution |
| "Top risk signals" duplicates data | Overlap | Shows flag counts from same data source as recent activity below — no unique insight |
| No "investigation next steps" | Missing | No suggested actions or prioritized investigation queue |
| Background grid pattern | Vibe-code | `bg-[linear-gradient(...)]` duplicated inline, adds visual noise |
| KPI cards have different accent colors | Consistency | Each card uses different gradient accents, creating visual chaos |
| No comparison baseline | Missing | "Events today" shows raw count but no % change vs yesterday |
| Backend Warmup Banner | UX | Essential for cold-start but takes prime real estate. Should be dismissible or less prominent |

**What Works Well:**
- Animated counters feel premium
- Framer Motion animations are tasteful
- Recharts line chart with custom tooltip is well-implemented
- "Investigate" links on each row are clear CTAs

### 3.2 Org Dashboard (`/org/[orgId]/dashboard`)

**Current Issues:**

| Issue | Type | Detail |
|-------|------|--------|
| No risk data visible | Missing | Shows API call stats (total calls, success rate, latency) — these are infrastructure metrics, not AI risk metrics |
| Risk Alerts shows hardcoded "0" | Trust | `value: '0'` hardcoded — destroys trust immediately |
| Quick actions are generic | Missed opportunity | "Create API Key", "View Logs", "Adjust Baselines" — these are admin tasks, not investigation workflow |
| No health overview | Missing | No aggregated risk posture — the org dashboard doesn't answer "is my AI safe?" |
| Stats are purely operational | Wrong focus | Total API calls and latency belong in API Usage, not the risk dashboard |
| No trend or chart | Missing | Flat stat cards with no visualization of change over time |
| `animate-pulse` loading | Quality | `...` as loading state for stat values is a hack |

### 3.3 Org Logs (`/org/[orgId]/dashboard/logs`)

**Current Issues:**

| Issue | Type | Detail |
|-------|------|--------|
| Flat list, no grouping | Cognitive load | 200+ log entries in a flat scrollable list. No time grouping, no severity grouping |
| No search | Missing | Workspace filter and decision filter only. No text search across logs |
| No pagination | Performance | All logs fetched at once. No infinite scroll or page controls |
| No detail drill-down | Missing | Clicking a log row does nothing — no expandable detail or modal |
| Decision icons are unclear | Clarity | AlertTriangle for both "block" and "escalate" — indistinguishable at a glance |
| Risk score and badge redundant | Overlap | Shows both `Math.round(risk * 100)` number AND a badge. The number is sufficient |
| Workspace selector is a raw `<select>` | Consistency | Inconsistent with rest of app's Radix Select components |
| Export CSV has no date range | Missing | Exports everything. No time window selection |

**What Works Well:**
- Filter tabs (All / Blocked / Allowed) are clear and functional
- Decision icons + risk badges give quick scanability
- Loading skeletons are properly implemented
- Header with export is well-positioned

### 3.4 Org Baselines (`/org/[orgId]/dashboard/baselines`)

**Current Issues:**

| Issue | Type | Detail |
|-------|------|--------|
| "Defaults" card is meaningless | Clarity | Fourth stat card shows "Ready" — no useful information |
| No risk threshold visualization | Missing | Baselines are text prompts with no associated risk levels, test results, or effectiveness scores |
| No test/history per baseline | Missing | No way to see how a baseline has performed over time or test it against sample inputs |
| Table has no sorting | UX | Baselines listed in arbitrary order. No sort by active/inactive, created date, or name |
| Inline Switch + Badge is redundant | Overlap | Switch shows active state AND a badge shows "Active"/"Inactive" — pick one |
| Create/Edit dialog is basic | Features | Single text input + active switch. Missing: category tags, testing area, last-triggered timestamp |

**What Works Well:**
- CRUD operations work flawlessly
- Optimistic updates for toggle are responsive
- Stat cards at top give quick overview of counts
- Dialog is accessible with proper labels and ARIA

### 3.5 Org Members (`/org/[orgId]/dashboard/members`)

**Current Issues:**

| Issue | Type | Detail |
|-------|------|--------|
| **Debug console.log in production** | **Critical** | `console.log('Members Debug:', {...})` on every render — security concern |
| **Debug fallback button visible** | **Critical** | "DEBUG: Invite (Role: X)" button visible when user lacks invite permission |
| Role hierarchy is hardcoded | Maintainability | `ROLE_HIERARCHY` defined as a local constant — should be from API |
| Search is client-only | Performance | Fetches all members then filters client-side. Doesn't scale beyond ~100 members |
| No audit log of role changes | Missing | Member management has no history of role changes or access revocations |
| Member name fallback to email | UX | If no name, shows raw email — should show email as secondary, not primary identifier |

**What Works Well:**
- Role badges are color-coded and clear
- Role-based permission checks are correct (canInvite, canManageRole, canRemove)
- Pending invitations card is well-positioned
- Loading skeletons present
- Remove confirmation with SweetAlert2 is proper

### 3.6 Org Usage (`/org/[orgId]/dashboard/usage`)

**Current Issues:**

| Issue | Type | Detail |
|-------|------|--------|
| **Raw JSON in `<pre>` tag** | **Vibe-code emergency** | The "usage data" section renders `JSON.stringify(data, null, 2)` in a `<pre>` — this is a debugging artefact, not a production UI |
| No chart/visualization | Missing | Usage data (requests over time, model breakdown) would be natural for a line chart |
| No time range selector | Missing | Shows "all time" data with no filtering |
| No model breakdown | Missing | Can't see which models consume how many tokens |
| Stat cards are minimal | Quality | Just requests total, requests 24h, success rate — no token count, latency, or cost data |
| Page is largely empty | Engagement | 3 stat cards + raw JSON — least polished page in the app |

**What Works Well:**
- Loading skeleton is present
- Error state is handled
- Route is correctly configured

### 3.7 Settings (`/app/settings`)

**Current Issues:**

| Issue | Type | Detail |
|-------|------|--------|
| SweetAlert2 for save confirmation | UX anti-pattern | Showing a success popup after every save is annoying for power users. Inline toast is sufficient |
| "Reset to Defaults" button disabled logic wrong | Bug | `disabled={saving \|\| !hasChanges \|\| wasReset}` — once reset, user can't reset again until they make a change |
| Settings history shows raw JSON | Trust | `JSON.stringify(h.thresholds_applied, null, 2)` in a `<pre>`-like div — raw JSON in production UI |
| No "unsaved changes" prompt on navigation | Missing | Has `hasChanges` tracking but doesn't intercept browser navigation/beforeunload |
| Signal weights don't sum to 1 | Usability | Three sliders that should logically sum to 1.0 but no constraint or visual indicator |
| Version display is text | Trust | Shows "Version {n}" but no link to changelog or what changed in that version |
| Settings page has duplicate grid background | Redundancy | Same `bg-[linear-gradient(...)]` as dashboard |

**What Works Well:**
- Slider controls are smooth and responsive
- Version history with pagination is enterprise-grade
- Loading, saving, error states all handled
- Reset-with-confirmation flow is safe
- Settings version tracking shows attention to audit
- Signal weights section is well-labeled

### 3.8 Playground (`/user/playground`)

**Issues:**
- Same duplicated grid background pattern
- Elapsed-time popup during analysis is a custom modal — should be a inline loading state
- Results section is functional but visually flat (no structured data display)
- No history of previous playground tests
- Cancel button during analysis doesn't actually cancel the fetch (abort controller)

### 3.9 Logs Page (`/user/logs`)

**Issues:**
- Uses hardcoded mock data: `const logs = [ ... ]` — no API integration
- Only 3 filter options with hardcoded labels
- Table is basic with no interactivity
- "Prompt Test" and "Profile Update" as log types don't match the AI risk monitoring narrative

### 3.10 Profile (`/user/profile`)

**Issues:**
- Name editing is simulated (1s delay) — no API integration
- "Need API access?" card is a product upsell that distracts from the profile context
- No avatar upload or preferences section
- Missing: notification preferences, theme toggle, session management

### 3.11 Workspaces (`/org/[orgId]/dashboard/workspaces`)

**Issues:**
- Workspace cards show creation date but no usage metrics (last active, event count, member activity)
- No workspace deletion/archival capability
- Active workspace indicator is text-based rather than visual badge
- Create workspace modal is a basic form — no configuration options at creation

---

## 4. Product Story Audit

### 4.1 The 5-Second Test

When a user opens SentinelAI, can they answer:

| Question | Current Answer | Grade |
|----------|---------------|-------|
| Is my AI system safe? | Must scan 4 KPI cards and compute mental aggregate | D |
| What requires attention? | Critical alerts count is visible but has no action queue | C |
| What changed recently? | 7-day trend chart helps but no "what's new since yesterday" delta | B |
| What should I investigate next? | No prioritized investigation queue | F |

### 4.2 Narrative Gaps

**Missing story arc:**
1. **Current**: "Here are some numbers about your AI system"
2. **Target**: "Your AI posture is healthy. 2 items need attention. Here's what changed. Start here."

**The product doesn't tell a coherent story because:**

- The User Dashboard focuses on risk scores without context (good/bad compared to what?)
- The Org Dashboard focuses on operational metrics (API calls, latency) that belong in a separate "Infrastructure" view
- No page answers "What should I do next?"
- Navigation between risk signals (dashboard) and investigation (logs) requires multiple clicks
- Status messages are generic ("No critical alerts detected. Continue monitoring") instead of actionable

### 4.3 Persona Story Failures

| Persona | Story Failure |
|---------|---------------|
| Maya (Engineer) | Sees raw risk scores but not token usage or model-level breakdown. Needs to correlate risks with deployments |
| Priya (Security) | Sees alerts but no investigation queue. Can't triage or assign |
| David (Compliance) | No compliance framework mapping. No evidence package generation |
| Marcus (CTO) | No aggregated health score. No cost/usage context. Can't gauge risk posture at a glance |

---

## 5. Information Hierarchy Review

### 5.1 Widget Order Analysis

**Dashboard (current):**
```
Row 1: [4 KPI cards — equal weight]
Row 2: [Risk Score Trend] [Top Risk Signals]
Row 3: [Recent High-Risk Activity — full width]
```

**Problem**: Everything has equal visual weight. The trend chart and top signals compete for attention. The recent activity section is the most useful but buried at the bottom.

**Recommended:**
```
Row 1: [Health Score — prominent, 2 cols] [Critical Alerts — 1 col] [What Changed — 1 col]
Row 2: [Risk Score Trend — 2 cols] [Top Risk Signals — 1 col]  
Row 3: [Investigation Queue — full width, truncated to 5]
```

### 5.2 KPI Placement

**Problems:**
- KPI cards are all visually identical (same size, same style)
- No semantic grouping — risk metrics, volume metrics, and operational metrics mixed
- "Events today" is low-value compared to "events today vs yesterday"

**Recommended grouping:**
```
Risk Metrics:  Health Score, Critical Alerts, Average Risk Score
Volume Metrics: Total Events, Events Today (with delta), Active Models
Operational:    MTTR, Open Incidents, Models Monitored
```

### 5.3 Navigation Structure

**Problems:**
- User path and org path have different navigation — confusing for users in both
- "Logs" is vague — "Activity Log" or "Risk Events" is more descriptive
- "Playground" belongs in a secondary slot, not primary navigation
- No "Investigate" primary action in nav
- API Usage is buried — it's the most common page for AI engineers

**Recommended hierarchy:**
```
Primary:          Risk Dashboard | Risk Events | Investigations | Models
Secondary:        Analytics | Audit Logs | API Usage
Settings:         Policies | Team | Settings
```

---

## 6. Component Inventory Review

### 6.1 Components to Keep

| Component | Reason |
|-----------|--------|
| `Badge.tsx` | Severity-variant badges work well |
| `KPICard.tsx` | Domain-specific KPI with proper metrics layout |
| `Modal.tsx` / `Dialog` | Dialog with proper focus trap, escape handling |
| `RiskTable.tsx` | Table with risk-specific column layout |
| `TableSkeleton.tsx` | Loading skeletons |
| `DataTable.tsx` | TanStack table integration |
| `Tabs.tsx` | Radix tabs with proper styling |
| `side-panel` logic in investigation routes | Parallel route for investigations is correct |
| `Button.tsx` | Good variant system |
| `switch.tsx` | Radix switch with Tailwind |
| `select.tsx` | Radix select |
| `motion.tsx` animation presets | Reusable Framer Motion variants |

### 6.2 Components to Improve

| Component | Issue | Improvement |
|-----------|-------|-------------|
| `Card.tsx` | 5+ variant implementations | Single Card with variant props only |
| `AppLayoutModern.tsx` | Has UserMenu embedded inline | Extract UserMenu to separate component |
| `SidebarModern.tsx` | Tight coupling with AppLayoutModern | Make sidebar independently mountable |
| `workspace-intel-dashboard.tsx` | 300+ lines, too many concerns | Split into smaller domain components |
| `intelligence-overview.tsx` | SVG health gauge rendered inline | Extract HealthGauge as shared component |
| `IncidentList.tsx` | Many inline formatting functions | Extract to utils |
| `MemberRow.tsx`/`InviteDialog.tsx` | Good structure but org-specific | Name consistently with workspace-members/ |

### 6.3 Components to Merge

| Components | Merge Reason |
|------------|--------------|
| `AppLayout.tsx` + `AppLayoutModern.tsx` | Single layout system |
| `Sidebar.tsx` + `SidebarModern.tsx` | Single sidebar with variant prop |
| `TopNavbar.tsx` + `TopNavbarModern.tsx` | Single top navbar |
| `Badge.tsx` (root) + `Badge.tsx` (`ui/`) + `Badge.chakra.tsx` | One Badge component |
| `Button.tsx` (root) + `Button.tsx` (`ui/`) + `Button.chakra.tsx` | One Button component |
| `Card.tsx` (root) + `Card.tsx` (`ui/`) + `Card.chakra.tsx` | One Card component |
| `FlagTag.tsx` (root) + `FlagTag.tsx` (`domain/`) | One FlagTag |
| `RiskTable.tsx` + `DataTable.tsx` + `table.tsx` | Single table component |

### 6.4 Components to Remove

| Component | Reason |
|-----------|--------|
| `Modal.chakra.tsx` | Chakra dependency — use Radix Dialog |
| `Button.chakra.tsx` | Chakra dependency |
| `Card.chakra.tsx` | Chakra dependency |
| `Badge.chakra.tsx` | Chakra dependency |
| `TopNavbar.tsx` | Chakra, superseded by Modern variant |
| `Sidebar.tsx` | Chakra, superseded by Modern variant |
| `AppLayout.tsx` | Chakra, superseded by Modern variant |
| `UserMenu.tsx` (root) | Inline in TopNavbarModern, no longer used |

---

## 7. Enterprise UX Gap Analysis

### 7.1 Missing Enterprise Patterns

| Pattern | Where | Impact |
|---------|-------|--------|
| **Bulk actions** | Logs, Baselines, Members | Cannot select + bulk delete/export |
| **Column customization** | Tables | Column order, visibility, width not configurable |
| **Saved filters** | Logs, Dashboard | Every visit resets filters |
| **Global search** | All | No Cmd+K search across entities |
| **Notification preferences** | Settings | No per-channel notification config |
| **Session management** | Profile | No "active sessions" list with revoke |
| **Export with formatting** | All | CSV export works but no PDF report generation |
| **Keyboard shortcuts display** | All | `?` is mentioned in spec but not implemented |
| **Audit trail on every page** | Critical pages | Only Settings has version history |
| **Loading progress indication** | Data-heavy pages | No progress bar for long operations |

### 7.2 Trust-Reducing Patterns

| Pattern | Location | Why It Reduces Trust |
|---------|----------|---------------------|
| Hardcoded "0" for risk alerts | Org Dashboard | Makes the product feel incomplete |
| Raw JSON in `<pre>` | Usage page | Engineering artifact, not production UI |
| Raw JSON in settings history | Settings | Shows API response format to users |
| Debug console.log + debug button | Members page | Ships development code to production |
| Mock data with no API integration | User Logs | Page shows non-functional data |
| `...` as loading state | Org Dashboard | Looks broken, not loading |
| Duplicate background patterns | 3 pages | Feels copy-pasted, not designed |

### 7.3 Cognitive Overload Issues

| Issue | Page | Impact |
|-------|------|--------|
| 4 equal-weight KPI cards | Dashboard | No visual priority. User must mentally parse all 4 |
| Flat list of 200+ rows | Org Logs | No grouping, no summarization, no drill-down |
| API stats + no risk data | Org Dashboard | Wrong metrics for the page's purpose |
| Unlabeled stat cards | Usage page | "Requests" — requests for what? By who? |
| Raw JSON + stat cards mix | Usage page | Developer view mixed with product view |

---

## Appendix: Quick Wins (no-code-change improvements)

1. **Remove `console.log` from members page** — security risk
2. **Remove debug "DEBUG: Invite" button** — production integrity
3. **Replace `<pre>` JSON on usage page** — show structured table or hide section
4. **Remove duplicate `bg-[linear-gradient]`** — add to layout level
5. **Fix SweetAlert2 over-indulgence** — use inline toasts for saves, save confirmations for destructive only
6. **Remove hardcoded "0" Risk Alerts** — show "—" or "No data" instead
