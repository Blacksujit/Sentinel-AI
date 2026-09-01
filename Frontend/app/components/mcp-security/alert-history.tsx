'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, BellRing, BellOff, CheckCircle, AlertTriangle,
  ShieldAlert, Shield, Clock, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useMCPSecurityAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
} from '@/hooks/mcp-security/use-mcp-security'
import type { SecurityAlert } from '@/lib/mcp-security/types'
import { EmptyState } from '@/components/mcp-security/empty-state'

const severityBadgeClass: Record<string, string> = {
  critical: 'bg-[color:var(--red-bg)] text-[color:var(--red)] border-[color:var(--red-soft)]',
  high: 'bg-[color:var(--brick-bg)] text-[color:var(--brick)] border-[color:var(--brick-soft)]',
  medium: 'bg-[color:var(--amber-bg)] text-[color:var(--amber)] border-[color:var(--line)]',
  low: 'bg-[color:var(--signal-bg)] text-[color:var(--signal)] border-[color:var(--signal-soft)]',
  info: 'bg-muted text-muted-foreground border-border',
}

const severityIcons: Record<string, React.ReactNode> = {
  critical: <ShieldAlert className="h-4 w-4 text-[color:var(--red)]" />,
  high: <AlertTriangle className="h-4 w-4 text-[color:var(--brick)]" />,
  medium: <Shield className="h-4 w-4 text-[color:var(--amber)]" />,
  low: <Shield className="h-4 w-4 text-[color:var(--signal)]" />,
  info: <Bell className="h-4 w-4 text-muted-foreground" />,
}

export function AlertHistory() {
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, refetch } = useMCPSecurityAlerts({
    status: statusFilter || undefined,
    limit: 50,
  })
  const acknowledgeAlert = useAcknowledgeAlert()
  const resolveAlert = useResolveAlert()

  const alerts = data?.alerts || []
  const isUpdating = acknowledgeAlert.isPending || resolveAlert.isPending

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alert History
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter === '' ? 'all' : statusFilter}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <EmptyState
            icon={<BellOff className="h-5 w-5" />}
            title="No alerts"
            description="Nothing has tripped the guardrails. When it does, it will show up here in severity order — no noise, no zeros."
          />
        ) : (
          <div className="divide-y divide-border">
            {alerts.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                disabled={isUpdating}
                onAcknowledge={async () => {
                  await acknowledgeAlert.mutateAsync({ alertId: alert.id })
                }}
                onResolve={async () => {
                  await resolveAlert.mutateAsync({ alertId: alert.id })
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AlertRow({
  alert,
  onAcknowledge,
  onResolve,
  disabled,
}: {
  alert: SecurityAlert
  onAcknowledge: () => void
  onResolve: () => void
  disabled?: boolean
}) {
  const icon = severityIcons[alert.severity] || severityIcons.info
  const isActive = alert.status === 'active'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`px-4 py-3 hover:bg-muted/20 transition-colors ${isActive ? 'bg-muted/10' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{alert.title}</span>
            <Badge className={`text-[10px] px-1.5 py-0 border ${severityBadgeClass[alert.severity] || severityBadgeClass.info}`}>
              {alert.severity}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0 border ${
              alert.status === 'active' ? severityBadgeClass.high :
              alert.status === 'acknowledged' ? severityBadgeClass.medium :
              severityBadgeClass.low
            }`}>
              {alert.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Unknown'}
          </p>
        </div>
        {isActive && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAcknowledge}
              className="h-7 text-xs"
              disabled={disabled}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Ack
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResolve}
              className="h-7 text-xs"
              disabled={disabled}
            >
              Resolve
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
