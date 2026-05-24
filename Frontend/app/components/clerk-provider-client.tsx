'use client'

import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

/** Pin clerk-js version to match Clerk CDN (avoids @5 redirect issues). */
const CLERK_JS_VERSION = '5.125.10'

function ClerkConfigError() {
  return (
    <div className="max-w-md text-center space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Clerk not configured</h1>
      <p className="text-muted text-sm">
        Add your publishable key to <code className="text-xs">Frontend/.env.local</code>:
      </p>
      <pre className="text-left text-xs bg-muted p-3 rounded overflow-x-auto">
        {`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...`}
      </pre>
      <p className="text-muted text-xs">
        Get keys from{' '}
        <a
          href="https://dashboard.clerk.com"
          className="text-primary underline"
          target="_blank"
          rel="noreferrer"
        >
          dashboard.clerk.com
        </a>
        , then restart <code className="text-xs">npm run dev</code>.
      </p>
    </div>
  )
}

export function ClerkProviderClient({
  children,
  optional = false,
}: {
  children: ReactNode
  optional?: boolean
}) {
  if (!publishableKey) {
    if (optional) {
      return <>{children}</>
    }

    return (
      <html lang="en">
        <body className="min-h-screen flex items-center justify-center bg-background p-6">
          <ClerkConfigError />
        </body>
      </html>
    )
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      clerkJSVersion={CLERK_JS_VERSION}
      scriptLoadTimeout={30_000}
      signInUrl="/auth/sign-in"
      signUpUrl="/auth/sign-up"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  )
}
