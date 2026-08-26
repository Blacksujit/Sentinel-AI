# Agent 3 (Docs Engineer) — Result

**Session:** 20260826-risk-trend
**Task:** Document `GET /api/orgs/{org_id}/usage/trend` and the dashboard Risk Trend chart

## Status: Documentation complete; build + commit BLOCKED by tooling outage

All documentation edits are written to disk. Two required terminal steps
(`npm run build`, `git commit`) could **not** be executed because the session
safety reviewer was unavailable this entire turn — every `terminal` action
returned `review_unavailable` and was held. File edits (which don't route
through that reviewer) all succeeded.

## What I documented

### 1. API Reference — `docs-site/content/docs/api.mdx`
Added a new **"Organization usage endpoints"** section before the existing
SDK section. It documents three endpoints against the backend source of truth
and the dispatch contract:

- `GET /api/orgs/{org_id}/usage` — aggregated usage, `days` query param
  (default 30, range 1–365). Response fields derived from
  `UsageService.aggregate_for_org`: `total_requests`, `requests_24h`,
  `success_count`, `success_rate`, `error_count`, `error_rate`,
  `avg_latency_ms`. Field types table included.
- `GET /api/orgs/{org_id}/usage/stats` — dashboard usage stats (same
  aggregation shape, optimized for dashboard widgets).
- `GET /api/orgs/{org_id}/usage/trend` — **the new endpoint.** Daily risk
  trend buckets for the org dashboard.
  - Query param `days` (default 30, range 1–365) — matches the contract.
  - Response: JSON array of `{ "date": "YYYY-MM-DD", "avg_risk_score": float (0–1), "event_count": int, "critical_count": int }` — **matches the contract exactly**.
  - Status codes table (200/401/403/422).
  - curl example.

Every code snippet in the docs matches the dispatch API contract verbatim.

### 2. Dashboard spec — `Docs/dashboard-spec.md`
Added section **2.3.1 "Risk Trend Chart — Data Source"** immediately after the
Dashboard component tree (section 2.3), tying the existing `RiskTrendChart`
widget (already listed in the component tree at section 2.3) to the new
`GET /api/orgs/{org_id}/usage/trend?days=30` endpoint. Documents:
- The endpoint path and the exact JSON bucket shape (matching the contract).
- A field-to-chart mapping table (date → x-axis, avg_risk_score → y-axis,
  event_count / critical_count → tooltip).
- The `days` query param semantics and the 30-day default for both the
  standard dashboard and the Executive persona view (section 2.8).

## Files changed
- `docs-site/content/docs/api.mdx` — added Organization usage endpoints section
- `Docs/dashboard-spec.md` — added section 2.3.1 Risk Trend Chart data source

## Scope compliance
- No Backend or Frontend source code touched (read-only inspection of
  `Backend/app/api/usage_routes.py`, `Backend/app/services/usage_service.py`,
  and `sentinelai-sdk/sentinelai/client.py` only to document the existing
  usage endpoints accurately).
- All JSON snippets match the contract exactly.

## Build result: NOT RUN (blocked)
`cd docs-site && npm run build` — **could not execute.** The terminal tool
returned `review_unavailable` (safety reviewer outage) on every attempt
(tried 5× across `user` and `clean` profiles). Dependencies are present
(`docs-site/node_modules` and `docs-site/.next` exist), so the build is
expected to succeed once the reviewer is available. The change is additive
Markdown/MDX only — no new imports or components — so it cannot introduce a
build break, but this was **not verified** at runtime.

## Commit: NOT RUN (blocked)
The required commit could not be executed for the same reviewer-outage reason.
The exact command to run once terminal access is restored:

```bash
cd /mnt/d/Sentinel-AI && \
  git add Docs/ docs-site/ && \
  git commit -m "docs: document GET /api/orgs/{org_id}/usage/trend endpoint and dashboard risk trend chart"
```

Then capture the commit hash with `git rev-parse HEAD`.

## Note on backend readiness
The `GET /api/orgs/{org_id}/usage/trend` route is not yet present in
`Backend/app/api/usage_routes.py` (verified via grep — only `/usage` and
`/usage/stats` exist). This is expected: the Backend agent works in parallel.
The docs were written against the dispatch API contract, which is the
authoritative source for this task. The docs will match the backend once the
backend agent lands the route.
