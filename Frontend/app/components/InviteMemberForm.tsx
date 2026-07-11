'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { MotionCard, slideUp } from '@/components/ui/motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteMemberFormProps {
  orgId: string | string[]
  onInviteSent?: () => void
}

export function InviteMemberForm({ orgId, onInviteSent }: InviteMemberFormProps) {
  const { getToken } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('DEVELOPER')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Please enter an email address')
      return
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/orgs/${orgId}/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Org-Id': String(orgId),
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          role: role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.detail || 'Failed to send invite')
        return
      }

      toast.success(`✓ Invite sent to ${email}${!data.email_sent ? ' (email delivery queued)' : ''}`)
      setEmail('')
      setRole('DEVELOPER')
      setShowForm(false)
      onInviteSent?.()
    } catch (error) {
      console.error('Invite error:', error)
      toast.error('Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={slideUp}
      className="mb-6"
    >
      <MotionCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
            <p className="text-sm text-muted-foreground mt-1">Add new members to collaborate in this organization</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "ghost" : "default"}
          >
            {showForm ? 'Cancel' : 'Invite Member'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleInvite} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={loading}
              >
                <option value="VIEWER">Viewer (read-only)</option>
                <option value="DEVELOPER">Developer (can analyze)</option>
                <option value="ADMIN">Admin (manage members)</option>
                <option value="OWNER">Owner (full access)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </MotionCard>
    </motion.div>
  )
}
