'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Clock, GitPullRequest, MessageSquare, Shield, User } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Incident as IncidentType } from '@/lib/workspace-intel/types'

function IncidentBadge({ severity }: { severity: string }) {
  const map: Record<string, { variant: 'destructive' | 'default' | 'secondary' | 'outline' | 'warning' | 'success'; className: string }> = {
    CRITICAL: { variant: 'destructive', className: '' },
    HIGH: { variant: 'warning', className: '' },
    MEDIUM: { variant: 'secondary', className: 'text-[color:var(--amber)]' },
    LOW: { variant: 'success', className: '' },
  }
  const config = map[severity] || map.LOW
  return (
    <Badge variant={config.variant as 'destructive' | 'default' | 'secondary' | 'outline' | 'warning' | 'success'} className={config.className}>
      {severity}
    </Badge>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DETECTED: 'bg-[color:var(--red)]',
    INVESTIGATING: 'bg-[color:var(--amber)]',
    MITIGATING: 'bg-primary',
    RESOLVED: 'bg-[color:var(--green)]',
    POSTMORTEM: 'bg-muted-foreground',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-muted-foreground'}`} />
}

function SourceIcon({ source }: { source: string }) {
  const icons: Record<string, React.ElementType> = {
    ANOMALY: AlertTriangle,
    SLACK: MessageSquare,
    GITHUB: GitPullRequest,
    MANUAL: User,
    ESCALATION: Shield,
    DEPLOYMENT: GitPullRequest,
    ALERT: AlertTriangle,
  }
  const Icon = icons[source] || AlertTriangle
  return <Icon className="w-3.5 h-3.5 text-muted-foreground" />
}

export function IncidentList({
  incidents,
  isLoading,
  onSelect,
}: {
  incidents: IncidentType[]
  isLoading: boolean
  onSelect?: (incident: IncidentType) => void
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">No active incidents</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          SentinelAI monitors anomaly detection, failed deployments, risky PRs, Slack escalations, and alert triggers. Incidents appear here automatically when any of these sources flag an issue requiring investigation.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {incidents.map((incident, idx) => (
        <motion.div
          key={incident.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          onClick={() => onSelect?.(incident)}
          className="flex items-center gap-3 cursor-pointer rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          <StatusDot status={incident.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-card-foreground">{incident.title}</span>
              <IncidentBadge severity={incident.severity} />
            </div>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <SourceIcon source={incident.source} />
                <span className="text-xs text-muted-foreground">{incident.source}</span>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTimeSince(incident.detected_at)}
              </span>
              {incident.affected_services && incident.affected_services.length > 0 && (
                <div className="flex gap-1">
                  {incident.affected_services.slice(0, 2).map((s) => (
                    <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            incident.status === 'DETECTED' ? 'bg-[color:var(--red-bg)] text-[color:var(--red)]' :
            incident.status === 'INVESTIGATING' ? 'bg-[color:var(--amber-bg)] text-[color:var(--amber)]' :
            incident.status === 'MITIGATING' ? 'bg-primary/20 text-primary' :
            incident.status === 'RESOLVED' ? 'bg-[color:var(--green-bg)] text-[color:var(--green)]' :
            'bg-purple-500/20 text-purple-300'
          }`}>
            {incident.status}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

function formatTimeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
