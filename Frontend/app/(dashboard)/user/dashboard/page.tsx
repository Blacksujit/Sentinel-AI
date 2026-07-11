'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Badge, Button, Skeleton } from '@/components/ui'
import { motion } from 'framer-motion'
import { 
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, 
  Minus, ArrowRight, Info, Shield, AlertOctagon 
} from 'lucide-react'
import { useMemo } from 'react'
import { useRiskLogs } from '@/hooks/useRiskLogs'
import { BackendWarmupBanner } from '@/components/BackendWarmupBanner'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { UserGuard } from '@/components/guards/user-org-guards'

export default function UserDashboardPage() {
  return (
    <UserGuard>
      <UserDashboardContent />
    </UserGuard>
  )
}

function UserDashboardContent() {
  const {
    data: logs = [],
    isLoading,
    isError,
    error,
  } = useRiskLogs({ limit: 200 })

  const { healthScore, healthTrend, healthStatus, severityBreakdown, topFlags, trendData, recentEvents } = useMemo(() => {
    const safeLogs = Array.isArray(logs) ? logs : []

    const parsed = safeLogs
      .map((log: any) => {
        const created = log?.created_at ? new Date(log.created_at) : null
        const risk = typeof log?.final_risk_score === 'number' ? log.final_risk_score : 0
        const flags = Array.isArray(log?.flags) ? log.flags : []
        return { ...log, _created: created, _risk: risk, _flags: flags }
      })
      .filter((log: any) => log._created instanceof Date && !Number.isNaN(log._created.getTime()))

    const totalEvents = parsed.length
    const criticalAlerts = parsed.filter((l: any) => l._risk >= 0.8).length
    const warningAlerts = parsed.filter((l: any) => l._risk >= 0.6 && l._risk < 0.8).length
    const infoAlerts = parsed.filter((l: any) => l._risk >= 0.4 && l._risk < 0.6).length
    const lowRisk = parsed.filter((l: any) => l._risk < 0.4).length
    const avgRisk = totalEvents
      ? parsed.reduce((sum: number, l: any) => sum + l._risk, 0) / totalEvents
      : 0

    const now = new Date()
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    const eventsToday = parsed.filter((l: any) => isSameDay(l._created, now)).length

    const dayKey = (d: Date) => d.toISOString().slice(0, 10)
    const byDay = new Map<string, { sumRisk: number; count: number }>()
    for (const l of parsed) {
      const key = dayKey(l._created)
      const prev = byDay.get(key) || { sumRisk: 0, count: 0 }
      byDay.set(key, { sumRisk: prev.sumRisk + l._risk, count: prev.count + 1 })
    }

    const last7: { date: string; riskScore: number; events: number; label: string }[] = []
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = dayKey(d)
      const entry = byDay.get(key)
      last7.push({
        date: key,
        riskScore: entry && entry.count ? +(entry.sumRisk / entry.count).toFixed(3) : 0,
        events: entry?.count || 0,
        label: dayLabels[d.getDay()],
      })
    }

    const score = Math.max(0, Math.min(100,
      Math.round((1 - avgRisk) * 100) - Math.min(criticalAlerts * 3, 30)
    ))

    const todayAvg = last7[last7.length - 1]?.riskScore ?? 0
    const yesterdayAvg = last7[last7.length - 2]?.riskScore ?? 0
    const trendDelta = todayAvg - yesterdayAvg

    let healthStatusValue: 'healthy' | 'attention' | 'critical'
    let healthLabel: string
    if (score >= 80) {
      healthStatusValue = 'healthy'
      healthLabel = 'Healthy'
    } else if (score >= 50) {
      healthStatusValue = 'attention'
      healthLabel = 'Needs attention'
    } else {
      healthStatusValue = 'critical'
      healthLabel = 'Critical'
    }

    const flagCounts = new Map<string, number>()
    for (const l of parsed) {
      for (const f of l._flags) {
        flagCounts.set(String(f), (flagCounts.get(String(f)) || 0) + 1)
      }
    }

    const flagsSorted = Array.from(flagCounts.entries())
      .map(([flag, count]) => ({ flag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const sortedByTime = [...parsed]
      .sort((a: any, b: any) => b._created.getTime() - a._created.getTime())
      .slice(0, 10)

    return {
      healthScore: score,
      healthTrend: { delta: trendDelta, direction: trendDelta > 0.01 ? 'up' : trendDelta < -0.01 ? 'down' : 'flat' as 'up' | 'down' | 'flat' },
      healthStatus: { label: healthLabel, value: healthStatusValue },
      severityBreakdown: { critical: criticalAlerts, warning: warningAlerts, info: infoAlerts, low: lowRisk },
      topFlags: flagsSorted,
      trendData: last7,
      recentEvents: sortedByTime,
    }
  }, [logs])

  const ArrowIcon = healthTrend.direction === 'up' 
    ? TrendingUp : healthTrend.direction === 'down' 
    ? TrendingDown : Minus

  const healthColor =
    healthStatus.value === 'healthy' ? 'bg-emerald-500' :
    healthStatus.value === 'attention' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <AppLayout>
      <BackendWarmupBanner />
      {isError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error instanceof Error ? error.message : 'Failed to load dashboard data'}
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[32px] font-bold tracking-tight text-foreground">Dashboard</h1>
              <Badge variant={healthStatus.value === 'critical' ? 'destructive' : healthStatus.value === 'attention' ? 'secondary' : 'outline'} className="text-xs">
                {healthStatus.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              AI risk monitoring &mdash; {isLoading ? 'loading...' : `${healthScore} health score`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="default" size="sm">
              <Link href="/logs">
                Investigate logs
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/user/playground">Playground</Link>
            </Button>
          </div>
        </div>

        {/* Row 1: Health Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="rounded-xl border bg-card p-6"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  {isLoading ? '—' : healthScore}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${healthColor}`} />
                <span className="text-sm font-medium text-foreground">AI Risk Health Score</span>
                {!isLoading && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowIcon className="h-3 w-3" />
                    {Math.abs(healthTrend.delta).toFixed(3)} from yesterday
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{healthScore >= 80 ? 'Your AI risk posture is healthy.' : healthScore >= 50 ? 'Some risk factors need attention.' : 'Critical risk levels detected.'}</span>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthScore}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className={`h-full rounded-full transition-all ${
                healthStatus.value === 'healthy' ? 'bg-emerald-500' :
                healthStatus.value === 'attention' ? 'bg-amber-500' : 'bg-red-500'
              }`}
            />
          </div>
        </motion.div>

        {/* Row 2: Active Alerts + Top Risk Signals */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="rounded-xl border bg-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Active alerts</h2>
              <Badge variant="outline" className="text-xs">{severityBreakdown.critical + severityBreakdown.warning + severityBreakdown.info} total</Badge>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <AlertRow icon={AlertOctagon} color="text-red-500" dotColor="bg-red-500" label="Critical" count={severityBreakdown.critical} />
                <AlertRow icon={AlertTriangle} color="text-amber-500" dotColor="bg-amber-500" label="Warning" count={severityBreakdown.warning} />
                <AlertRow icon={Info} color="text-muted-foreground" dotColor="bg-muted-foreground" label="Info" count={severityBreakdown.info} />
                <hr className="border-border" />
                <AlertRow icon={CheckCircle2} color="text-muted-foreground" dotColor="bg-muted-foreground" label="Low risk" count={severityBreakdown.low} />
              </div>
            )}
            <Link href="/logs" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all events <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>

          {/* Top Risk Signals */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            className="rounded-xl border bg-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Top risk signals</h2>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : topFlags.length > 0 ? (
              <div className="space-y-1.5">
                {topFlags.map((flag, index) => {
                  const maxCount = topFlags[0]?.count || 1
                  const pct = Math.round((flag.count / maxCount) * 100)
                  return (
                    <div key={flag.flag} className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
                        <span className="truncate text-sm text-foreground">{flag.flag}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              index === 0 ? 'bg-red-500' : index === 1 ? 'bg-amber-500' : index === 2 ? 'bg-muted-foreground' : 'bg-muted-foreground'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium tabular-nums text-foreground">{flag.count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                <Shield className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No risk signals detected</p>
                <p className="text-xs text-muted-foreground/60">Risk patterns appear here once SentinelAI identifies recurring flags across events.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Row 3: Risk Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
          className="rounded-xl border bg-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">7-day risk trend</h2>
              <p className="text-xs text-muted-foreground">Daily average risk score</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">7d</Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0] as any
                      return (
                        <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-medium text-foreground">{d.payload.date}</p>
                          <p className="text-muted-foreground">Avg risk: {Number(d.value).toFixed(3)}</p>
                          <p className="text-muted-foreground">Events: {d.payload.events}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area type="monotone" dataKey="riskScore" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#riskGradient)" dot={false} activeDot={{ r: 4, fill: 'hsl(var(--primary))' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Row 4: Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
          className="rounded-xl border bg-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
              <p className="text-xs text-muted-foreground">Latest events requiring attention</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/logs">View all</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Severity</th>
                    <th className="pb-2 pr-4">Event</th>
                    <th className="pb-2 pr-4">Risk</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Flags</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((log: any, i: number) => {
                    const risk = typeof log?._risk === 'number' ? log._risk : 0
                    const sevColor =
                      risk >= 0.8 ? 'bg-red-500/10 text-red-500' :
                      risk >= 0.6 ? 'bg-amber-500/10 text-amber-500' :
                      risk >= 0.4 ? 'bg-muted text-muted-foreground' :
                      'bg-muted text-muted-foreground'
                    const sevLabel =
                      risk >= 0.8 ? 'Critical' :
                      risk >= 0.6 ? 'Warning' :
                      risk >= 0.4 ? 'Info' : 'Low'
                    const flags = Array.isArray(log?._flags) ? log._flags.slice(0, 2) : []
                    const created = log?._created instanceof Date ? log._created : null
                    const decision = String(log?.decision || '—')

                    return (
                      <motion.tr
                        key={String(log?.id ?? i)}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={() => window.location.href = `/logs/${log?.id}`}
                      >
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sevColor}`}>
                            {sevLabel}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                          #{String(log?.id ?? '—')}
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-foreground">
                          {risk.toFixed(2)}
                        </td>
                        <td className="py-2.5 pr-4 text-sm text-foreground">
                          {decision}
                        </td>
                        <td className="py-2.5 pr-4">
                          {flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {flags.map((f: string) => (
                                <span key={f} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {created ? created.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Shield className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No events captured yet</p>
              <p className="max-w-sm text-xs text-muted-foreground/70">
                SentinelAI monitors AI decisions in production and logs risk events here.
                Connect your models or use the Playground to generate test events and see how risk scoring works.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button asChild variant="default" size="sm">
                  <Link href="/user/playground">Try Playground</Link>
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  )
}

function AlertRow({ icon: Icon, color, dotColor, label, count }: {
  icon: React.ComponentType<{ className?: string }>
  color: string
  dotColor: string
  label: string
  count: number
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2.5">
        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium tabular-nums text-foreground">{count}</span>
    </div>
  )
}
