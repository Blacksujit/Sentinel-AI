'use client'

import { motion } from 'framer-motion'
import { Shield, Scan, RefreshCw, Zap, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { SecurityDashboard } from '@/lib/mcp-security/types'

interface BriefingHeroProps {
  dashboard?: SecurityDashboard
  isLoading?: boolean
  refreshing?: boolean
  scanning?: boolean
  isWatching?: boolean
  watchedPathCount?: number
  onRefresh: () => void
  onScan: () => void
}

function weightedRisk(dashboard: SecurityDashboard | undefined): number {
  if (!dashboard) return 0
  const d = dashboard.risk_distribution
  const weight = (d.critical || 0) * 30 + (d.high || 0) * 12 + (d.medium || 0) * 4 + (d.low || 0) * 1
  return Math.max(0, Math.min(100, 100 - weight))
}

const RISK_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const
const RISK_COLOR: Record<string, string> = {
  critical: 'var(--red)',
  high: 'var(--brick)',
  medium: 'var(--amber)',
  low: 'var(--signal)',
  info: 'var(--ink-soft)',
}

export function BriefingHero({
  dashboard,
  isLoading,
  refreshing,
  scanning,
  isWatching,
  watchedPathCount = 0,
  onRefresh,
  onScan,
}: BriefingHeroProps) {
  const summary = dashboard?.summary
  const totalScans = summary?.total_scans ?? 0
  const hasData = !!dashboard && totalScans > 0
  const totalFindings =
    (dashboard?.risk_distribution.critical || 0) +
    (dashboard?.risk_distribution.high || 0) +
    (dashboard?.risk_distribution.medium || 0) +
    (dashboard?.risk_distribution.low || 0)
  const score = Math.round(weightedRisk(dashboard))
  const r = 56
  const circumference = 2 * Math.PI * r
  const stroke = (score / 100) * circumference

  const kpis = [
    { label: 'Critical findings', value: summary?.critical_findings ?? 0, tone: 'var(--red)' },
    { label: 'High findings', value: summary?.high_findings ?? 0, tone: 'var(--brick)' },
    { label: 'Active agents', value: summary?.active_agents ?? 0, tone: 'var(--ink)' },
    { label: 'Unacked alerts', value: summary?.unacknowledged_alerts ?? 0, tone: 'var(--amber)' },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
      {/* faint editorial backdrop */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[color:var(--signal-bg)] opacity-70 blur-3xl" />

      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        {/* Narrative + KPIs */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Threat Briefing
            </Badge>
            <Badge
              className={`gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                isWatching
                  ? 'bg-[color:var(--signal-bg)] text-[color:var(--signal)] border border-[color:var(--signal)]/30'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isWatching ? 'bg-[color:var(--signal)] animate-pulse' : 'bg-muted-foreground'}`}
              />
              {isWatching ? 'Live · watching' : 'Not watching'}
            </Badge>
          </div>

          <h1
            className="max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Your AI agents talk to the world.
            <span className="text-[color:var(--signal)]"> Is it safe?</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Sentinel watches every tool call, guardrail decision and config change across your
            MCP estate — and translates them into one judgement of posture.
          </p>

          {!hasData && !isLoading ? (
            <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">No scans have run yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We won&apos;t invent a posture score. Run your first scan to map the attack
                surface and get a real reading.
              </p>
              <Button onClick={onScan} disabled={scanning} className="mt-4 h-9" size="sm">
                <Scan className="mr-1.5 h-4 w-4" />
                {scanning ? 'Scanning…' : 'Run first scan'}
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="text-xl font-semibold leading-none" style={{ color: kpi.tone }}>
                    {isLoading ? '–' : kpi.value}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={onScan} disabled={scanning} size="sm" className="h-9">
              <Scan className="mr-1.5 h-4 w-4" />
              {scanning ? 'Scanning…' : 'Scan now'}
            </Button>
            <Button onClick={onRefresh} disabled={refreshing} variant="ghost" size="sm" className="h-9">
              <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh posture
            </Button>
            {watchedPathCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-[color:var(--signal)]" />
                {watchedPathCount} config path{watchedPathCount !== 1 ? 's' : ''} under watch
              </span>
            )}
          </div>
        </div>

        {/* Posture gauge */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative h-40 w-40">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={hasData ? 'var(--signal)' : 'var(--line-strong)'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${isLoading ? 0 : stroke} ${circumference}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {isLoading ? '–' : hasData ? score : '100'}
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                posture
              </span>
            </div>
          </div>

          <div className="mt-6 w-full">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>Risk distribution</span>
              <span>{totalFindings > 0 ? `${totalFindings} finding${totalFindings !== 1 ? 's' : ''}` : 'none'}</span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {totalFindings > 0 ? (
                RISK_ORDER.map((key) => {
                  const n = dashboard?.risk_distribution?.[key] ?? 0
                  if (n <= 0) return null
                  return (
                    <motion.div
                      key={key}
                      initial={{ width: 0 }}
                      animate={{ width: `${(n / totalFindings) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full"
                      style={{ backgroundColor: RISK_COLOR[key] }}
                    />
                  )
                })
              ) : (
                <div className="h-full w-full bg-[color:var(--signal)]/60" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {RISK_ORDER.slice(0, 4).map((key) => (
                <span key={key} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: RISK_COLOR[key] }} />
                  {key}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
