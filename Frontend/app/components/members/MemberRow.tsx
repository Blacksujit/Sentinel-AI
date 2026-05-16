'use client'

import { useState } from 'react'
import { Mail, MoreVertical, User, Crown, Shield, Code, Eye } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleBadge } from './RoleBadge'
import { cn } from '@/lib/utils'

interface Member {
  user_id: number
  email: string
  name?: string | null
  role: string
  joined_at: string
}

interface MemberRowProps {
  member: Member
  isCurrentUser: boolean
  canManageRole: boolean
  canRemove: boolean
  maxRoleLevel: number
  onRoleChange: (userId: number, newRole: string) => void
  onRemove: (userId: number) => void
}

const ROLE_OPTIONS = [
  { value: 'VIEWER', label: 'Viewer', icon: Eye, level: 1 },
  { value: 'DEVELOPER', label: 'Developer', icon: Code, level: 2 },
  { value: 'ADMIN', label: 'Admin', icon: Shield, level: 3 },
  { value: 'OWNER', label: 'Owner', icon: Crown, level: 4 },
]

export function MemberRow({
  member,
  isCurrentUser,
  canManageRole,
  canRemove,
  maxRoleLevel,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false)

  const memberRoleLevel = ROLE_OPTIONS.find(r => r.value === member.role.toUpperCase())?.level || 0

  // Can only change to roles at or below current user's level
  // And can't change users with higher roles than current user
  const canChangeThisMember = canManageRole && memberRoleLevel <= maxRoleLevel

  // Can't remove self if owner and sole owner (checked in parent)
  const canRemoveThisMember = canRemove && (memberRoleLevel <= maxRoleLevel) && !isCurrentUser

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
          isCurrentUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
            : "bg-white/10 text-muted"
        )}>
          {isCurrentUser ? <User className="w-5 h-5" /> : getInitials(member.name, member.email)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {member.name || member.email}
            </span>
            {isCurrentUser && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Mail className="w-3 h-3" />
            {member.email}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xs text-muted">
          Joined {new Date(member.joined_at).toLocaleDateString()}
        </div>

        <RoleBadge role={member.role} />

        {(canChangeThisMember || canRemoveThisMember) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted hover:text-foreground"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-white/10">
              {canChangeThisMember && (
                <>
                  <div className="px-2 py-1.5 text-xs text-muted">Change Role</div>
                  {ROLE_OPTIONS.filter(r => r.level <= maxRoleLevel).map((role) => (
                    <DropdownMenuItem
                      key={role.value}
                      onClick={() => onRoleChange(member.user_id, role.value)}
                      disabled={member.role.toUpperCase() === role.value}
                      className={cn(
                        "cursor-pointer",
                        member.role.toUpperCase() === role.value && "bg-white/5"
                      )}
                    >
                      <role.icon className="w-4 h-4 mr-2" />
                      {role.label}
                      {member.role.toUpperCase() === role.value && (
                        <span className="ml-auto text-xs text-muted">Current</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}
              {canRemoveThisMember && (
                <DropdownMenuItem
                  onClick={() => onRemove(member.user_id)}
                  className="text-red-400 focus:text-red-400 cursor-pointer"
                >
                  Remove member
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  )
}
