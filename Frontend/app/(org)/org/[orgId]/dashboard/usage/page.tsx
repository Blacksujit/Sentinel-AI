'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { BarChart3, TrendingUp, Activity } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'

type UsageResponse = any

export default function OrgUsagePage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string

  const [data, setData] = useState<UsageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const token = await getToken()
        const res = await apiGet(`/api/orgs/${orgId}/usage`, token)
        setData(res)
      } catch (error) {
        console.error('Failed to fetch org usage:', error)
        toast.error('Failed to load usage')
      } finally {
        setIsLoading(false)
      }
    }

    if (orgId) fetchUsage()
  }, [getToken, orgId])

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">API Usage</h1>
        <p className="text-muted mt-1">Usage metrics for your organization</p>
      </motion.div>

      <Card className="card-premium border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Usage Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 bg-white/5 rounded-lg animate-pulse" />
          ) : !data ? (
            <div className="text-muted">No usage data available.</div>
          ) : (
            <pre className="text-xs text-muted overflow-auto bg-black/20 p-4 rounded-lg border border-white/10">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-premium border-white/10">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {typeof data?.total_requests === 'number' ? data.total_requests : '--'}
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium border-white/10">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Requests (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {typeof data?.requests_24h === 'number' ? data.requests_24h : '--'}
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {typeof data?.success_rate === 'number' ? `${Math.round(data.success_rate)}%` : '--'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
