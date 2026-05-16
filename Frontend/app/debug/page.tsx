'use client'

import { useEffect, useState } from 'react'
import { Button, Card } from '@/components/ui'
import { toast } from 'sonner'

export default function DebugPage() {
  const [backendUrl, setBackendUrl] = useState('')
  const [results, setResults] = useState<Record<string, any>>({})

  useEffect(() => {
    setBackendUrl(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000')
  }, [])

  const testEndpoint = async (name: string, url: string, method = 'GET') => {
    try {
      const res = await fetch(url, { method })
      const text = await res.text()
      setResults(prev => ({
        ...prev,
        [name]: { status: res.status, text: text.slice(0, 200) }
      }))
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [name]: { status: 'ERROR', text: err.message }
      }))
    }
  }

  const runAllTests = () => {
    testEndpoint('Health', `${backendUrl}/api/health`)
    testEndpoint('Me (GET)', `${backendUrl}/api/me`)
    testEndpoint('User Onboarding (POST)', `${backendUrl}/api/user/onboarding`, 'POST')
    testEndpoint('Orgs (GET)', `${backendUrl}/api/orgs`)
    testEndpoint('Orgs (POST)', `${backendUrl}/api/orgs`, 'POST')
  }

  return (
    <div className="min-h-screen bg-gradient-navy p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">System Diagnostics</h1>
        
        <Card className="card-premium p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Backend Configuration</h2>
          <p className="text-muted mb-4">Current backend URL: {backendUrl}</p>
          <Button onClick={runAllTests} className="btn-premium">
            Test All Endpoints
          </Button>
        </Card>

        <div className="grid gap-4">
          {Object.entries(results).map(([name, result]) => (
            <Card key={name} className="card-premium p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white">{name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  result.status === 200 || result.status === 401 || result.status === 405
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {result.status}
                </span>
              </div>
              <code className="text-xs text-muted bg-black/50 p-2 rounded block">
                {result.text}
              </code>
            </Card>
          ))}
        </div>

        <Card className="card-premium p-6 mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Expected Status Codes</h2>
          <ul className="text-sm text-muted space-y-2">
            <li>• <span className="text-emerald-400">200</span> - Working correctly</li>
            <li>• <span className="text-emerald-400">401</span> - Working (needs auth token)</li>
            <li>• <span className="text-emerald-400">405</span> - Working (wrong method)</li>
            <li>• <span className="text-rose-400">404</span> - Route not found (ERROR)</li>
            <li>• <span className="text-rose-400">ERROR</span> - Connection failed</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
