# DISPATCH: Agent 2 — Frontend Engineer

Session: 20260826-risk-trend
Task: Add risk trend charts to the org dashboard — frontend recharts chart

## API CONTRACT (build against this, not other agents' code)

The backend agent is building this endpoint in parallel:
```
GET /api/orgs/{org_id}/usage/trend?days=30

Response: array of:
{
  "date": "2026-08-01",       // ISO date string, day bucket
  "avg_risk_score": 0.23,    // float 0-1, average final_risk_score that day
  "event_count": 45,         // int, total risk events that day
  "critical_count": 2        // int, events with final_risk_score >= 0.8 that day
}
```

## Your scope

- **Owns:** `Frontend/app/charts/`, `Frontend/app/(org)/org/[orgId]/dashboard/page.tsx`
- **Forbidden:** Backend/**, sentinelai-sdk/**
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind, recharts (already installed)
- **Verify before commit:** `cd Frontend && npm run lint` and `cd Frontend && npm run type-check`

## What to build

1. Replace the placeholder `Frontend/app/charts/LineChart.tsx` (currently a stub that says "Chart will be rendered here") with a real recharts chart component. Create a new `RiskTrendChart.tsx` component in `Frontend/app/charts/` that:
   - Accepts a `data` prop matching the contract shape above (array of {date, avg_risk_score, event_count, critical_count})
   - Renders a recharts `LineChart` with two lines: avg_risk_score (0-1, show as %) and critical_count
   - Uses a `Tooltip` and `XAxis` (date) and `YAxis`
   - Is styled to match the existing dark theme (use Tailwind classes / CSS vars like `text-muted-foreground`)
2. Add a `useRiskTrend` hook (in `Frontend/app/hooks/` or inline) that calls `GET /api/orgs/{orgId}/usage/trend?days=30` using the existing `apiGet` pattern from `@/lib/api-client`, with react-query like the existing `useRiskLogs` hook.
3. Add the `RiskTrendChart` to `Frontend/app/(org)/org/[orgId]/dashboard/page.tsx` — place it below the stats grid and above Quick Actions, in a Card with a header "Risk Trend (Last 30 Days)". Use the existing `apiGet` from `@/lib/api-client` and `getToken` from `@clerk/nextjs`.
4. Run `cd Frontend && npm run lint` and `cd Frontend && npm run type-check`. Both must pass.
5. Commit: `git add Frontend/app/charts/ Frontend/app/\(org\)/ Frontend/app/hooks/ && git commit -m "feat(frontend): add risk trend chart to org dashboard with recharts"`

## Constraints

- Do NOT touch Backend or SDK files.
- recharts is already in package.json (`^2.15.4`) — do NOT add new dependencies.
- Use the existing `apiGet` from `@/lib/api-client` for API calls, and `getToken` from `@clerk/nextjs` for auth — match the pattern in the existing dashboard page.
- The chart must be type-safe — define a TypeScript interface for the trend data matching the contract.
- Keep the existing dashboard layout intact — only ADD the chart, don't restructure.
- Handle loading and empty states (show a skeleton or "No data yet" when data is empty).
