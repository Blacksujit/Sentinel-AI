'use client'

import { Skeleton } from './skeleton'

interface HealthGaugeProps {
  score: number
  label: string
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const colorForScore = (score: number) => {
  if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', status: 'Healthy' }
  if (score >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', status: 'Degraded' }
  return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', status: 'Critical' }
}

export function HealthGauge({ score, label, size = 'md', loading }: HealthGaugeProps) {
  const colors = colorForScore(score)

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-20 bg-muted" />
        <Skeleton className="h-8 w-16 bg-muted" />
        <Skeleton className="h-1.5 w-full bg-muted" />
      </div>
    )
  }

  const valueSize = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-3xl'

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`${valueSize} font-bold tabular-nums ${colors.text}`}>
          {Math.round(score)}
        </span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{colors.status}</p>
    </div>
  )
}
