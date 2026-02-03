import { AppLayoutModern } from '../components/layout/AppLayoutModern'
import { LogsPageClientModern } from './LogsPageClientModern'
import { headers } from 'next/headers'
export const dynamic = 'force-dynamic'

export default async function LogsPageModern() {
  // Fetch data on the server with error handling
  let logs: any[] = []
  let error: string | null = null
  
  try {
    const h = headers()
    const proto = h.get('x-forwarded-proto') || 'http'
    const host = h.get('x-forwarded-host') || h.get('host')
    const origin = host ? `${proto}://${host}` : 'http://localhost:3000'

    const response = await fetch(`${origin}/api/logs?limit=50`, { cache: 'no-store' })

    if (!response.ok) {
      const msg = await response.text()
      throw new Error(msg || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    logs = Array.isArray(result) ? result : []
  } catch (err) {
    console.error('Error fetching logs on server:', err)
    error = err instanceof Error ? err.message : 'Failed to fetch risk logs'
  }

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

          <LogsPageClientModern initialLogs={logs} initialError={error} />
        </div>
      </div>
    </AppLayoutModern>
  )
}
