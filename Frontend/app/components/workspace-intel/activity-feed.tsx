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
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-sm font-medium text-foreground">No recent activity</p>
        <p className="mt-0.5 text-xs text-muted-foreground max-w-sm">
          Activity from incidents, deployments, member changes, integrations, and AI insights will appear here as they occur.
        </p>
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
          className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
        >
          <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
            <ActivityIcon type={item.activity_type} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-card-foreground">{item.title}</p>
            {item.description && (
              <p className="truncate text-xs text-muted-foreground">{item.description}</p>
            )}
            {item.actor_name && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">by {item.actor_name}</p>
            )}
          </div>
          <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
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
