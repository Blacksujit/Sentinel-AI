'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { MotionCard, slideUp } from '@/components/ui/motion'

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
            <p className="text-sm text-muted mt-1">Add new members to collaborate in this organization</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            {showForm ? 'Cancel' : 'Invite Member'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleInvite} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="VIEWER">Viewer (read-only)</option>
                <option value="DEVELOPER">Developer (can analyze)</option>
                <option value="ADMIN">Admin (manage members)</option>
                <option value="OWNER">Owner (full access)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </MotionCard>
    </motion.div>
  )
}
