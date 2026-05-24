'use client'

import { motion } from 'framer-motion'
import {
  GitPullRequest, Rocket, AlertTriangle, CheckCircle2,
  XCircle, RotateCcw, Activity, Bell, MessageSquare,
  UserPlus, PlusCircle, FileText,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

type TimelineSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface TimelineEvent {
  id: number
  event_type: string
  title: string
  description: string | null
  severity: TimelineSeverity
  source: string
  metadata: Record<string, unknown>
  ai_summary: string | null
  event_time: string
}

interface TimelineGroup {
  time_start: string
  time_end: string
  event_count: number
  max_severity: TimelineSeverity
  events: TimelineEvent[]
}

function EventIcon({ eventType }: { eventType: string }) {
  const iconMap: Record<string, React.ElementType> = {
    PR_MERGED: GitPullRequest,
    PR_RISK_DETECTED: AlertTriangle,
    DEPLOYMENT_STARTED: Rocket,
    DEPLOYMENT_COMPLETED: CheckCircle2,
    DEPLOYMENT_FAILED: XCircle,
    DEPLOYMENT_ROLLED_BACK: RotateCcw,
    INCIDENT_CREATED: AlertTriangle,
    INCIDENT_RESOLVED: CheckCircle2,
    INCIDENT_ESCALATED: MessageSquare,
    ANOMALY_DETECTED: Activity,
    RISK_INCREASED: AlertTriangle,
    ALERT_TRIGGERED: Bell,
    SLACK_ESCALATION: MessageSquare,
    ROLLBACK_TRIGGERED: RotateCcw,
    MEMBER_JOINED: UserPlus,
    INTEGRATION_ADDED: PlusCircle,
    AI_SUMMARY_GENERATED: FileText,
    POSTMORTEM_CREATED: FileText,
  }
  const Icon = iconMap[eventType] || Activity
  return <Icon className="w-4 h-4" />
}

function SeverityDot({ severity }: { severity: TimelineSeverity }) {
  const colors = {
    INFO: 'bg-slate-400',
    LOW: 'bg-emerald-400',
    MEDIUM: 'bg-amber-400',
    HIGH: 'bg-orange-400',
    CRITICAL: 'bg-rose-400',
  }
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[severity]}`} />
}

function EventCard({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
      <div className="mt-0.5">
        <EventIcon eventType={event.event_type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium truncate">{event.title}</span>
          <SeverityDot severity={event.severity} />
        </div>
        {event.description && (
          <p className="text-xs text-muted truncate mt-0.5">{event.description}</p>
        )}
        {event.ai_summary && (
          <p className="text-xs text-indigo-300/70 mt-1 italic line-clamp-2">
            🤖 {event.ai_summary}
          </p>
        )}
      </div>
      <span className="text-xs text-muted shrink-0 whitespace-nowrap">
        {formatTime(event.event_time)}
      </span>
    </div>
  )
}

export function TimelineView({
  groups,
  isLoading,
}: {
  groups?: TimelineGroup[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        <Activity className="w-5 h-5 mr-2 opacity-50" />
        No timeline events yet
      </div>
    )
  }

  return (
    <div className="relative">
      {groups.map((group, idx) => (
        <motion.div
          key={`${group.time_start}-${idx}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="relative pl-8 pb-4"
        >
          {/* Timeline line */}
          {idx < groups.length - 1 && (
            <div className="absolute left-[7px] top-3 bottom-0 w-px bg-white/10" />
          )}

          {/* Time indicator dot */}
          <div className={`absolute left-0 top-2 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center ${
            group.max_severity === 'CRITICAL' ? 'border-rose-500 bg-rose-500/20' :
            group.max_severity === 'HIGH' ? 'border-orange-500 bg-orange-500/20' :
            'border-white/20 bg-white/5'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              group.max_severity === 'CRITICAL' ? 'bg-rose-400' :
              group.max_severity === 'HIGH' ? 'bg-orange-400' :
              'bg-white/30'
            }`} />
          </div>

          {/* Group header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted font-medium">{formatGroupTime(group.time_start)}</span>
            <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
              {group.event_count} events
            </span>
            {group.max_severity !== 'INFO' && (
              <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                group.max_severity === 'CRITICAL' ? 'text-rose-400 border-rose-500/30' :
                group.max_severity === 'HIGH' || group.max_severity === 'MEDIUM' ? 'text-amber-400 border-amber-500/30' :
                'text-slate-400 border-slate-500/30'
              }`}>
                {group.max_severity}
              </Badge>
            )}
          </div>

          {/* Events */}
          <div className="space-y-1">
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatGroupTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minutes ago`
  if (diffMin < 1440) {
    const h = Math.floor(diffMin / 60)
    return `${h} hour${h > 1 ? 's' : ''} ago`
  }
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
