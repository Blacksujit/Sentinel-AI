import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SentinelAI SDK Documentation',
  description: 'Learn how to integrate SentinelAI into your applications for AI risk monitoring',
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
