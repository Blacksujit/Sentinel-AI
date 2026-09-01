'use client'

import { useEffect, useState } from 'react'
import { Shield, Scan, RefreshCw, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BriefingHero } from '@/components/mcp-security/briefing-hero'
import { SectionShell } from '@/components/mcp-security/section-shell'
import { ScanHistory } from '@/components/mcp-security/scan-history'
import { AgentProfiles } from '@/components/mcp-security/agent-profiles'
import { ThreatGraph } from '@/components/mcp-security/threat-graph'
import { ActivityFeed } from '@/components/mcp-security/activity-feed'
import { AlertHistory } from '@/components/mcp-security/alert-history'
import { GuardrailDecisions } from '@/components/mcp-security/guardrail-decisions'
import { ConfigWatcherStatus } from '@/components/mcp-security/config-watcher-status'
import {
  useSecurityDashboard,
  useTriggerScan,
  useConfigWatcherStatus,
} from '@/hooks/mcp-security/use-mcp-security'

const CHAPTERS = [
  { id: 'signal', label: 'Signal' },
  { id: 'surveillance', label: 'Surveillance' },
  { id: 'findings', label: 'Findings' },
  { id: 'guardrails', label: 'Agents & Guardrails' },
  { id: 'map', label: 'Attack surface' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'live', label: 'Live feed' },
] as const

function useActiveChapter(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0])
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    )
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])
  return active
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function MCPSecurityPage() {
  const { data: dashboard, isLoading, refetch: refetchDashboard } = useSecurityDashboard()

  const { data: watcher, refetch: refetchWatcher } = useConfigWatcherStatus()
  const triggerScan = useTriggerScan()

  const active = useActiveChapter(CHAPTERS.map((c) => c.id))

  const handleRefresh = () => {
    refetchDashboard()
    refetchWatcher()
  }
  const handleScan = () => triggerScan.mutate({ target: 'config', scan_type: 'server' })

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky command bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-[color:var(--signal)]" />
              <div className="leading-tight">
                <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Threat Briefing
                </h1>
                <p className="text-[11px] text-muted-foreground">MCP Security Monitor</p>
              </div>
              <Badge className="gap-1.5 px-2 py-0.5 text-[10px] bg-[color:var(--signal-bg)] text-[color:var(--signal)] border border-[color:var(--signal)]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal)] animate-pulse" />
                Live
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-8"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleScan}
                disabled={triggerScan.isPending}
                className="h-8"
              >
                <Scan className="h-3.5 w-3.5 mr-1" />
                {triggerScan.isPending ? 'Scanning…' : 'Scan now'}
              </Button>
            </div>
          </div>

          {/* Chapter nav — horizontally scrollable on small screens */}
          <nav className="-mb-px flex gap-1 overflow-x-auto pb-0" aria-label="Briefing chapters">
            {CHAPTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => scrollTo(c.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  active === c.id
                    ? 'border-[color:var(--signal)] text-[color:var(--signal)]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {c.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Briefing body */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-32">
        <div className="pt-6 sm:pt-8">
          {/* 1 · Signal */}
          <BriefingHero
            dashboard={dashboard}
            isLoading={isLoading}
            refreshing={isLoading}
            scanning={triggerScan.isPending}
            isWatching={watcher?.is_watching}
            watchedPathCount={watcher?.watched_paths?.length ?? 0}
            onRefresh={handleRefresh}
            onScan={handleScan}
          />
        </div>

        {/* 2 · Surveillance */}
        <SectionShell
          id="surveillance"
          index="02"
          kicker="Surveillance"
          title="What we're watching"
          lede="The config files on disk are the ground truth of what your agents are allowed to reach. Sentinel tails them in real time so a change can never slip past unnoticed."
        >
          <ConfigWatcherStatus />
        </SectionShell>

        {/* 3 · Findings */}
        <SectionShell
          id="findings"
          index="03"
          kicker="Findings"
          title="What we've found"
          lede="Every server, tool and data source we scan gets a risk verdict. The story reads from most severe to least — critical first, then the rest of the surface."
        >
          <ScanHistory />
        </SectionShell>

        {/* 4 · Agents & Guardrails */}
        <SectionShell
          id="guardrails"
          index="04"
          kicker="Agents & Guardrails"
          title="Who's acting — and who's stopped"
          lede="Each agent has a rulebook. When a call is allowed, warned, blocked or escalated, that decision is the guardrail doing its job."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <AgentProfiles />
            <GuardrailDecisions />
          </div>
        </SectionShell>

        {/* 5 · Attack surface */}
        <SectionShell
          id="map"
          index="05"
          kicker="Attack surface"
          title="The map"
          lede="Nodes are your agents, servers and tools; edges are the trust between them. Dense, risky clusters are where an exploit would do the most damage."
        >
          <ThreatGraph />
        </SectionShell>

        {/* 6 · Incidents */}
        <SectionShell
          id="incidents"
          index="06"
          kicker="Incidents"
          title="The timeline"
          lede="Alerts, in the order they happened. Acknowledge what you own; resolve what you've fixed so the queue stays honest."
        >
          <AlertHistory />
        </SectionShell>

        {/* 7 · Live feed */}
        <SectionShell
          id="live"
          index="07"
          kicker="Live feed"
          title="As it happens"
          lede="The streaming record of guardrail decisions and findings landing right now."
        >
          <ActivityFeed />
        </SectionShell>
      </main>

      {/* Mobile bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--signal)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--signal)]" />
            </span>
            <span className="truncate text-xs font-medium text-foreground">
              {watcher?.is_watching ? 'Watching config in real time' : 'Watcher off'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollTo('signal')}
              className="h-9 px-3"
              aria-label="Back to top"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleScan} disabled={triggerScan.isPending} className="h-9">
              <Scan className="h-4 w-4 mr-1" />
              {triggerScan.isPending ? 'Scanning…' : 'Scan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
