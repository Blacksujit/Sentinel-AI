'use client'

import { motion } from 'framer-motion'
import { Mail, Clock, X, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { RoleBadge } from './RoleBadge'
import { apiDelete } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'

interface PendingInvite {
  id: number
  email: string
  role: string
  invited_by: string | null
  created_at: string
  expires_at: string
}

interface PendingInvitesProps {
  orgId: string
  invites: PendingInvite[]
  onInviteCancelled: () => void
  canCancel: boolean
}

export function PendingInvites({
  orgId,
  invites,
  onInviteCancelled,
  canCancel,
}: PendingInvitesProps) {
  const { getToken } = useAuth()

  const handleCancel = async (inviteId: number, email: string) => {
    try {
      const token = await getToken()
      await apiDelete(`/api/orgs/${orgId}/invites/${inviteId}`, token ?? undefined)
      toast.success(`Invitation to ${email} cancelled`)
      onInviteCancelled()
    } catch (error: any) {
      console.error('Failed to cancel invite:', error)
      toast.error(error.message || 'Failed to cancel invitation')
    }
  }

  const formatTimeLeft = (expiresAt: string) => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 0) return `${days}d left`
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `${hours}h left`
  }

  if (invites.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <h3 className="text-sm font-medium text-muted flex items-center gap-2">
        <RotateCcw className="w-4 h-4" />
        Pending Invites ({invites.length})
      </h3>

      <div className="space-y-2">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="font-medium text-sm text-foreground">
                  {invite.email}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>Invited by {invite.invited_by || 'Unknown'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeLeft(invite.expires_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <RoleBadge role={invite.role} />
              
              {canCancel && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted hover:text-red-400"
                  onClick={() => handleCancel(invite.id, invite.email)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
