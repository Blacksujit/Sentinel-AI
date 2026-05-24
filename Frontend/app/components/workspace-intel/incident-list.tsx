'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Clock, GitPullRequest, MessageSquare, Shield, User } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Incident as IncidentType } from '@/lib/workspace-intel/types'

function IncidentBadge({ severity }: { severity: string }) {
  const map: Record<string, { variant: 'destructive' | 'default' | 'secondary' | 'outline'; className: string }> = {
    CRITICAL: { variant: 'destructive', className: '' },
    HIGH: { variant: 'default', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    MEDIUM: { variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    LOW: { variant: 'outline', className: 'text-emerald-400 border-emerald-500/30' },
  }
  const config = map[severity] || map.LOW
  return (
    <Badge variant={config.variant as 'destructive' | 'default' | 'secondary' | 'outline'} className={config.className}>
      {severity}
    </Badge>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DETECTED: 'bg-rose-500 animate-pulse',
    INVESTIGATING: 'bg-amber-500 animate-pulse',
    MITIGATING: 'bg-blue-500',
    RESOLVED: 'bg-emerald-500',
    POSTMORTEM: 'bg-purple-500',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-slate-400'}`} />
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
  return <Icon className="w-3.5 h-3.5 text-muted" />
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
          <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted text-sm">
        <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
        <p>No incidents detected</p>
        <p className="text-xs mt-1">Your workspace is clear</p>
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
          className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <StatusDot status={incident.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-medium truncate">{incident.title}</span>
              <IncidentBadge severity={incident.severity} />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <SourceIcon source={incident.source} />
                <span className="text-xs text-muted">{incident.source}</span>
              </div>
              <span className="text-xs text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeSince(incident.detected_at)}
              </span>
              {incident.affected_services && incident.affected_services.length > 0 && (
                <div className="flex gap-1">
                  {incident.affected_services.slice(0, 2).map((s) => (
                    <span key={s} className="text-[10px] bg-white/10 text-muted px-1.5 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            incident.status === 'DETECTED' ? 'bg-rose-500/20 text-rose-300' :
            incident.status === 'INVESTIGATING' ? 'bg-amber-500/20 text-amber-300' :
            incident.status === 'MITIGATING' ? 'bg-blue-500/20 text-blue-300' :
            incident.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' :
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
