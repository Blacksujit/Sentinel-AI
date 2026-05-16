'use client'

import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { CursorProvider } from './hooks/useCursorInteractions'
import { toast } from 'sonner'

// Clerk error boundary component
function ClerkErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('cookies() expects to have requestAsyncStorage')) {
        console.error('🔐 Clerk Authentication Error:', event.message)
        setError('Authentication service temporarily unavailable')
        setHasError(true)
        
        // Show user-friendly error
        toast.error('Authentication service temporarily unavailable. Please refresh the page.', {
          duration: 5000,
        })
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="mb-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Authentication Service Issue
          </h2>
          <p className="text-muted mb-4">
            {error || 'The authentication service is temporarily unavailable. This is usually a configuration issue.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                setHasError(false)
                setError(null)
              }}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-muted rounded text-xs text-left">
              <strong>Development Info:</strong><br />
              Check your .env.local file for:<br />
              <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
            </div>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Providers component wraps app with React Query and theme support
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <ClerkErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CursorProvider>
            {children}
          </CursorProvider>
          {process.env.NODE_ENV === 'development' ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkErrorBoundary>
  )
}
