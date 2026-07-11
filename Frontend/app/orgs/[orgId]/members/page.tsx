'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { AppLayoutModern } from '@/components/layout/AppLayoutModern'
import { MotionCard, slideUp } from '@/components/ui/motion'
import { InviteMemberForm } from '@/components/InviteMemberForm'
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
  const params = useParams()!
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [invites, setInvites] = useState<any[]>([])

  const loadMembers = async () => {
    if (!isLoaded) return
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/orgs/${params.orgId}/members`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Org-Id': String(params.orgId),
        },
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
  }

  const loadInvites = async () => {
    if (!isLoaded) return
    try {
      const token = await getToken()
      const res = await fetch(`/api/orgs/${params.orgId}/invites`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        // If unauthorized, show no invites but don't break the page
        console.warn('Failed to load invites', res.status)
        setInvites([])
        return
      }
      const data = await res.json()
      setInvites(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading invites', err)
      setInvites([])
    }
  }

  useEffect(() => {
    loadMembers()
    loadInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, params.orgId])

  if (loading || !members.length) {
    return (
      <AppLayoutModern>
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-muted-foreground">Loading members…</div>
        </div>
      </AppLayoutModern>
    )
  }

  return (
    <AppLayoutModern>
      <div className="space-y-6 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="flex flex-col gap-2"
          >
            <h2 className="text-xl font-bold text-foreground">Organization Members</h2>
            <p className="text-sm text-muted-foreground">Manage team members and their roles</p>
          </motion.div>

          {/* Invite form */}
          <InviteMemberForm orgId={params.orgId} onInviteSent={() => {
            // Reload members list after invite sent
            setLoading(true)
          }} />

          {/* Members list */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="flex flex-col gap-2"
          >
            <h3 className="text-lg font-semibold text-foreground">Active Members</h3>
            {members.length === 0 ? (
              <MotionCard className="p-6 text-center">
                <p className="text-muted-foreground">No members yet</p>
              </MotionCard>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <MotionCard key={m.user_id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{m.name || m.email}</div>
                        <div className="text-sm text-muted-foreground">{m.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {m.role}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Joined {new Date(m.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </MotionCard>
                ))}
              </div>
            )}
          </motion.div>
        </div>
    </AppLayoutModern>
  )
}
