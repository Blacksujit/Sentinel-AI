'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldAlert, Shield, CheckCircle, XCircle,
  RefreshCw, Clock, ChevronDown, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useGuardrailDecisions } from '@/hooks/mcp-security/use-mcp-security'
import type { GuardrailDecision } from '@/lib/mcp-security/types'
import { EmptyState } from '@/components/mcp-security/empty-state'

const actionIcons: Record<string, React.ReactNode> = {
  allow: <CheckCircle className="h-4 w-4 text-[color:var(--signal)]" />,
  block: <XCircle className="h-4 w-4 text-[color:var(--red)]" />,
  warn: <Shield className="h-4 w-4 text-[color:var(--amber)]" />,
  escalate: <ShieldAlert className="h-4 w-4 text-[color:var(--brick)]" />,
  log: <ShieldCheck className="h-4 w-4 text-muted-foreground" />,
}

const actionBadgeClass: Record<string, string> = {
  allow: 'bg-[color:var(--signal-bg)] text-[color:var(--signal)] border-[color:var(--signal-soft)]',
  block: 'bg-[color:var(--red-bg)] text-[color:var(--red)] border-[color:var(--red-soft)]',
  warn: 'bg-[color:var(--amber-bg)] text-[color:var(--amber)] border-[color:var(--line)]',
  escalate: 'bg-[color:var(--brick-bg)] text-[color:var(--brick)] border-[color:var(--brick-soft)]',
  log: 'bg-muted text-muted-foreground border-border',
}

export function GuardrailDecisions() {
  const [agentFilter, setAgentFilter] = useState<string>('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const { data, isLoading, refetch } = useGuardrailDecisions({
    agent_id: agentFilter || undefined,
    limit: 30,
  })

  const decisions = data?.decisions || []

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Guardrail Decisions
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {decisions.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No guardrail decisions yet"
            description="The guardrails act the moment an agent touches a monitored tool. Until then, there's nothing to report — and that's the good kind of quiet."
          />
        ) : (
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {decisions.map(d => (
              <DecisionRow
                key={d.id}
                decision={d}
                expanded={expanded === d.id}
                onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DecisionRow({
  decision,
  expanded,
  onToggle,
}: {
  decision: GuardrailDecision
  expanded: boolean
  onToggle: () => void
}) {
  const icon = actionIcons[decision.action] || actionIcons.log

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
            <Badge className={`text-[10px] px-1.5 py-0 border ${actionBadgeClass[decision.action] || actionBadgeClass.log}`}>
              {decision.action}
            </Badge>
            <span className="font-medium text-sm truncate">
              {decision.tool_name}
            </span>
            <span className="text-xs text-muted-foreground">
              by {decision.agent_id}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{decision.reason}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-muted-foreground">
            {(decision.risk_score * 100).toFixed(0)}%
          </div>
          {decision.created_at && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
              <Clock className="h-2.5 w-2.5" />
              {new Date(decision.created_at).toLocaleTimeString()}
            </div>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 ml-10 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-muted-foreground">Agent</span>
                  <p className="mt-0.5">{decision.agent_id}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Tool</span>
                  <p className="mt-0.5 font-mono">{decision.tool_name}</p>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Reason</span>
                <p className="mt-0.5">{decision.reason}</p>
              </div>
              {decision.context && Object.keys(decision.context).length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Context</span>
                  <pre className="mt-1 p-2 bg-muted/30 rounded text-[10px] overflow-x-auto">
                    {JSON.stringify(decision.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
