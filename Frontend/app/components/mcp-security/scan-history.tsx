'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Scan,
  ChevronDown, ChevronRight, ExternalLink, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MCPScanResult, SecurityFinding } from '@/lib/mcp-security/types'
import { useMCPSecurityScans, useTriggerScan } from '@/hooks/mcp-security/use-mcp-security'
import { EmptyState } from '@/components/mcp-security/empty-state'

const severityIcons: Record<string, React.ReactNode> = {
  critical: <ShieldAlert className="h-4 w-4 text-[color:var(--red)]" />,
  high: <AlertTriangle className="h-4 w-4 text-[color:var(--brick)]" />,
  medium: <Shield className="h-4 w-4 text-[color:var(--amber)]" />,
  low: <ShieldCheck className="h-4 w-4 text-[color:var(--signal)]" />,
  info: <Shield className="h-4 w-4 text-muted-foreground" />,
}

const severityBadgeClass: Record<string, string> = {
  critical: 'bg-[color:var(--red-bg)] text-[color:var(--red)] border-[color:var(--red-soft)]',
  high: 'bg-[color:var(--brick-bg)] text-[color:var(--brick)] border-[color:var(--brick-soft)]',
  medium: 'bg-[color:var(--amber-bg)] text-[color:var(--amber)] border-[color:var(--line)]',
  low: 'bg-[color:var(--signal-bg)] text-[color:var(--signal)] border-[color:var(--signal-soft)]',
  info: 'bg-muted text-muted-foreground border-border',
}

export function ScanHistory() {
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [expandedScan, setExpandedScan] = useState<number | null>(null)

  const { data, isLoading, refetch } = useMCPSecurityScans({
    risk_level: riskFilter || undefined,
    limit: 50,
  })
  const triggerScan = useTriggerScan()

  const scans = data?.scans || []

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">Scan History</CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={riskFilter === '' ? 'all' : riskFilter}
            onValueChange={(v) => setRiskFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All risks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risks</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {scans.length === 0 ? (
          <EmptyState
            icon={<Scan className="h-5 w-5" />}
            title="No scans yet"
            description="The surface is unmapped until the first scan runs. Kick one off to get a real risk reading."
            cta={{
              label: triggerScan.isPending ? 'Scanning…' : 'Run a scan',
              icon: <Scan className="h-4 w-4" />,
              onClick: () => triggerScan.mutate({ target: 'config', scan_type: 'server' }),
            }}
          />
        ) : (
          <div className="divide-y divide-border">
            {scans.map(scan => (
              <ScanRow
                key={scan.id}
                scan={scan}
                expanded={expandedScan === scan.id}
                onToggle={() => setExpandedScan(expandedScan === scan.id ? null : scan.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScanRow({
  scan,
  expanded,
  onToggle,
}: {
  scan: MCPScanResult
  expanded: boolean
  onToggle: () => void
}) {
  const icon = severityIcons[scan.risk_level] || severityIcons.info

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {scan.tool_name || scan.server_name || 'Unknown'}
            </span>
            <Badge className={`text-[10px] px-1.5 py-0 border ${severityBadgeClass[scan.risk_level] || severityBadgeClass.info}`}>
              {scan.risk_level}
            </Badge>
            {scan.finding_count > 0 && (
              <span className="text-xs text-muted-foreground">
                {scan.finding_count} finding{scan.finding_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {scan.scan_type} · {scan.created_at ? new Date(scan.created_at).toLocaleString() : 'No date'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-mono">
            {(scan.risk_score * 100).toFixed(0)}%
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && scan.findings?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 ml-10">
              {scan.findings.map((finding, idx) => (
                <FindingCard key={idx} finding={finding} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FindingCard({ finding }: { finding: SecurityFinding }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        {severityIcons[finding.severity] || severityIcons.info}
        <span className="font-medium">{finding.title}</span>
        <Badge className={`text-[10px] px-1.5 py-0 border ${severityBadgeClass[finding.severity] || severityBadgeClass.info}`}>
          {finding.severity}
        </Badge>
        {finding.cwe_id && (
          <span className="text-[10px] text-muted-foreground font-mono">{finding.cwe_id}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{finding.description}</p>
      {finding.recommendation && (
        <p className="text-xs text-[color:var(--teal)] italic">Recommendation: {finding.recommendation}</p>
      )}
    </div>
  )
}
