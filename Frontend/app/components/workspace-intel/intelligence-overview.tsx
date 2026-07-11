'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, GitPullRequest, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { HealthGauge } from '@/components/ui/health-gauge'

interface SummaryData {
  active_incidents: number
  recent_events_7d: number
  recent_deployments_7d: number
  failed_deployments_7d: number
  critical_events_7d: number
  member_count: number
  memory_entries: number
  activities_today: number
  health_score: number
}

export function IntelligenceOverview({ data }: { data: SummaryData | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border bg-card animate-pulse">
            <CardContent className="p-6 h-24" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Row 1: Health score + KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border bg-card col-span-1">
          <CardContent className="p-6">
            <HealthGauge score={data.health_score} label="Health Score" size="md" />
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">7d</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{data.recent_events_7d}</p>
            <p className="text-xs text-muted-foreground">{data.activities_today} today</p>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <AlertTriangle className={`h-4 w-4 ${data.active_incidents > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{data.active_incidents}</p>
            <p className="text-xs text-muted-foreground">active incidents</p>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{data.recent_deployments_7d}</p>
            <p className="text-xs text-muted-foreground">{data.failed_deployments_7d} failed</p>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{data.critical_events_7d}</p>
            <p className="text-xs text-muted-foreground">{data.memory_entries} memories</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Event distribution as mini stats instead of decorative charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">7-day Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Total events', value: data.recent_events_7d, color: 'bg-muted-foreground' },
                { label: 'Critical events', value: data.critical_events_7d, color: 'bg-red-500' },
                { label: 'Deployments', value: data.recent_deployments_7d, color: 'bg-primary' },
                { label: 'Failed deploys', value: data.failed_deployments_7d, color: 'bg-red-500' },
              ].map(stat => {
                const max = Math.max(data.recent_events_7d, 1)
                return (
                  <div key={stat.label} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-muted-foreground">{stat.label}</span>
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${stat.color}`} style={{ width: `${(stat.value / max) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm font-medium tabular-nums text-foreground">{stat.value}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.active_incidents > 0 ? (
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold tabular-nums text-red-500">{data.active_incidents}</span>
                <div>
                  <p className="text-sm text-foreground">Requiring attention</p>
                  <p className="text-xs text-muted-foreground">{data.member_count} team members monitoring</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-sm text-muted-foreground">No active incidents. All clear.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
