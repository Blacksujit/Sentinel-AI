'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const intent = searchParams?.get('intent') || 'user'
  const onboardingState = searchParams?.get('onboarding_state')
  const redirectUrl = searchParams?.get('redirect_url')

  // If a redirect_url is provided (e.g. from invite flow), use it as the post-signup destination
  const afterSignUpUrl = redirectUrl || (intent === 'org'
    ? `/org-onboarding${onboardingState ? `?onboarding_state=${onboardingState}` : ''}`
    : '/user/onboarding')

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-card border border-border shadow-2xl',
            headerTitle: 'text-foreground text-2xl font-bold',
            headerSubtitle: 'text-muted-foreground',
            socialButtonsBlockButton: 'bg-card border-border text-foreground hover:bg-muted',
            socialButtonsBlockButtonText: 'text-foreground',
            dividerLine: 'bg-muted',
            dividerText: 'text-muted-foreground',
            formFieldLabel: 'text-foreground',
            formFieldInput: 'bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary',
            formButtonPrimary: 'bg-primary text-primary-foreground hover:opacity-90',
            footerActionText: 'text-muted-foreground',
            footerActionLink: 'text-primary hover:text-primary/80',
          }
        }}
        afterSignUpUrl={afterSignUpUrl}
      />
    </div>
  )
}
