'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const intent = searchParams?.get('intent') || 'user'
  const onboardingState = searchParams?.get('onboarding_state')

  const afterSignUpUrl = intent === 'org'
    ? `/org-onboarding${onboardingState ? `?onboarding_state=${onboardingState}` : ''}`
    : '/user/onboarding'

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center p-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-[#0b1220] border border-white/15 shadow-2xl',
            headerTitle: 'text-white text-2xl font-bold',
            headerSubtitle: 'text-muted',
            socialButtonsBlockButton: 'bg-white/5 border-white/10 text-white hover:bg-white/10',
            socialButtonsBlockButtonText: 'text-white',
            dividerLine: 'bg-white/10',
            dividerText: 'text-muted',
            formFieldLabel: 'text-white',
            formFieldInput: 'bg-black/30 border-white/15 text-white placeholder:text-muted focus:border-electric-blue',
            formButtonPrimary: 'bg-gradient-to-r from-electric-blue to-electric-violet text-white hover:opacity-90',
            footerActionText: 'text-muted',
            footerActionLink: 'text-electric-blue hover:text-electric-violet',
          }
        }}
        afterSignUpUrl={afterSignUpUrl}
      />
    </div>
  )
}
