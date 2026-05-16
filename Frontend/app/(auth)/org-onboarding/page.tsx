"use client"

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Building2, ArrowRight, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

export default function OrgOnboardingPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [createdOrg, setCreatedOrg] = useState<any>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/auth/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

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
      const token = await getToken()
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: orgName,
          email: companyEmail,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText)
      }

      const response = await res.json()
      
      setCreatedOrg(response)
      toast.success('Organization created successfully!')
      setStep(2)
    } catch (error) {
      console.error('Failed to create organization:', error)
      toast.error('Failed to create organization. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToDashboard = () => {
    if (createdOrg?.id) {
      router.push(`/org/${createdOrg.id}/dashboard`)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-navy flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-navy">
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
            <p className="text-sm text-muted">
              Set up your SentinelAI organization to start monitoring AI risks
            </p>
          </div>

          {/* Step 1: Create Organization */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="card-premium border-white/10">
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
                      className="bg-background/50 border-white/10"
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
                      className="bg-background/50 border-white/10"
                    />
                    <p className="text-xs text-muted">
                      Used for security alerts and organization verification
                    </p>
                  </div>

                  <Button
                    onClick={handleCreateOrg}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
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
              <Card className="card-premium border-white/10">
                <CardContent className="pt-6 pb-6 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Organization Created!
                    </h3>
                    <p className="text-sm text-muted">
                      Your organization <strong>{orgName}</strong> is ready to go
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Organization ID</span>
                      <span className="font-mono text-foreground">{createdOrg?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Plan</span>
                      <span className="text-foreground capitalize">{createdOrg?.plan_tier || 'Free'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Role</span>
                      <span className="text-foreground">Admin</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleGoToDashboard}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
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
