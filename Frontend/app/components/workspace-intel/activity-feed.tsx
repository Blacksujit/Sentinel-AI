'use client'

import { motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, UserPlus, UserMinus,
  PlusCircle, Trash2, Settings, Bell, Brain, FileText, Activity,
} from 'lucide-react'
import type { ActivityFeedItem } from '@/lib/workspace-intel/types'

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    INCIDENT_CREATED: AlertTriangle,
    INCIDENT_UPDATED: AlertTriangle,
    INCIDENT_RESOLVED: CheckCircle2,
    DEPLOYMENT_STARTED: Activity,
    DEPLOYMENT_COMPLETED: CheckCircle2,
    DEPLOYMENT_FAILED: AlertTriangle,
    MEMBER_ADDED: UserPlus,
    MEMBER_REMOVED: UserMinus,
    INTEGRATION_ADDED: PlusCircle,
    INTEGRATION_REMOVED: Trash2,
    SETTINGS_CHANGED: Settings,
    ESCALATION_TRIGGERED: Bell,
    AI_INSIGHT: Brain,
    POSTMORTEM_CREATED: FileText,
    SUMMARY_GENERATED: FileText,
  }
  const Icon = icons[type] || Activity
  return <Icon className="w-3.5 h-3.5" />
}

export function ActivityFeed({
  items,
  isLoading,
}: {
  items: ActivityFeedItem[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted text-sm">
        <Activity className="w-4 h-4 mr-2 opacity-50" />
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.02 }}
          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="p-1.5 rounded-md bg-white/5 text-muted mt-0.5">
            <ActivityIcon type={item.activity_type} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted truncate">{item.description}</p>
            )}
            {item.actor_name && (
              <p className="text-[10px] text-muted mt-0.5">by {item.actor_name}</p>
            )}
          </div>
          <span className="text-[10px] text-muted shrink-0 whitespace-nowrap">
            {formatTimeAgo(item.activity_time)}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
