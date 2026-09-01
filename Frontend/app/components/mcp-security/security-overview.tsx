'use client'

import { motion } from 'framer-motion'
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle,
  Users, Bell, Activity, TrendingUp
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import type { SecurityDashboard } from '@/lib/mcp-security/types'

interface Props {
  data: SecurityDashboard | null | undefined
  isLoading: boolean
}

const riskColors = {
  critical: 'text-[color:var(--red-text)]',
  high: 'text-[color:var(--orange)]',
  medium: 'text-[color:var(--yellow)]',
  low: 'text-[color:var(--teal)]',
  info: 'text-muted-foreground',
}

const riskBgs = {
  critical: 'bg-[color:var(--red-bg)]',
  high: 'bg-[color:var(--brick-bg)]',
  medium: 'bg-[color:var(--amber-bg)]',
  low: 'bg-[color:var(--signal-bg)]',
  info: 'bg-muted/50',
}

export function SecurityOverview({ data, isLoading }: Props) {
  if (isLoading || !data) {
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

  const { summary, risk_distribution } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Shield className="h-4 w-4" />}
          label="Total Scans"
          value={summary.total_scans}
          iconColor="text-[color:var(--teal)]"
        />
        <KPICard
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Critical + High"
          value={summary.critical_findings + summary.high_findings}
          iconColor="text-[color:var(--red-text)]"
          alert={summary.critical_findings > 0}
        />
        <KPICard
          icon={<Users className="h-4 w-4" />}
          label="Active Agents"
          value={summary.active_agents}
          iconColor="text-[color:var(--teal)]"
          suffix={summary.blocked_agents > 0 ? ` · ${summary.blocked_agents} blocked` : undefined}
        />
        <KPICard
          icon={<Bell className="h-4 w-4" />}
          label="Open Alerts"
          value={summary.unacknowledged_alerts}
          iconColor="text-[color:var(--orange)]"
          alert={summary.unacknowledged_alerts > 0}
        />
      </div>

      {/* Risk Distribution Bar */}
      <Card className="border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Risk Distribution</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[color:var(--red-text)]" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[color:var(--orange)]" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[color:var(--yellow)]" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[color:var(--teal)]" /> Low
              </span>
            </div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
            {risk_distribution.critical > 0 && (
              <div
                className="bg-[color:var(--red-text)] transition-all duration-500"
                style={{ width: `${(risk_distribution.critical / Math.max(risk_distribution.critical + risk_distribution.high + risk_distribution.medium + risk_distribution.low + risk_distribution.info, 1)) * 100}%` }}
              />
            )}
            {risk_distribution.high > 0 && (
              <div
                className="bg-[color:var(--orange)] transition-all duration-500"
                style={{ width: `${(risk_distribution.high / Math.max(risk_distribution.critical + risk_distribution.high + risk_distribution.medium + risk_distribution.low + risk_distribution.info, 1)) * 100}%` }}
              />
            )}
            {risk_distribution.medium > 0 && (
              <div
                className="bg-[color:var(--yellow)] transition-all duration-500"
                style={{ width: `${(risk_distribution.medium / Math.max(risk_distribution.critical + risk_distribution.high + risk_distribution.medium + risk_distribution.low + risk_distribution.info, 1)) * 100}%` }}
              />
            )}
            {risk_distribution.low > 0 && (
              <div
                className="bg-[color:var(--teal)] transition-all duration-500"
                style={{ width: `${(risk_distribution.low / Math.max(risk_distribution.critical + risk_distribution.high + risk_distribution.medium + risk_distribution.low + risk_distribution.info, 1)) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{risk_distribution.critical} critical</span>
            <span>{risk_distribution.high} high</span>
            <span>{risk_distribution.medium} medium</span>
            <span>{risk_distribution.low} low</span>
            <span>{risk_distribution.info} info</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function KPICard({
  icon, label, value, iconColor, alert, suffix,
}: {
  icon: React.ReactNode
  label: string
  value: number
  iconColor?: string
  alert?: boolean
  suffix?: string
}) {
  return (
    <Card className={`border bg-card ${alert ? 'ring-1 ring-[color:var(--red-soft)]' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className={iconColor || 'text-muted-foreground'}>{icon}</span>
          {alert && <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--red-text)]" />}
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {label}
          {suffix && <span className="text-[color:var(--orange)]">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  )
}
