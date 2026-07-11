'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import {
  Activity, AlertTriangle, Brain, GitPullRequest,
  Clock, Plus, MessageSquare, Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

import { IntelligenceOverview } from './intelligence-overview'
import { TimelineView } from './timeline-view'
import { IncidentList } from './incident-list'
import { ActivityFeed } from './activity-feed'

import {
  useIntelligenceSummary,
  useIncidents,
  useGroupedTimeline,
  useActivityFeed,
  useDeployments,
  useCreateIncident,
  useCreateDeployment,
} from '@/hooks/workspace-intel/use-intelligence'
import { useWorkspaceWebSocket } from '@/hooks/workspace-intel/use-websocket'
import { apiGet } from '@/lib/api-client'
import { WorkspaceMembersSection } from '@/components/workspace-members/workspace-members-section'

interface WorkspaceIntelDashboardProps {
  workspaceId: string
  workspaceName?: string
}

export function WorkspaceIntelDashboard({
  workspaceId,
  workspaceName,
}: WorkspaceIntelDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const { getToken, isSignedIn } = useAuth()
  const [currentUserId, setCurrentUserId] = useState<number>(0)
  const [currentUserRole, setCurrentUserRole] = useState<string>('VIEWER')

  // Real-time WebSocket connection
  useWorkspaceWebSocket(workspaceId)

  // Discover current user's role + id within this workspace
  useEffect(() => {
    let mounted = true
    async function loadMyMembership() {
      if (!isSignedIn) return
      try {
        const token = await getToken()
        const members = (await apiGet(
          `/api/workspaces/${workspaceId}/members`,
          token
        )) as Array<{ user_id: number; role: string; email: string }>
        if (!mounted || !Array.isArray(members)) return
        // Try to match by stored clerk user id via /api/me fallback below
        const me = (await apiGet('/api/me', token)) as { id?: number; user_id?: number; memberships?: Array<{ org_id: number; role: string }> }
        const myUserId: number | undefined = me?.id ?? me?.user_id
        if (myUserId != null) setCurrentUserId(myUserId)
        const mine = members.find((m) => m.user_id === myUserId)
        if (mine) setCurrentUserRole(mine.role)
      } catch (e) {
        // Soft-fail: keep defaults
      }
    }
    loadMyMembership()
    return () => {
      mounted = false
    }
  }, [workspaceId, getToken, isSignedIn])

  // Data fetching
  const { data: summary, isLoading: summaryLoading } = useIntelligenceSummary(workspaceId)
  const { data: incidents, isLoading: incidentsLoading } = useIncidents(workspaceId)
  const { data: timelineGroups, isLoading: timelineLoading } = useGroupedTimeline(workspaceId)
  const { data: activityFeed, isLoading: activityLoading } = useActivityFeed(workspaceId, 20)
  const { data: deployments } = useDeployments(workspaceId)

  const createIncident = useCreateIncident(workspaceId)
  const createDeployment = useCreateDeployment(workspaceId)

  const activeIncidents = (incidents || []).filter(
    (i) => ['DETECTED', 'INVESTIGATING', 'MITIGATING'].includes(i.status),
  )
  const recentIncidents = (incidents || []).slice(0, 5)
  const recentDeployments = (deployments || []).slice(0, 5)

  const handleQuickIncident = async () => {
    await createIncident.mutateAsync({
      title: 'Manual incident from workspace',
      severity: 'MEDIUM',
      source: 'MANUAL',
    })
  }

  const handleQuickDeployment = async () => {
    await createDeployment.mutateAsync({
      service_name: 'api-service',
      version: `v${Date.now()}`,
      environment: 'PRODUCTION',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
            {workspaceName || 'Workspace Intelligence'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time incidents, deployments, and intelligence for this workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleQuickIncident}>
            <AlertTriangle className="w-4 h-4 mr-1" />
            Report Incident
          </Button>
          <Button variant="outline" size="sm" onClick={handleQuickDeployment}>
            <GitPullRequest className="w-4 h-4 mr-1" />
            Log Deployment
          </Button>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </Badge>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Incidents
            {activeIncidents.length > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-400">
                {activeIncidents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="w-4 h-4 mr-1.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="activity">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="memory">
            <Brain className="w-4 h-4 mr-1.5" />
            AI Memory
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-1.5" />
            Members
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <IntelligenceOverview data={summary || null} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Incidents */}
            <Card className="border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-card-foreground">Active Incidents</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setActiveTab('incidents')}>
                  View All →
                </Button>
              </CardHeader>
              <CardContent>
                <IncidentList
                  incidents={activeIncidents.length > 0 ? activeIncidents : recentIncidents}
                  isLoading={incidentsLoading}
                />
              </CardContent>
            </Card>

            {/* Recent Timeline */}
            <Card className="border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-card-foreground">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setActiveTab('timeline')}>
                  View All →
                </Button>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                <TimelineView groups={(timelineGroups || []).slice(0, 3)} isLoading={timelineLoading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4 mt-6">
          <Card className="border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">
                All Incidents
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({incidents?.length || 0} total, {activeIncidents.length} active)
                </span>
              </CardTitle>
              <Button size="sm" onClick={handleQuickIncident}>
                <Plus className="w-4 h-4 mr-1" />
                New Incident
              </Button>
            </CardHeader>
            <CardContent>
              <IncidentList incidents={incidents || []} isLoading={incidentsLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4 mt-6">
          <Card className="border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">Operational Timeline</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Real-time
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              <TimelineView groups={timelineGroups || []} isLoading={timelineLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4 mt-6">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              <ActivityFeed items={activityFeed || []} isLoading={activityLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Memory Tab */}
        <TabsContent value="memory" className="space-y-4 mt-6">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">AI Operational Memory</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Tracked patterns, deployment risk history, and validated root causes across all incidents.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { type: 'INCIDENT_PATTERNS', count: summary?.memory_entries || 0, icon: Brain },
                  { type: 'DEPLOYMENT_RISK', count: (deployments || []).filter(d => d.risk_score && d.risk_score > 0.5).length, icon: GitPullRequest },
                  { type: 'ROOT_CAUSES', count: (incidents || []).filter(i => i.root_cause).length, icon: AlertTriangle },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-card-foreground">{item.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{item.count} entries</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4 mt-6">
          <WorkspaceMembersSection
            workspaceId={workspaceId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
