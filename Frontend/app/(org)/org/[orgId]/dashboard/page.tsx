'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { 
  Activity, 
  Shield, 
  Key, 
  Users, 
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui'
import { HealthGauge } from '@/components/ui/health-gauge'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'
import { useRiskLogs } from '@/hooks/useRiskLogs'

interface OrgStats {
  total_requests: number
  requests_24h: number
  error_rate: number
  avg_latency_ms: number | null
  success_rate: number
}

export default function OrgDashboardPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const { data: logs = [], isLoading: isLoadingLogs } = useRiskLogs({ limit: 200 })

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await getToken()
        const data = await apiGet<OrgStats>(`/api/orgs/${orgId}/usage/stats`, token)
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch org stats:', error)
        toast.error('Failed to load organization stats')
      } finally {
        setIsLoadingStats(false)
      }
    }

    if (orgId) {
      fetchStats()
    }
  }, [orgId, getToken])

  const riskMetrics = useMemo(() => {
    const safe = Array.isArray(logs) ? logs : []
    const crit = safe.filter((l: any) => Number(l.final_risk_score) >= 0.8).length
    const highRisk = safe.filter((l: any) => Number(l.final_risk_score) >= 0.6).length
    const avgRisk = safe.length
      ? safe.reduce((s: number, l: any) => s + Number(l.final_risk_score || 0), 0) / safe.length
      : 0
    return { criticalAlerts: crit, highRiskEvents: highRisk, avgRisk, total: safe.length }
  }, [logs])

  const isLoading = isLoadingStats && isLoadingLogs

  const statCards = [
    {
      title: 'Risk Health',
      value: null,
      subtitle: `${riskMetrics.criticalAlerts} critical, ${riskMetrics.highRiskEvents} high`,
      icon: Shield,
      trend: 'stable' as const,
      color: 'text-primary'
    },
    {
      title: 'Total API Calls',
      value: stats?.total_requests ?? null,
      subtitle: `${stats?.requests_24h || 0} in last 24h`,
      icon: Activity,
      trend: 'up' as const,
      color: 'text-primary'
    },
    {
      title: 'Success Rate',
      value: stats?.success_rate ? `${stats.success_rate.toFixed(1)}%` : null,
      subtitle: `${stats?.error_rate?.toFixed(1) || 0}% error rate`,
      icon: CheckCircle2,
      trend: 'stable' as const,
      color: 'text-green-400'
    },
    {
      title: 'Avg Latency',
      value: stats?.avg_latency_ms ? `${Math.round(stats.avg_latency_ms)}ms` : 'N/A',
      subtitle: 'Response time',
      icon: TrendingUp,
      trend: 'stable' as const,
      color: 'text-primary'
    }
  ]

  const statusBadge = riskMetrics.criticalAlerts > 0 ? 'destructive' as const : riskMetrics.avgRisk >= 0.4 ? 'secondary' as const : 'outline' as const
  const statusLabel = riskMetrics.criticalAlerts > 0 ? 'Needs attention' : riskMetrics.avgRisk >= 0.4 ? 'Monitor' : 'Stable'

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Organization Overview</h1>
            <Badge className={statusBadge === 'destructive' ? 'badge-risk' : 'badge-premium'}>
              {statusLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Monitor your AI risk detection activity and performance
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="card-premium border-border">
            <CardContent className="p-6">
              <HealthGauge
                score={isLoadingLogs ? 0 : Math.round((1 - riskMetrics.avgRisk) * 100)}
                label="AI Risk Health"
                size="sm"
                loading={isLoadingLogs}
              />
              <div className="mt-4 text-xs text-muted-foreground">
                {riskMetrics.total} events analyzed
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {statCards.slice(1).map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 1) * 0.1 }}
          >
            <Card className="card-premium border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            href={`/org/${orgId}/dashboard/logs`}
            icon={Shield}
            title="View Risk Logs"
            description={`${riskMetrics.criticalAlerts} critical alerts to review`}
            color="text-destructive"
          />
          <QuickActionCard
            href={`/org/${orgId}/dashboard/baselines`}
            icon={Users}
            title="Adjust Baselines"
            description="Configure risk thresholds"
            color="text-amber-400"
          />
          <QuickActionCard
            href={`/org/${orgId}/dashboard/api-keys`}
            icon={Key}
            title="Manage API Keys"
            description="Generate new API credentials"
            color="text-primary"
          />
        </div>
      </motion.div>
    </div>
  )
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  color
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-lg bg-card border border-border hover:bg-muted hover:border-border transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-card ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </a>
  )
}
