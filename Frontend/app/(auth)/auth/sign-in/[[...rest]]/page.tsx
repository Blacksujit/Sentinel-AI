'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <SignIn
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
        fallbackRedirectUrl="/post-auth"
      />
    </div>
  )
}
