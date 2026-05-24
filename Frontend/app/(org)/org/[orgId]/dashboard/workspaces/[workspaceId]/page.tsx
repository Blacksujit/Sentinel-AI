'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiGet } from '@/lib/api-client'
import { WorkspaceIntelDashboard } from '@/components/workspace-intel/workspace-intel-dashboard'

interface WorkspaceInfo {
  id: number
  name: string
  slug: string
  description: string | null
  is_default: boolean
  member_count: number
  created_at: string
}

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const orgId = params?.orgId as string
  const workspaceId = params?.workspaceId as string

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !workspaceId) return

    const fetchWorkspace = async () => {
      try {
        const token = await getToken()
        const data = await apiGet(`/api/workspaces/${workspaceId}`, token) as WorkspaceInfo
        setWorkspace(data)
      } catch (err) {
        setError('Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspace()
  }, [isLoaded, isSignedIn, workspaceId, getToken])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-muted mx-auto" />
          <p className="text-muted">{error || 'Workspace not found'}</p>
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Back navigation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          onClick={() => router.push(`/org/${orgId}/dashboard/workspaces`)}
          className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspaces
        </button>
      </motion.div>

      <WorkspaceIntelDashboard
        workspaceId={workspaceId}
        workspaceName={workspace.name}
      />
    </div>
  )
}
