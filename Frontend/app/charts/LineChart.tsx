// Chart wrapper components (recharts-backed)
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}

function toRows(data: ChartData) {
  return data.labels.map((label, i) => {
    const row: Record<string, string | number> = { label }
    data.datasets.forEach((ds) => {
      row[ds.label] = ds.data[i] ?? 0
    })
    return row
  })
}

function renderValue(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => String(x)).join(', ')
  return v == null ? '' : String(v)
}

export function LineChart({ data, title }: { data: ChartData; title: string }) {
  const rows = toRows(data)
  return (
    <div className="chart-container">
      <h3 className="chart-title text-sm font-medium text-foreground mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RechartsLineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--ink-soft)" />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--ink-soft)" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[color:var(--paper-raised)] border border-[color:var(--line)] p-2 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="text-xs text-muted-foreground">
                        {String(p.dataKey)}: {p.value}
                      </p>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          {data.datasets.map((ds, i) => (
            <Line
              key={ds.label}
              type="monotone"
              dataKey={ds.label}
              stroke={ds.borderColor || 'var(--red)'}
              strokeWidth={2}
              dot={false}
              isAnimationActive={i === 0}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarChart({ data, title }: { data: ChartData; title: string }) {
  const rows = toRows(data)
  return (
    <div className="chart-container">
      <h3 className="chart-title text-sm font-medium text-foreground mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RechartsBarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--ink-soft)" />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--ink-soft)" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[color:var(--paper-raised)] border border-[color:var(--line)] p-2 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="text-xs text-muted-foreground">
                        {String(p.dataKey)}: {p.value}
                      </p>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          {data.datasets.map((ds) => (
            <Bar
              key={ds.label}
              dataKey={ds.label}
              fill={ds.backgroundColor || 'var(--red)'}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
