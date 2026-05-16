import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SentinelAI - AI Safety Monitoring',
  description: 'Production-grade AI safety monitoring and risk detection for LLM applications',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
