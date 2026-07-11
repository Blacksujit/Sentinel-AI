'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_COLORS = {
  OWNER: 'bg-primary/20 text-primary border-primary/30',
  ADMIN: 'bg-warning/20 text-warning border-warning/30',
  DEVELOPER: 'bg-success/20 text-success border-success/30',
  VIEWER: 'bg-muted text-muted-foreground border-border/50',
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
