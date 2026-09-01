'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserCheck, UserX, Plus, Trash2, Edit, ChevronDown, ChevronRight,
  Shield, ShieldCheck, ShieldAlert
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useMCPSecurityAgents,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
} from '@/hooks/mcp-security/use-mcp-security'
import type { AgentProfile } from '@/lib/mcp-security/types'
import { EmptyState } from '@/components/mcp-security/empty-state'

const statusColors: Record<string, string> = {
  active: 'bg-[color:var(--signal-bg)] text-[color:var(--signal)] border-[color:var(--signal-soft)]',
  blocked: 'bg-[color:var(--red-bg)] text-[color:var(--red)] border-[color:var(--red-soft)]',
  monitoring: 'bg-muted text-muted-foreground border-border',
  inactive: 'bg-muted text-muted-foreground border-border',
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <UserCheck className="h-4 w-4 text-[color:var(--signal)]" />,
  blocked: <UserX className="h-4 w-4 text-[color:var(--red)]" />,
  monitoring: <Shield className="h-4 w-4 text-muted-foreground" />,
  inactive: <Users className="h-4 w-4 text-muted-foreground" />,
}

export function AgentProfiles() {
  const [showCreate, setShowCreate] = useState(false)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  const { data, isLoading } = useMCPSecurityAgents()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()

  const agents = data?.agents || []

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">Agent Guardrail Profiles</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="h-8 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Agent
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <CreateAgentForm
                onSubmit={async (data) => {
                  await createAgent.mutateAsync(data)
                  setShowCreate(false)
                }}
                onCancel={() => setShowCreate(false)}
                isLoading={createAgent.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {agents.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No agent profiles yet"
            description="Every agent you register gets a rulebook. Add your first profile to start enforcing guardrails."
            cta={{ label: 'Add first agent', icon: <Plus className="h-4 w-4" />, onClick: () => setShowCreate(true) }}
          />
        ) : (
          <div className="divide-y divide-border">
            {agents.map(agent => (
              <AgentRow
                key={agent.agent_id}
                agent={agent}
                expanded={expandedAgent === agent.agent_id}
                onToggle={() => setExpandedAgent(expandedAgent === agent.agent_id ? null : agent.agent_id)}
                onBlock={async () => {
                  await updateAgent.mutateAsync({
                    agentId: agent.agent_id,
                    updates: { status: agent.status === 'blocked' ? 'active' : 'blocked' },
                  })
                }}
                onDelete={async () => {
                  if (confirm(`Delete agent "${agent.agent_id}"?`)) {
                    await deleteAgent.mutateAsync(agent.agent_id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AgentRow({
  agent,
  expanded,
  onToggle,
  onBlock,
  onDelete,
}: {
  agent: AgentProfile
  expanded: boolean
  onToggle: () => void
  onBlock: () => void
  onDelete: () => void
}) {
  const icon = statusIcons[agent.status] || statusIcons.inactive

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
            <span className="font-medium text-sm truncate">{agent.agent_id}</span>
            {agent.agent_name && (
              <span className="text-xs text-muted-foreground">({agent.agent_name})</span>
            )}
            <Badge className={`text-[10px] px-1.5 py-0 border ${statusColors[agent.status] || statusColors.inactive}`}>
              {agent.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {agent.allowed_tools.length} tools allowed · {agent.denied_tools.length} denied · {agent.max_calls_per_minute} calls/min
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onBlock() }}
            className="h-7 w-7 p-0"
            title={agent.status === 'blocked' ? 'Unblock' : 'Block'}
          >
            {agent.status === 'blocked' ? (
              <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--signal)]" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-[color:var(--red-text)]" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
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
            <div className="px-4 pb-4 ml-10 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-medium text-muted-foreground">Allowed Tools</span>
                  <div className="mt-1 space-y-0.5">
                    {agent.allowed_tools.length > 0 ? (
                      agent.allowed_tools.map(t => (
                        <Badge key={t} className="text-[10px] mr-1 mb-0.5 bg-[color:var(--signal-bg)] text-[color:var(--signal)] border border-[color:var(--signal-soft)]">
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None configured</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Denied Tools</span>
                  <div className="mt-1 space-y-0.5">
                    {agent.denied_tools.length > 0 ? (
                      agent.denied_tools.map(t => (
                        <Badge key={t} className="text-[10px] mr-1 mb-0.5 bg-[color:var(--red-bg)] text-[color:var(--red-text)] border border-[color:var(--red-soft)]">
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None configured</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="font-medium text-muted-foreground">Rate Limit</span>
                  <p className="mt-0.5">{agent.max_calls_per_minute}/min · {agent.max_calls_per_hour}/hr</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Delegation</span>
                  <p className="mt-0.5">{agent.can_delegate ? 'Allowed' : 'Blocked'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Trusted Agents</span>
                  <p className="mt-0.5">{agent.trusted_agents.length > 0 ? agent.trusted_agents.join(', ') : 'None'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateAgentForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: { agent_id: string; agent_name?: string }) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}) {
  const [agentId, setAgentId] = useState('')
  const [agentName, setAgentName] = useState('')

  return (
    <div className="p-4 space-y-3">
      <h4 className="text-sm font-medium">New Agent Profile</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Agent ID *</label>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="e.g. claude-code-agent"
            className="mt-1 w-full rounded-md border bg-input px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Display Name</label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="e.g. Claude Code"
            className="mt-1 w-full rounded-md border bg-input px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSubmit({ agent_id: agentId, agent_name: agentName || undefined })}
          disabled={!agentId.trim() || isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Profile'}
        </Button>
      </div>
    </div>
  )
}
