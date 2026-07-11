'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiPost } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'

interface WorkspaceInviteDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onInviteSent: () => void
  maxRole: string
}

const AVAILABLE_ROLES = [
  { value: 'VIEWER', label: 'Viewer', description: 'Can view workspace content' },
  { value: 'DEVELOPER', label: 'Developer', description: 'Can access workspace tools and modify content' },
  { value: 'ADMIN', label: 'Admin', description: 'Can manage workspace members and settings' },
  { value: 'OWNER', label: 'Owner', description: 'Full control over workspace' },
]


export function WorkspaceInviteDialog({
  workspaceId,
  open,
  onOpenChange,
  onInviteSent,
  maxRole,
}: WorkspaceInviteDialogProps) {
  const { getToken } = useAuth()
  const [email, setEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('DEVELOPER')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')

  const maxRoleLevel = ROLE_HIERARCHY[maxRole.toUpperCase()] || 4
  const availableRoles = AVAILABLE_ROLES.filter(
    (role) => ROLE_HIERARCHY[role.value] <= maxRoleLevel
  )

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async () => {
    setEmailError('')
    if (!email.trim()) { setEmailError('Please enter an email address'); return }
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address'); return }
    setIsSubmitting(true)
    try {
      const token = await getToken()
      await apiPost(
        `/api/workspaces/${workspaceId}/members/invite`,
        { email: email.trim(), role: selectedRole },
        token ?? undefined
      )
      toast.success(`Invitation sent to ${email}`)
      setEmail('')
      setSelectedRole('DEVELOPER')
      onInviteSent()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to send invite:', error)
      const message = error.message || 'Failed to send invitation'
      toast.error(message)
      if (message.includes('already') || message.includes('pending')) setEmailError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setEmailError('')
    setSelectedRole('DEVELOPER')
    onOpenChange(false)
  }


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="w-5 h-5 text-primary" />
            Invite Workspace Member
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send an invitation to join this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                className={`pl-10 bg-card border-border focus:border-primary/50 ${emailError ? 'border-destructive/50' : ''}`}
                disabled={isSubmitting}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>
            {emailError &&                     <p className="text-xs text-destructive">{emailError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <div className="grid grid-cols-1 gap-2">
              {availableRoles.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedRole === role.value
                      ? 'bg-primary/10 border-primary/50'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selectedRole === role.value}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{role.label}</div>
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  </div>
                  {selectedRole === role.value && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="border-border hover:bg-card">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !email.trim()}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1" /> Send Invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


const ROLE_HIERARCHY: Record<string, number> = { VIEWER: 1, DEVELOPER: 2, ADMIN: 3, OWNER: 4 }
