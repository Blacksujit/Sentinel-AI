'use client'

import { motion } from 'framer-motion'
import {
  Activity, AlertTriangle, Brain, GitPullRequest, Users, TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

interface SummaryData {
  active_incidents: number
  recent_events_7d: number
  recent_deployments_7d: number
  failed_deployments_7d: number
  critical_events_7d: number
  member_count: number
  memory_entries: number
  activities_today: number
  health_score: number
}

function HealthGauge({ score }: { score: number }) {
  const segments = [
    { limit: 40, color: '#fb7185', label: 'Critical' },
    { limit: 70, color: '#fbbf24', label: 'Degraded' },
    { limit: 100, color: '#34d399', label: 'Stable' },
  ]
  const active = segments.find(s => score <= s.limit) || segments[2]
  const r = 36
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width="96" height="96" className="transform -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={active.color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color: active.color }}>
        {Math.round(score)}
      </span>
    </div>
  )
}

function getHealthColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-rose-400'
}

function getHealthLabel(score: number) {
  if (score >= 80) return 'Stable'
  if (score >= 50) return 'Degraded'
  return 'Critical'
}

export function IntelligenceOverview({ data }: { data: SummaryData | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-white/5 animate-pulse border-white/10">
            <CardContent className="p-5 h-24" />
          </Card>
        ))}
      </div>
    )
  }

  const pieData = [
    { name: 'Active Incidents', value: data.active_incidents, color: '#fb7185' },
    { name: 'Healthy', value: Math.max(1, 10 - data.active_incidents), color: '#34d399' },
  ]

  const eventTypeData = [
    { name: 'Events', value: data.recent_events_7d },
    { name: 'Critical', value: data.critical_events_7d },
    { name: 'Deployments', value: data.recent_deployments_7d },
    { name: 'Failed', value: data.failed_deployments_7d },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Row 1: Health gauge + KPI cards */}
      <div className="flex gap-6">
        <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 shrink-0 w-36">
          <CardContent className="p-5 flex flex-col items-center">
            <p className="text-xs text-muted mb-3">Health Score</p>
            <HealthGauge score={data.health_score} />
            <p className={`text-xs mt-2 ${getHealthColor(data.health_score)}`}>
              {getHealthLabel(data.health_score)}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          <Card className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-muted">7 days</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.recent_events_7d}</p>
              <p className="text-xs text-muted">{data.activities_today} today</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${data.active_incidents > 0 ? 'from-rose-500/20 to-pink-500/20 border-rose-500/30' : 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className={`w-4 h-4 ${data.active_incidents > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
              </div>
              <p className="text-2xl font-bold text-white">{data.active_incidents}</p>
              <p className="text-xs text-muted">active incidents</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <GitPullRequest className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{data.recent_deployments_7d}</p>
              <p className="text-xs text-muted">{data.failed_deployments_7d} failed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{data.memory_entries}</p>
              <p className="text-xs text-muted">AI memories</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-sm text-white">Event Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {eventTypeData.map((entry, idx) => (
                    <Cell key={idx} fill={
                      entry.name === 'Critical' ? '#fb7185' :
                      entry.name === 'Failed' ? '#fb7185' :
                      entry.name === 'Events' ? '#818cf8' :
                      entry.name === 'Deployments' ? '#fbbf24' : '#34d399'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-sm text-white">Incident Ratio</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
