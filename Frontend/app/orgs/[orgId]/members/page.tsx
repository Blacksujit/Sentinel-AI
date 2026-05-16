'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { AppLayoutModern } from '@/components/layout/AppLayoutModern'
import { MotionCard, slideUp } from '@/components/ui/motion'
import { motion } from 'framer-motion'

interface Member {
  user_id: number
  email: string
  name: string | null
  role: string
  joined_at: string
}

export default function OrgMembersPage() {
  const { getToken, isLoaded } = useAuth()
  const params = useParams()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`/api/orgs/${params.orgId}/members`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Org-Id': String(params.orgId),
          },
          signal: controller.signal,
        })

        if (!res.ok) throw new Error('Failed to load members')
        const data = await res.json()
        setMembers(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load members')
        setMembers([])
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [isLoaded, params.orgId, getToken])

  if (loading || !members.length) {
    return (
      <AppLayoutModern>
        <div className="min-h-screen bg-gradient-navy flex items-center justify-center">
          <div className="text-sm text-muted">Loading members…</div>
        </div>
      </AppLayoutModern>
    )
  }

  return (
    <AppLayoutModern>
      <div className="min-h-screen bg-gradient-navy">
        <div className="relative z-10 space-y-6 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="flex flex-col gap-2"
          >
            <h2 className="text-xl font-bold text-foreground">Members</h2>
            <div className="space-y-2">
              {members.map((m) => (
                <MotionCard key={m.user_id} className="p-4">
                  <div>
                    <div className="font-semibold text-foreground">{m.name || m.email}</div>
                    <div className="text-sm text-muted">{m.email}</div>
                    <div className="text-xs text-muted">Role: {m.role}</div>
                  </div>
                </MotionCard>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayoutModern>
  )
}
