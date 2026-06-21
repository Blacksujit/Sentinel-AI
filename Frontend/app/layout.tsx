import './globals.css'
import { ClerkProviderClient } from './components/clerk-provider-client'
import { Providers } from './providers'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Load Clerk optionally for public/onboarding routes to support onboarding-first flow
  return (
    <ClerkProviderClient optional>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-background text-foreground antialiased">
          <Providers>{children}</Providers>
          <SpeedInsights />
        </body>
      </html>
    </ClerkProviderClient>
  )
}
