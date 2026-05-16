'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { AppLayoutModern } from '../../components/layout/AppLayoutModern'
import { RiskLogDetailClientModern } from './RiskLogDetailClientModern'
import { getRiskLogById, RiskLog } from '@/services/logs'
import { toast } from 'sonner'

export default function LogDetailPage() {
  const params = useParams()
  const logId = params.id as string
  const { getToken } = useAuth()
  
  const [log, setLog] = useState<RiskLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLog() {
      try {
        const token = await getToken()
        const data = await getRiskLogById(logId, token)
        setLog(data)
      } catch (err) {
        toast.error('Failed to fetch log details')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLog()
  }, [logId, getToken])

  if (isLoading) {
    return (
      <AppLayoutModern>
        <div className="min-h-screen bg-gradient-navy p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-1/3"></div>
            <div className="h-32 bg-white/10 rounded"></div>
            <div className="h-32 bg-white/10 rounded"></div>
          </div>
        </div>
      </AppLayoutModern>
    )
  }

  return (
    <AppLayoutModern>
      <div className="min-h-screen bg-gradient-navy">
        {/* Premium animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        
        <div className="relative z-10">
          <RiskLogDetailClientModern log={log || {}} logId={logId} />
        </div>
      </div>
    </AppLayoutModern>
  )
}
