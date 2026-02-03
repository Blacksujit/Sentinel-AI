'use client'

import * as React from 'react'

import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}

interface LineChartWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  data: ChartData
  height?: number
  title?: string
}

export function LineChartWrapper({ data, height = 300, title, className, ...props }: LineChartWrapperProps) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {title && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
      <Card
        className="p-6"
        style={{ height }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19l6-6 4 4 6-10" />
              </svg>
            </div>
            <div className="text-sm">Line chart will be displayed here</div>
            <div className="mt-1 text-xs text-muted-foreground">Data: {data.labels.length} points</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
