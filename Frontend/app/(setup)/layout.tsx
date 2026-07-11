import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'SentinelAI - Organization Setup',
  description: 'Set up your SentinelAI organization',
}

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="container mx-auto px-4 py-6">
        <Link
          href="/start"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to flow selection
        </Link>
      </div>
      <div className="container mx-auto px-4 pb-12">
        {children}
      </div>
    </div>
  )
}
