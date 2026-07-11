import type { Metadata } from 'next'
import Nav from '@/components/public/Nav'
import Footer from '@/components/public/Footer'

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
    <div className="app-shell">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
