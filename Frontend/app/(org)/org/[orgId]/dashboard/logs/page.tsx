'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'
import { useWorkspace } from '@/contexts/workspace-context'

interface RiskLog {
  id: number
  created_at: string
  final_risk_score: number
  decision: string | null
  source: string | null
  user_id: string | null
  session_id: string | null
  flags: string[]
  workspace_id: number | null
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - todayStart.getDay())

  if (d >= todayStart) return 'Today'
  if (d >= yesterdayStart) return 'Yesterday'
  if (d >= weekStart) return 'Earlier this week'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const severityBadge = (score: number) => {
  const pct = Math.round(score * 100)
  if (pct >= 85) return <Badge variant="destructive">Critical</Badge>
  if (pct >= 70) return <Badge variant="warning">High</Badge>
  if (pct >= 50) return <Badge variant="warning">Medium</Badge>
  return <Badge variant="success">Low</Badge>
}

const decisionColor = (decision: string | null) => {
  const d = (decision || '').toLowerCase()
  if (d === 'block') return 'text-[color:var(--red)]'
  if (d === 'escalate') return 'text-[color:var(--amber)]'
  if (d === 'warn') return 'text-[color:var(--amber)]'
  return 'text-[color:var(--green)]'
}

export default function OrgLogsPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()

  const [logs, setLogs] = useState<RiskLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'blocked' | 'allowed'>('all')
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<RiskLog | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const token = await getToken()
        const qs = new URLSearchParams()
        if (activeWorkspace?.id) qs.set('workspace_id', activeWorkspace.id)
        const data = await apiGet<RiskLog[]>(`/api/orgs/${orgId}/risk-logs?${qs.toString()}`, token)
        setLogs(data)
      } catch (error) {
        console.error('Failed to fetch logs:', error)
        toast.error('Failed to load logs')
      } finally {
        setIsLoading(false)
      }
    }

    if (orgId) {
      fetchLogs()
    }
  }, [orgId, getToken, activeWorkspace?.id])

  const filteredLogs = useMemo(() => {
    let result = logs.filter((log) => {
      const decision = (log.decision || '').toLowerCase()
      if (filter === 'blocked') return decision === 'block'
      if (filter === 'allowed') return decision === 'allow'
      return true
    })

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (log) =>
          (log.source || '').toLowerCase().includes(q) ||
          (log.decision || '').toLowerCase().includes(q) ||
          (log.user_id || '').toLowerCase().includes(q) ||
          String(log.id).includes(q)
      )
    }

    return result
  }, [logs, filter, search])

  const groupedLogs = useMemo(() => {
    const groups = new Map<string, RiskLog[]>()
    for (const log of filteredLogs) {
      const label = formatDateLabel(log.created_at)
      const existing = groups.get(label) || []
      existing.push(log)
      groups.set(label, existing)
    }
    const sorted = Array.from(groups.entries())
    const order = ['Today', 'Yesterday', 'Earlier this week']
    sorted.sort((a, b) => {
      const ia = order.indexOf(a[0])
      const ib = order.indexOf(b[0])
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return new Date(b[1][0].created_at).getTime() - new Date(a[1][0].created_at).getTime()
    })
    return sorted
  }, [filteredLogs])

  const stats = useMemo(() => {
    const total = filteredLogs.length
    const critical = filteredLogs.filter((l) => l.final_risk_score >= 0.8).length
    const blocked = filteredLogs.filter((l) => (l.decision || '').toLowerCase() === 'block').length
    return { total, critical, blocked }
  }, [filteredLogs])

  const toggleGroup = (label: string) => {
    setExpandedGroup(expandedGroup === label ? null : label)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Logs & Activity</h1>
          <p className="text-sm text-muted-foreground">Audit trail of all API requests and risk analyses</p>
        </div>
        <Button variant="outline" size="sm" className="btn-premium-outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Stats bar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-4">
        <Card className="border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold text-foreground tabular-nums">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="text-xl font-semibold text-destructive tabular-nums">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Blocked</p>
            <p className="text-xl font-semibold text-amber-500 tabular-nums">{stats.blocked}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters Row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search source, decision, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={activeWorkspace?.id || ''}
          onChange={(e) => {
            const id = e.target.value
            const next = workspaces.find((w) => w.id === id) || null
            setActiveWorkspace(next)
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All workspaces</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {(['all', 'blocked', 'allowed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? '' : 'btn-premium-outline'}
            >
              {f === 'all' ? null : f === 'blocked' ? <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Logs List */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Risk Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No logs found</p>
                <p className="text-xs text-muted-foreground">
                  {search || filter !== 'all' ? 'Try adjusting filters or search' : 'Logs will appear here when API calls are made'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedLogs.map(([label, groupLogs]) => {
                  const isExpanded = expandedGroup === label || expandedGroup === null
                  const visible = isExpanded ? groupLogs : groupLogs.slice(0, 3)
                  const hasMore = groupLogs.length > 3

                  return (
                    <div key={label}>
                      <button
                        onClick={() => toggleGroup(label)}
                        className="flex items-center gap-2 text-sm font-medium text-foreground mb-2 hover:text-primary transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {label}
                        <span className="text-xs text-muted-foreground font-normal">({groupLogs.length})</span>
                      </button>

                      <AnimatePresence>
                        <div className="space-y-1.5">
                          {visible.map((log, idx) => (
                            <motion.div
                              key={log.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.03 }}
                            >
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="w-full flex items-center justify-between rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:bg-muted hover:border-primary/20 group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className={decisionColor(log.decision)}>
                                    {(log.decision || '').toLowerCase() === 'block' || (log.decision || '').toLowerCase() === 'escalate'
                                      ? <AlertTriangle className="h-4 w-4 shrink-0" />
                                      : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <code className="font-mono text-sm text-foreground truncate max-w-[180px]">{log.source || 'unknown'}</code>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-xs ${decisionColor(log.decision)}`}>
                                        {log.decision || 'unknown'}
                                      </span>
                                      {log.user_id && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                          {log.user_id}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Risk</div>
                                    <div className="font-mono text-sm tabular-nums text-foreground">{Math.round(log.final_risk_score * 100)}</div>
                                  </div>
                                  {severityBadge(log.final_risk_score)}
                                </div>
                              </button>
                            </motion.div>
                          ))}
                          {hasMore && !isExpanded && (
                            <button
                              onClick={() => setExpandedGroup(label)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors pt-1 pl-2"
                            >
                              <ChevronDown className="h-3 w-3" />
                              Show {groupLogs.length - 3} more
                            </button>
                          )}
                        </div>
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null) }}>
        <DialogContent className="sm:max-w-lg">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  Event #{selectedLog.id}
                </DialogTitle>
                <DialogDescription>
                  Logged {new Date(selectedLog.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Decision</p>
                    <p className={`text-sm font-medium mt-0.5 ${decisionColor(selectedLog.decision)}`}>
                      {selectedLog.decision || 'unknown'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                    <p className="text-sm font-medium mt-0.5 text-foreground">
                      {Math.round(selectedLog.final_risk_score * 100)} / 100
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-mono mt-0.5 text-foreground truncate">{selectedLog.source || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">User</p>
                    <p className="text-sm font-mono mt-0.5 text-foreground truncate">{selectedLog.user_id || '—'}</p>
                  </div>
                </div>

                {selectedLog.flags && selectedLog.flags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Flags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLog.flags.map((flag, i) => (
                        <span key={i} className="inline-flex items-center rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.session_id && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Session ID</p>
                    <p className="text-sm font-mono mt-0.5 text-foreground">{selectedLog.session_id}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
