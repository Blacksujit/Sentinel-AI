'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { BarChart3, TrendingUp, Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'
import {
  LineChart,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

type UsageData = Record<string, any>

export default function OrgUsagePage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string

  const [data, setData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const token = await getToken()
        const res = await apiGet<UsageData>(`/api/orgs/${orgId}/usage`, token)
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

  const trendData = useMemo(() => {
    if (!data?.daily_requests || !Array.isArray(data.daily_requests)) return []
    return data.daily_requests.slice(-14).map((d: any) => ({
      date: typeof d.date === 'string' ? d.date.slice(5) : String(d.date || ''),
      requests: d.count || 0,
    }))
  }, [data])

  const metrics = useMemo(() => [
    { label: 'Total Requests', value: data?.total_requests, icon: Activity, color: 'text-primary' },
    { label: 'Requests (24h)', value: data?.requests_24h, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Success Rate', value: data?.success_rate != null ? `${Math.round(data.success_rate)}%` : null, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Error Rate', value: data?.error_rate != null ? `${data.error_rate.toFixed(1)}%` : null, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Avg Latency', value: data?.avg_latency_ms != null ? `${Math.round(data.avg_latency_ms)}ms` : null, icon: Clock, color: 'text-amber-500' },
  ], [data])

  const hasTrend = trendData.length > 0

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">API Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">Usage metrics for your organization</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.03 }}
          >
            <Card className="card-premium border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground font-normal">
                  <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 bg-muted" />
                ) : (
                  <div className="text-xl font-semibold text-foreground tabular-nums">
                    {m.value != null ? (typeof m.value === 'number' ? m.value.toLocaleString() : m.value) : '—'}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {hasTrend && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Daily Request Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="card-premium border border-border p-2 shadow-premium">
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">
                              Requests: {(payload[0] as any).value}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="requests" fill="var(--red)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!isLoading && data && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
            Raw response
          </summary>
          <pre className="mt-2 text-xs text-muted-foreground overflow-auto bg-muted rounded-lg p-4 max-h-64 border border-border">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
