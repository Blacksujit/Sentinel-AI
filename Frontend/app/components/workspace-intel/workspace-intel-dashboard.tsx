'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import {
  Activity, AlertTriangle, Brain, GitPullRequest,
  Clock, Plus, MessageSquare, Zap, Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="w-6 h-6 text-indigo-400" />
            {workspaceName || 'Workspace Intelligence'}
          </h1>
          <p className="text-sm text-muted mt-1">
            AI-native operational coordination — real-time incidents, deployments, and insights
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
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
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
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-rose-500/20 text-rose-300 rounded-full">
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
            <Card className="card-premium border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-white">Active Incidents</CardTitle>
                <Button variant="ghost" size="sm" className="text-muted text-xs" onClick={() => setActiveTab('incidents')}>
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
            <Card className="card-premium border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-muted text-xs" onClick={() => setActiveTab('timeline')}>
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
          <Card className="card-premium border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-white">
                All Incidents
                <span className="ml-2 text-sm text-muted font-normal">
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
          <Card className="card-premium border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-white">Operational Timeline</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Real-time
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              <TimelineView groups={timelineGroups || []} isLoading={timelineLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4 mt-6">
          <Card className="card-premium border-white/10">
            <CardHeader>
              <CardTitle className="text-lg text-white">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              <ActivityFeed items={activityFeed || []} isLoading={activityLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Memory Tab */}
        <TabsContent value="memory" className="space-y-4 mt-6">
          <Card className="card-premium border-white/10">
            <CardHeader>
              <CardTitle className="text-lg text-white">AI Operational Memory</CardTitle>
              <p className="text-sm text-muted mt-1">
                The system learns from every incident and deployment, building a knowledge base
                of patterns, root causes, and fixes.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { type: 'INCIDENT_PATTERNS', count: summary?.memory_entries || 0, icon: Brain, color: 'purple' },
                  { type: 'DEPLOYMENT_RISK', count: (deployments || []).filter(d => d.risk_score && d.risk_score > 0.5).length, icon: GitPullRequest, color: 'amber' },
                  { type: 'ROOT_CAUSES', count: (incidents || []).filter(i => i.root_cause).length, icon: AlertTriangle, color: 'rose' },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                      <div>
                        <p className="text-sm text-white">{item.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted">{item.count} entries</p>
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
