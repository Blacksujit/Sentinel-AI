'use client'

import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
}

export function KpiCard({ title, value, change, changeType = 'neutral', icon, className, ...props }: KpiCardProps) {
  const hasChange = typeof change === 'number' && Number.isFinite(change)
  const changeSymbol = hasChange && change > 0 ? '↑' : hasChange && change < 0 ? '↓' : ''

  const changeBadgeVariant =
    changeType === 'neutral' ? 'outline' : changeType === 'decrease' ? 'destructive' : 'secondary'

  const changeTextClassName =
    changeType === 'increase'
      ? 'text-emerald-600 dark:text-emerald-400'
      : changeType === 'decrease'
        ? 'text-destructive'
        : 'text-muted-foreground'

  return (
    <Card
      {...props}
      className={cn('p-6', className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-muted-foreground">{title}</div>
            {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
            {hasChange && (
              <Badge
                variant={changeBadgeVariant}
                className={cn('font-mono text-xs', changeTextClassName)}
                aria-label={`Change ${changeSymbol}${Math.abs(change).toFixed(0)} percent`}
              >
                {changeSymbol}
                {Math.abs(change).toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
