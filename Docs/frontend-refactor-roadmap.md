# SentinelAI — Frontend Refactor Roadmap

**Author:** Staff Frontend Engineer & Principal Product Designer (ex-Datadog, ex-CrowdStrike, ex-Linear, ex-Stripe)  
**Date:** 2026-06-23  
**Constraint:** Preserve all existing functionality, APIs, business logic, state management, backend contracts, and authentication

---

## Implementation Principles

1. **One file change at a time** — each step is independently verifiable
2. **No functionality changes** — only presentation, hierarchy, and UX
3. **Preserve all data flows** — existing hooks, API calls, store patterns remain untouched
4. **Progressive enhancement** — P0 first, then P1, then P2
5. **Verify after every change** — build must pass, page must render

---

## P0 — Immediate Fixes (Stop-the-bleeding)

These are production-integrity issues and obvious UI bugs. Fix first, debate later.

| ID | Task | File(s) | Effort | Risk |
|----|------|---------|--------|------|
| P0-1 | Remove `console.log('Members Debug:', ...)` from members page | `members/page.tsx` line 69-78 | 2 min | None |
| P0-2 | Remove "DEBUG: Invite" fallback button | `members/page.tsx` lines 214-223 | 2 min | None |
| P0-3 | Replace `<pre>` raw JSON on Org Usage page with empty state message or structured summary | `usage/page.tsx` | 5 min | None |
| P0-4 | Fix hardcoded "0" Risk Alerts on Org Dashboard — show "—" or make dynamic | `dashboard/page.tsx` line 82 | 2 min | None |
| P0-5 | Move duplicated grid background pattern from 3 pages to layout level | `page.tsx` (user dash, settings, playground) → `layout.tsx` | 10 min | Low |
| P0-6 | Replace SweetAlert2 success popup on settings save with inline toast | `settings/page.tsx` | 10 min | Low |

**Total P0 effort: ~30 minutes**

---

## P1 — High-Impact UX Improvements

### P1-A: Unified Layout Shell (2h)

| Step | Task | Files | Detail |
|------|------|-------|--------|
| P1-A1 | Consolidate layout components | `AppLayout.tsx`, `AppLayoutModern.tsx` → single `AppLayout.tsx` | Merge Chakra and Modern into one Tailwind-only layout. Preserve both props interfaces for backward compat |
| P1-A2 | Consolidate sidebar | `Sidebar.tsx`, `SidebarModern.tsx` → single `Sidebar.tsx` | Unified sidebar with prop-driven variant system |
| P1-A3 | Consolidate top navbar | `TopNavbar.tsx`, `TopNavbarModern.tsx` | Merge into single component with proper mobile responsive |
| P1-A4 | Extract UserMenu to own file | Inline in `AppLayoutModern.tsx` | Move to `components/layout/UserMenuDropdown.tsx` |
| P1-A5 | Apply unified layout to all routes | All layout files | Ensure both user and org routes use same shell |

### P1-B: Dashboard Information Hierarchy (3h)

| Step | Task | Files | Detail |
|------|------|-------|--------|
| P1-B1 | Add AI Risk Health Score widget | `user/dashboard/page.tsx` | Extract health gauge from `intelligence-overview.tsx` as shared component. Show aggregated score (0-100) with color code |
| P1-B2 | Add "What changed" delta card | `user/dashboard/page.tsx` | Show % changes vs previous period for key metrics |
| P1-B3 | Add "What to investigate" action queue | `user/dashboard/page.tsx` | Top 3 prioritized investigation suggestions from high-risk events |
| P1-B4 | Reprioritize KPI card order | `user/dashboard/page.tsx` | Health Score → Critical Alerts → What Changed → Events Today |
| P1-B5 | Fix Org Dashboard to show risk data | `org/[orgId]/dashboard/page.tsx` | Replace operational stats (API calls, latency) with risk-centric KPIs. Keep existing data but display differently |

### P1-C: Org Logs UX (2h)

