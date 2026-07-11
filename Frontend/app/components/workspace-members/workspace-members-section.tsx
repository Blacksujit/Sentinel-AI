'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Users, Search, UserPlus, Shield } from 'lucide-react'
import { toast } from 'sonner'
import Swal from 'sweetalert2'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { apiGet, apiPatch, apiDelete } from '@/lib/api-client'
import { RoleBadge } from '@/components/members/RoleBadge'

import { WorkspaceMemberRow, type WorkspaceMember } from './workspace-member-row'
import { WorkspaceInviteDialog } from './workspace-invite-dialog'
import { WorkspacePendingInvites } from './workspace-pending-invites'

interface WorkspacePendingInvite {
  id: number
  email: string
  role: string
  invited_by: string | null
  created_at: string
  expires_at: string
}

interface WorkspaceMembersSectionProps {
  workspaceId: string
  currentUserId: number
  currentUserRole: string
}

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  ADMIN: 3,
  OWNER: 4,
}

export function WorkspaceMembersSection({
  workspaceId,
  currentUserId,
  currentUserRole,
}: WorkspaceMembersSectionProps) {
  const { getToken } = useAuth()

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<WorkspacePendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  const currentUserRoleLevel = ROLE_HIERARCHY[currentUserRole.toUpperCase()] || 1
  const canInvite = currentUserRoleLevel >= ROLE_HIERARCHY.ADMIN
  const canManageRole = currentUserRoleLevel >= ROLE_HIERARCHY.ADMIN
  const canRemove = currentUserRoleLevel >= ROLE_HIERARCHY.ADMIN
  const canCancelInvites = currentUserRoleLevel >= ROLE_HIERARCHY.ADMIN

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken()
      const membersData = await apiGet(
        `/api/workspaces/${workspaceId}/members`,
        token ?? undefined
      )
      setMembers(Array.isArray(membersData) ? membersData : [])

      if (canInvite) {
        try {
          const invitesData = await apiGet(
            `/api/workspaces/${workspaceId}/invites`,
            token ?? undefined
          )
          setInvites(Array.isArray(invitesData) ? invitesData : [])
        } catch {
          setInvites([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspace members:', error)
      toast.error('Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }, [getToken, workspaceId, canInvite])

  useEffect(() => {
    if (workspaceId) fetchData()
  }, [workspaceId, fetchData])

  const handleRoleChange = async (userId: number, newRole: string) => {
    const member = members.find((m) => m.user_id === userId)
    if (!member) return

    const result = await Swal.fire({
      title: 'Change Role?',
      html: `Change <b>${member.name || member.email}</b> from <b>${member.role}</b> to <b>${newRole}</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Change Role',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#A83426',
    })

    if (!result.isConfirmed) return

    try {
      const token = await getToken()
      await apiPatch(
        `/api/workspaces/${workspaceId}/members/${userId}`,
        { role: newRole },
        token ?? undefined
      )
      toast.success(`Role updated to ${newRole}`)
      fetchData()
    } catch (error: any) {
      console.error('Failed to update role:', error)
      toast.error(error.message || 'Failed to update role')
    }
  }

  const handleRemove = async (userId: number) => {
    const member = members.find((m) => m.user_id === userId)
    if (!member) return

    if (member.role.toUpperCase() === 'OWNER') {
      const ownerCount = members.filter(
        (m) => m.role.toUpperCase() === 'OWNER'
      ).length
      if (ownerCount <= 1) {
        toast.error('Cannot remove the last owner')
        return
      }
    }

    const result = await Swal.fire({
      title: 'Remove Member?',
      html: `Remove <b>${member.name || member.email}</b> from this workspace?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
    })

    if (!result.isConfirmed) return

    try {
      const token = await getToken()
      await apiDelete(
        `/api/workspaces/${workspaceId}/members/${userId}`,
        token ?? undefined
      )
      toast.success('Member removed')
      fetchData()
    } catch (error: any) {
      console.error('Failed to remove member:', error)
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase()
    return (
      member.email.toLowerCase().includes(query) ||
      (member.name && member.name.toLowerCase().includes(query)) ||
      member.role.toLowerCase().includes(query)
    )
  })

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const aLevel = ROLE_HIERARCHY[a.role.toUpperCase()] || 0
    const bLevel = ROLE_HIERARCHY[b.role.toUpperCase()] || 0
    if (aLevel !== bLevel) return bLevel - aLevel
    return (a.name || a.email).localeCompare(b.name || b.email)
  })

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            Workspace Members
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage who has access to this workspace
          </p>
        </div>
        {canInvite && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-primary hover:opacity-90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        {Object.entries(ROLE_HIERARCHY)
          .sort(([, a], [, b]) => b - a)
          .map(([role]) => {
            const count = members.filter(
              (m) => m.role.toUpperCase() === role
            ).length
            if (count === 0) return null
            return (
              <div
                key={role}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border"
              >
                <RoleBadge role={role} />
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            )
          })}
      </motion.div>

      {invites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="card-premium border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
                <Shield className="w-5 h-5" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkspacePendingInvites
                workspaceId={workspaceId}
                invites={invites}
                onInviteCancelled={fetchData}
                canCancel={canCancelInvites}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="card-premium border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Team Members
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({members.length})
                </span>
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border focus:border-indigo-500/50"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="text-center py-12">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground">No members match your search</p>
                    <Button variant="ghost" onClick={() => setSearchQuery('')} className="mt-2">
                      Clear search
                    </Button>
                  </>
                ) : (
                  <>
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No members found</p>
                    {canInvite && (
                      <Button
                        variant="outline"
                        onClick={() => setShowInviteDialog(true)}
                        className="mt-4 border-border"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite your first member
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {sortedMembers.map((member) => (
                  <WorkspaceMemberRow
                    key={member.user_id}
                    member={member}
                    isCurrentUser={member.user_id === currentUserId}
                    canManageRole={canManageRole}
                    canRemove={canRemove}
                    maxRoleLevel={currentUserRoleLevel}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <WorkspaceInviteDialog
        workspaceId={workspaceId}
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInviteSent={fetchData}
        maxRole={currentUserRole}
      />
    </div>
  )
}
