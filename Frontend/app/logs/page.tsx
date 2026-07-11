'use client'

import { AppLayout } from '../components/layout/AppLayout'
import { LogsPageClientModern } from './LogsPageClientModern'
import { useRiskLogs } from '@/hooks/useRiskLogs'
import { Skeleton } from '@/components/ui'

export default function LogsPageModern() {
  const { data: logs = [], isLoading, isError, error } = useRiskLogs({ limit: 50 })

  const errorMessage = isError ? (error instanceof Error ? error.message : 'Failed to fetch risk logs') : null

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-48 bg-muted" />
            <Skeleton className="h-6 w-96 bg-muted" />
            <div className="mt-8 space-y-4">
              <Skeleton className="h-12 w-full bg-muted" />
              <Skeleton className="h-12 w-full bg-muted" />
              <Skeleton className="h-12 w-full bg-muted" />
            </div>
          </div>
        ) : (
          <LogsPageClientModern initialLogs={logs} initialError={errorMessage} />
        )}
      </div>
    </AppLayout>
  )
}
