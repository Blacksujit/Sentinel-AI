'use client'

import { AppLayoutModern } from '../components/layout/AppLayoutModern'
import { LogsPageClientModern } from './LogsPageClientModern'
import { useRiskLogs } from '@/hooks/useRiskLogs'
import { Skeleton } from '@/components/ui'

export default function LogsPageModern() {
  const { data: logs = [], isLoading, isError, error } = useRiskLogs({ limit: 50 })

  const errorMessage = isError ? (error instanceof Error ? error.message : 'Failed to fetch risk logs') : null

  return (
    <AppLayoutModern>
      <div className="min-h-screen bg-gradient-navy">
        {/* Premium animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        
        <div className="relative z-10 space-y-8 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Risk Logs</h1>
              <p className="text-muted">Monitor and review AI safety decisions and risk assessments</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full bg-white/10" />
              <Skeleton className="h-12 w-full bg-white/10" />
              <Skeleton className="h-12 w-full bg-white/10" />
            </div>
          ) : (
            <LogsPageClientModern initialLogs={logs} initialError={errorMessage} />
          )}
        </div>
      </div>
    </AppLayoutModern>
  )
}
