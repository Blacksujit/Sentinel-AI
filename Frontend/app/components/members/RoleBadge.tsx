'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_COLORS = {
  OWNER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ADMIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DEVELOPER: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  VIEWER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  DEVELOPER: 'Developer',
  VIEWER: 'Viewer',
}

interface RoleBadgeProps {
  role: string
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const normalizedRole = role.toUpperCase() as keyof typeof ROLE_COLORS
  const colorClass = ROLE_COLORS[normalizedRole] || ROLE_COLORS.VIEWER
  const label = ROLE_LABELS[normalizedRole] || role

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {normalizedRole === 'OWNER' && <User className="w-3 h-3" />}
      {label}
    </span>
  )
}
