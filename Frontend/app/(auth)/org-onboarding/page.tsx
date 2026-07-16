"use client"

import { Suspense, useEffect, useState } from 'react'
import { useOrganizationList } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Building2, ArrowRight, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

function OrgOnboardingPageContent() {
  const { createOrganization, isLoaded: orgListLoaded } = useOrganizationList()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null)

  const [onboardingData, setOnboardingData] = useState<Record<string, any> | null>(null)

  // Restore onboarding state from pre-auth setup wizard
  useEffect(() => {
    const onboardingStateEncoded = searchParams?.get('onboarding_state')
    if (onboardingStateEncoded) {
      try {
        const state = JSON.parse(decodeURIComponent(atob(onboardingStateEncoded)))
        setOnboardingData(state)
        if (state.orgName) setOrgName(state.orgName)
      } catch (e) {
        console.debug('Failed to decode onboarding_state:', e)
      }
    }
  }, [searchParams])

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      toast.error('Please enter an organization name')
      return
    }
    if (!validateEmail(companyEmail)) {
      toast.error('Please enter a valid company email')
      return
    }

    setIsSubmitting(true)
    try {
      // Step 1: Create org in Clerk — generates a real clerk_org_id
      const org = await createOrganization!({
        name: orgName.trim(),
      })

      // Step 2: Send onboarding data to backend (company email, industry, etc.)
      // The backend will sync via Clerk webhook, but we also push the extra data here
      try {
        await fetch(`/api/orgs/${org.id}/onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_email: companyEmail,
            onboarding_data: onboardingData || undefined,
          }),
        })
      } catch (err) {
        console.warn('Onboarding data sync failed (will retry via webhook):', err)
      }

      setCreatedOrgId(org.id)
      toast.success('Organization created successfully!')
      setStep(2)
    } catch (error: any) {
      console.error('Failed to create organization:', error)
      toast.error(error.errors?.[0]?.message || 'Failed to create organization. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToDashboard = () => {
    if (createdOrgId) {
      router.push(`/org/${createdOrgId}/dashboard`)
    }
  }

  if (!orgListLoaded) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="container max-w-lg mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Create Your Organization
            </h1>
            <p className="text-sm text-muted-foreground">
              Set up your SentinelAI organization to start monitoring AI risks
            </p>
          </div>

          {/* Step 1: Create Organization */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="card-premium border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Organization Details</CardTitle>
                  <CardDescription>
                    Enter your company information to get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      placeholder="Acme Inc."
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-email">Company Email</Label>
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="security@acme.com"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="bg-background/50 border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for security alerts and organization verification
                    </p>
                  </div>

                  <Button
                    onClick={handleCreateOrg}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Create Organization
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Success */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="card-premium border-border">
                <CardContent className="pt-6 pb-6 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Organization Created!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your organization <strong>{orgName}</strong> is ready to go
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Organization ID</span>
                      <span className="font-mono text-foreground">{createdOrgId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="text-foreground capitalize">Free</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <span className="text-foreground">Admin</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleGoToDashboard}
                    className="w-full"
                  >
                    <span className="flex items-center gap-2">
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function OrgOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-warm flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <OrgOnboardingPageContent />
    </Suspense>
  )
}