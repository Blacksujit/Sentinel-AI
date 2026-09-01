'use client'

import type { ReactNode } from 'react'

interface SectionShellProps {
  id: string
  index?: string
  kicker: string
  title: string
  lede?: string
  action?: ReactNode
  children: ReactNode
}

/**
 * Each chapter of the Threat Briefing — a scroll-anchored section with an
 * editorial kicker, serif headline and a one-line lede so the page reads as
 * a narrative rather than a grid of widgets.
 */
export function SectionShell({
  id,
  index,
  kicker,
  title,
  lede,
  action,
  children,
}: SectionShellProps) {
  return (
    <section id={id} className="scroll-mt-28 pt-14 sm:pt-16 first:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div className="max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--signal)]">
            {index && <span className="text-muted-foreground/70">{index}</span>}
            <span className="h-px w-6 bg-[color:var(--signal)]/40" />
            {kicker}
          </p>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h2>
          {lede && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lede}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}
