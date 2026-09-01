'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CTA {
  label: string
  onClick?: () => void
  icon?: ReactNode
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  cta?: CTA
  className?: string
}

/**
 * Honest empty state — never fabricates data. Used wherever the backend
 * reports nothing so the briefing reads as truthfully "clean" rather than
 * full of zeros or invented rows.
 */
export function EmptyState({ icon, title, description, cta, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--signal-bg)] text-[color:var(--signal)]">
          {icon}
        </div>
      )}
      <h4 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h4>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-medium text-[color:var(--paper)] transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {cta.icon}
          {cta.label}
        </button>
      )}
    </motion.div>
  )
}
