'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Shield, ShieldAlert, ShieldCheck,
  AlertTriangle, Settings, Clock, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useMCPWebSocket } from '@/hooks/mcp-security/use-mcp-security'
import type { WebSocketMessage } from '@/lib/mcp-security/types'
import { EmptyState } from '@/components/mcp-security/empty-state'

interface ActivityItem {
  id: string
  type: string
  message: string
  severity: string
  timestamp: number
  metadata: Record<string, unknown>
}

const typeIcons: Record<string, React.ReactNode> = {
  scan_finding: <Shield className="h-3.5 w-3.5" />,
  guardrail_decision: <ShieldCheck className="h-3.5 w-3.5" />,
  config_change: <Settings className="h-3.5 w-3.5" />,
  anomaly: <AlertTriangle className="h-3.5 w-3.5" />,
  alert: <ShieldAlert className="h-3.5 w-3.5" />,
}

const severityColors: Record<string, string> = {
  critical: 'text-[color:var(--red-text)]',
  high: 'text-[color:var(--orange)]',
  medium: 'text-[color:var(--yellow)]',
  low: 'text-[color:var(--teal)]',
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    const item: ActivityItem = {
      id: `${msg.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
      type: msg.type,
      message: formatMessage(msg),
      severity: String(msg.payload?.risk_level || msg.payload?.severity || 'info'),
      timestamp: msg.timestamp,
      metadata: msg.payload,
    }
    setItems(prev => [item, ...prev].slice(0, 50)) // Keep last 50
  }, [])

  const { connected } = useMCPWebSocket(handleMessage)

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Live Activity Feed
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[color:var(--signal)] animate-pulse' : 'bg-muted-foreground'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title="Waiting on real events"
            description="This feed only shows what actually happened — scans, config changes, and guardrail decisions. No theatre, just signal."
          />
        ) : (
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            <AnimatePresence initial={false}>
              {items.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ActivityRow item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icon = typeIcons[item.type] || <Activity className="h-3.5 w-3.5" />
  const color = severityColors[item.severity] || 'text-muted-foreground'
  const timeAgo = formatTimeAgo(item.timestamp)

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${color}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{item.message}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  )
}

function formatMessage(msg: WebSocketMessage): string {
  const p = msg.payload
  switch (msg.type) {
    case 'scan_finding':
      return `Scan finding: ${p.tool_name || 'unknown tool'} (${p.risk_level || 'unknown'}) — ${p.findings_count || 0} findings`
    case 'guardrail_decision':
      return `Guardrail ${p.action}: agent ${p.agent_id} → tool ${p.tool_name} (${p.reason || 'no reason'})`
    case 'config_change':
      return `Config change: ${p.path || 'unknown'} — ${p.change_type || 'modified'}`
    case 'anomaly':
      return `Anomaly detected: ${p.title || 'unknown'} (${p.severity || 'info'})`
    case 'alert':
      return `Alert: ${p.title || 'unknown'} (${p.severity || 'info'})`
    default:
      return `${msg.type}: ${JSON.stringify(p).slice(0, 80)}`
  }
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 10_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleString()
}
