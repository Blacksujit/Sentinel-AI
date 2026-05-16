'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { 
  Activity, 
  Shield, 
  Key, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await getToken()
        const data = await apiGet(`/api/orgs/${orgId}/usage/stats`, token)
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch org stats:', error)
        toast.error('Failed to load organization stats')
      } finally {
        setIsLoading(false)
      }
    }

    if (orgId) {
      fetchStats()
    }
  }, [orgId, getToken])

  const statCards = [
    {
      title: 'Total API Calls',
      value: stats?.total_requests || 0,
      subtitle: `${stats?.requests_24h || 0} in last 24h`,
      icon: Activity,
      trend: 'up',
      color: 'text-blue-400'
    },
    {
      title: 'Success Rate',
      value: `${stats?.success_rate?.toFixed(1) || 0}%`,
      subtitle: `${stats?.error_rate?.toFixed(1) || 0}% error rate`,
      icon: CheckCircle2,
      trend: 'stable',
      color: 'text-green-400'
    },
    {
      title: 'Avg Latency',
      value: stats?.avg_latency_ms ? `${Math.round(stats.avg_latency_ms)}ms` : 'N/A',
      subtitle: 'Response time',
      icon: TrendingUp,
      trend: 'stable',
      color: 'text-purple-400'
    },
    {
      title: 'Risk Alerts',
      value: '0',
      subtitle: 'Last 24 hours',
      icon: AlertTriangle,
      trend: 'stable',
      color: 'text-yellow-400'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-foreground">Organization Overview</h1>
        <p className="text-muted">
          Monitor your AI risk detection activity and performance
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="card-premium border-white/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted">
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
                <p className="text-xs text-muted mt-1">{stat.subtitle}</p>
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
            href={`/org/${orgId}/dashboard/api-keys`}
            icon={Key}
            title="Create API Key"
            description="Generate new API credentials"
            color="text-indigo-400"
          />
          <QuickActionCard
            href={`/org/${orgId}/dashboard/logs`}
            icon={Shield}
            title="View Logs"
            description="Check detection history"
            color="text-emerald-400"
          />
          <QuickActionCard
            href={`/org/${orgId}/dashboard/baselines`}
            icon={Users}
            title="Adjust Baselines"
            description="Configure risk thresholds"
            color="text-amber-400"
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
      className="block p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-foreground group-hover:text-indigo-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
    </a>
  )
}
