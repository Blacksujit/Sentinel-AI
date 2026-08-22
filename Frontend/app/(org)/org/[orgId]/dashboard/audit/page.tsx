'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Target,
  Globe,
  FileJson,
  ShieldAlert,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'

interface AuditActor {
  email: string
  name?: string | null
}

interface AuditEntry {
  id: number
  action: string
  actor_type: string
  actor_user_id: number | null
  actor: AuditActor | null
  target_type: string | null
  target_id: string | null
  ip: string | null
  user_agent: string | null
  event_metadata: Record<string, unknown> | null
  created_at: string | null
}

interface AuditResponse {
  total: number
  limit: number
  offset: number
  items: AuditEntry[]
}

const PAGE_SIZE = 50

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  'org.created': 'success',
  'org.updated': 'warning',
  'org.deleted': 'destructive',
  'member.invited': 'secondary',
  'member.updated': 'warning',
  'member.removed': 'destructive',
  'baseline.updated': 'warning',
  'settings.updated': 'warning',
  'settings.reset': 'warning',
  'api_key.created': 'secondary',
  'api_key.rotated': 'warning',
  'api_key.revoked': 'destructive',
  'analyze': 'outline',
}

function actionVariant(action: string) {
  return ACTION_VARIANTS[action] || 'secondary'
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function prettyMeta(meta: Record<string, unknown> | null) {
  if (!meta) return null
  try {
    return JSON.stringify(meta, null, 2)
  } catch {
    return String(meta)
  }
}

export default function OrgAuditPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string

  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!orgId) return
    try {
      setIsLoading(true)
      const token = await getToken()
      const qs = new URLSearchParams()
      qs.set('limit', String(PAGE_SIZE))
      qs.set('offset', String(offset))
      if (actionFilter) qs.set('action', actionFilter)
      const data = await apiGet<AuditResponse>(`/api/orgs/${orgId}/audit-logs?${qs.toString()}`, token)
      setEntries(data.items)
      setTotal(data.total)
    } catch (error: unknown) {
      console.error('Failed to fetch audit logs:', error)
      const message = error instanceof Error ? error.message : 'Failed to load audit logs'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, getToken, offset, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const actions = Array.from(new Set(entries.map((e) => e.action))).sort()

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Immutable trail of every privileged action in this organization
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={isLoading}
          className="btn-premium-outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-3"
      >
        <select
          value={actionFilter}
          onChange={(e) => {
            setOffset(0)
            setActionFilter(e.target.value)
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <span className="text-sm text-muted-foreground">
          {total} event{total === 1 ? '' : 's'}
        </span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <ScrollText className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No audit events found</p>
                <p className="text-xs text-muted-foreground">
                  {actionFilter ? 'Try clearing the action filter' : 'Privileged actions will appear here'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className="cursor-pointer" onClick={() => setSelected(entry)}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatTime(entry.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {entry.actor?.email || (entry.actor_type === 'system' ? 'system' : '—')}
                          </span>
                          {entry.actor?.name && (
                            <span className="text-xs text-muted-foreground">({entry.actor.name})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {entry.target_type ? `${entry.target_type}${entry.target_id ? `:${entry.target_id}` : ''}` : '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">{entry.ip || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(entry) }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" />
                  {selected.action}
                  <Badge variant={actionVariant(selected.action)}>#{selected.id}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {formatTime(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Actor</p>
                  <p className="text-sm font-medium mt-0.5 text-foreground">
                    {selected.actor?.email || (selected.actor_type === 'system' ? 'system' : '—')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.actor_type}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-sm font-mono mt-0.5 text-foreground">
                    {selected.target_type ? `${selected.target_type}${selected.target_id ? `:${selected.target_id}` : ''}` : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="text-sm font-mono mt-0.5 text-foreground">{selected.ip || '—'}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">User Agent</p>
                  <p className="text-sm font-mono mt-0.5 text-foreground truncate">{selected.user_agent || '—'}</p>
                </div>
              </div>

              {prettyMeta(selected.event_metadata) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileJson className="h-3.5 w-3.5" />
                    Event Metadata
                  </p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs font-mono text-foreground">
                    {prettyMeta(selected.event_metadata)}
                  </pre>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}