| Step | Task | Files | Detail |
|------|------|-------|--------|
| P1-C1 | Add time-based grouping | `org/logs/page.tsx` | Group logs by "Today", "Yesterday", "This Week" with collapsible sections |
| P1-C2 | Add search bar | `org/logs/page.tsx` | Debounced text search across log source, decision, and flags |
| P1-C3 | Add detail drill-down modal | `org/logs/page.tsx` | Click log row to expand details in a modal/panel |
| P1-C4 | Replace raw `<select>` with Radix Select | `org/logs/page.tsx` | Consistent component usage |

### P1-D: Org Usage Page Refactor (1h)

| Step | Task | Files | Detail |
|------|------|-------|--------|
| P1-D1 | Remove raw JSON | `org/usage/page.tsx` | Replace with proper structured view |
| P1-D2 | Add time range selector | `org/usage/page.tsx` | Preset time ranges for usage data |
| P1-D3 | Add model breakdown table | `org/usage/page.tsx` | Per-model request/error/latency breakdown |

### P1-E: Settings Page Polish (1h)

| Step | Task | Files | Detail |
|------|------|-------|--------|
| P1-E1 | Replace JSON display in settings history | `settings/page.tsx` | Show formatted, human-readable diff instead of raw JSON |
| P1-E2 | Fix reset button disabled logic | `settings/page.tsx` | Remove `wasReset` flag constraint |
| P1-E3 | Add beforeunload unsaved-changes prompt | `settings/page.tsx` | Intercept navigation when `hasChanges` is true |

### P1-F: Component Consolidation (2h)

| Step | Task | Files | Detail |
|------|------|-------|--------|
| P1-F1 | Merge Chakra UI components into Tailwind equivalents | All `*.chakra.tsx` | Remove Chakra dependency entirely |
| P1-F2 | Merge duplicate Badge components | 3 Badge files | Keep one Badge with all variant support |
| P1-F3 | Merge duplicate Card components | 3+ Card files | Single Card with variant prop |
| P1-F4 | Merge duplicate Button components | 3 Button files | Single Button with variant prop |
| P1-F5 | Merge RiskTable + DataTable + table.tsx | 3 table files | Single generic Table component |

**Total P1 effort: ~11 hours**

---

## P2 — Future Enhancements (Post-refactor)

| ID | Task | Value | Effort |
|----|------|-------|--------|
| P2-1 | Global search (Cmd+K) command palette | High | 8h |
| P2-2 | Saved filters and views for Logs/Dashboard | High | 6h |
| P2-3 | Notification preferences page | Medium | 4h |
| P2-4 | Session management in Profile | Medium | 3h |
| P2-5 | Bulk actions on tables (select + action) | Medium | 4h |
| P2-6 | Column customization for data tables | Medium | 5h |
| P2-7 | PDF report generation | Low | 8h |
| P2-8 | Investigation queue with assignment | High | 6h |
| P2-9 | Real-time dashboard updates via WebSocket | High | 8h |
| P2-10 | Keyboard shortcuts help overlay | Low | 2h |

---

## Execution Order

```
Week 1:
  Day 1: P0-1 through P0-6 (quick fixes, ~30min)
  Day 1: P1-A1 through P1-A5 (unified layout, ~2h)
  Day 2: P1-B1 through P1-B5 (dashboard hierarchy, ~3h)
  Day 3: P1-C1 through P1-C4 (log improvements, ~2h)
  Day 4: P1-D1 through P1-D3 (usage page, ~1h)
  Day 4: P1-E1 through P1-E3 (settings polish, ~1h)
  Day 5: P1-F1 through P1-F5 (component consolidation, ~2h)

Week 2+:
  P2 items as prioritized
```

## Verification Checklist

After every change:
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] Page renders without console errors
- [ ] All interactive elements work (clicks, forms, navigation)
- [ ] API calls still fire correctly
- [ ] Loading/error/empty states still display
- [ ] Responsive layout works at 3 breakpoints
