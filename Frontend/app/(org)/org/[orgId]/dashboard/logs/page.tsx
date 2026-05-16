'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Download
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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

export default function OrgLogsPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()
  
  const [logs, setLogs] = useState<RiskLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'blocked' | 'allowed'>('all')

  useEffect(() => {
    async function fetchLogs() {
      try {
        const token = await getToken()
        const qs = new URLSearchParams()
        if (activeWorkspace?.id) qs.set('workspace_id', activeWorkspace.id)
        const data = await apiGet(`/api/orgs/${orgId}/risk-logs?${qs.toString()}`, token)
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

  const filteredLogs = logs.filter((log) => {
    const decision = (log.decision || '').toLowerCase()
    if (filter === 'blocked') return decision === 'block'
    if (filter === 'allowed') return decision === 'allow'
    return true
  })

  const getRiskBadge = (score: number) => {
    const pct = Math.round(score * 100)
    if (pct >= 85) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>
    if (pct >= 70) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>
    if (pct >= 50) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Low</Badge>
  }

  const getDecisionIcon = (decision: string | null) => {
    const d = (decision || '').toLowerCase()
    if (d === 'block') return <AlertTriangle className="w-4 h-4 text-orange-400" />
    if (d === 'escalate') return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    return <CheckCircle2 className="w-4 h-4 text-green-400" />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs & Activity</h1>
          <p className="text-muted mt-1">
            Audit trail of all API requests and risk analyses
          </p>
        </div>
        <Button variant="outline" className="border-white/10">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="mr-2">
          <select
            value={activeWorkspace?.id || ''}
            onChange={(e) => {
              const id = e.target.value
              const next = workspaces.find((w) => w.id === id) || null
              setActiveWorkspace(next)
            }}
            className="h-9 px-3 rounded-md bg-background text-foreground border border-border"
          >
            <option value="">All workspaces</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'border-white/10'}
        >
          All
        </Button>
        <Button
          variant={filter === 'blocked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('blocked')}
          className={filter === 'blocked' ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'border-white/10'}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Blocked
        </Button>
        <Button
          variant={filter === 'allowed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('allowed')}
          className={filter === 'allowed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'border-white/10'}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Allowed
        </Button>
      </div>

      {/* Logs Table */}
      <Card className="card-premium border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Risk Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No logs found</h3>
              <p className="text-muted mt-1">
                {filter !== 'all' ? 'Try changing the filter' : 'Logs will appear here when API calls are made'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getDecisionIcon(log.decision)}
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-indigo-300">{log.source || 'unknown-source'}</code>
                        <span className="text-xs text-muted">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-muted">
                          Decision:{' '}
                          <span className={
                            (log.decision || '').toLowerCase() === 'block'
                              ? 'text-orange-400'
                              : (log.decision || '').toLowerCase() === 'escalate'
                                ? 'text-yellow-400'
                                : 'text-green-400'
                          }>
                            {log.decision || 'unknown'}
                          </span>
                        </span>
                        {log.user_id && <span className="text-muted">User: {log.user_id}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-muted">Risk</div>
                      <div className="font-mono text-sm">{Math.round(log.final_risk_score * 100)}</div>
                    </div>
                    {getRiskBadge(log.final_risk_score)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
