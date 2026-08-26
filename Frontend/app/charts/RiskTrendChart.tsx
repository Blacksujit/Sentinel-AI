'use client'

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export interface RiskTrendPoint {
  date: string
  avg_risk_score: number
  event_count: number
  critical_count: number
}

interface RiskTrendChartProps {
  data: RiskTrendPoint[]
}

function formatDate(iso: string): string {
  // Show MM-DD; tolerate already-short strings from the API.
  if (!iso) return ''
  if (iso.length <= 5) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    avg_risk_score: Number(d.avg_risk_score ?? 0),
    event_count: Number(d.event_count ?? 0),
    critical_count: Number(d.critical_count ?? 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsLineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          stroke="var(--ink-soft)"
        />
        <YAxis
          yAxisId="risk"
          domain={[0, 1]}
          tick={{ fontSize: 12 }}
          stroke="var(--ink-soft)"
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          allowDecimals={false}
          tick={{ fontSize: 12 }}
          stroke="var(--ink-soft)"
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const toNum = (v: unknown): number =>
                typeof v === 'number' ? v : Array.isArray(v) ? Number(v[0] ?? 0) : Number(v ?? 0)
              const risk = payload.find((p) => String(p.dataKey) === 'avg_risk_score')
              const crit = payload.find((p) => String(p.dataKey) === 'critical_count')
              return (
                <div className="bg-[color:var(--paper-raised)] border border-[color:var(--line)] p-2 rounded-lg shadow-sm">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    Avg Risk: {risk ? `${(toNum(risk.value) * 100).toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Critical Events: {crit ? toNum(crit.value) : 0}
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value: string) => (
            <span className="text-muted-foreground">
              {value === 'avg_risk_score'
                ? 'Avg Risk Score'
                : value === 'critical_count'
                  ? 'Critical Events'
                  : value}
            </span>
          )}
        />
        <Line
          yAxisId="risk"
          type="monotone"
          dataKey="avg_risk_score"
          stroke="var(--red)"
          strokeWidth={2}
          dot={false}
          name="avg_risk_score"
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="critical_count"
          stroke="var(--amber)"
          strokeWidth={2}
          dot={false}
          name="critical_count"
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
