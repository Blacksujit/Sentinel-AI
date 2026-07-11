import './globals.css'
import { ClerkProviderClient } from './components/clerk-provider-client'
import { Providers } from './providers'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Load Clerk optionally for public/onboarding routes to support onboarding-first flow
  return (
    <ClerkProviderClient optional>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <body className="min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)] antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProviderClient>
  )
}
