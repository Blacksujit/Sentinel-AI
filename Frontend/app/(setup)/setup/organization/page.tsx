'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'
import { encodeOnboardingState } from '@/lib/onboarding-state'
import { StepIndicator } from './components/StepIndicator'
import { OrgProfileStep } from './components/OrgProfileStep'
import { AIStackStep } from './components/AIStackStep'
import { ComplianceStep } from './components/ComplianceStep'
import { TeamIntegrationsStep } from './components/TeamIntegrationsStep'
import { PlanSelectionStep } from './components/PlanSelectionStep'
import { ReviewStep } from './components/ReviewStep'

export interface IntegrationConfig {
  [integrationId: string]: Record<string, string>
}

export interface WizardData {
  orgName: string
  industry: string
  companySize: string
  aiModels: string[]
  dailyVolume: string
  useCases: string[]
  complianceFrameworks: string[]
  securityRequirements: string[]
  dataRetention: string
  teamSize: string
  integrations: IntegrationConfig
  selectedPlan: string
}

const TOTAL_STEPS = 6

const initialData: WizardData = {
  orgName: '',
  industry: '',
  companySize: '',
  aiModels: [],
  dailyVolume: '',
  useCases: [],
  complianceFrameworks: [],
  securityRequirements: [],
  dataRetention: '30',
  teamSize: '',
  integrations: {},
  selectedPlan: '',
}

export default function OrganizationSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback((update: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...update }))
  }, [])

  const handleNext = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  }, [])

  const handleBack = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1))
  }, [])

  const handleEdit = useCallback((targetStep: number) => {
    setStep(targetStep)
  }, [])

  const handleComplete = useCallback(() => {
    setIsSubmitting(true)
    const encoded = encodeOnboardingState(data as unknown as Record<string, unknown>)
    router.push(`/auth/sign-up?intent=org&onboarding_state=${encoded}`)
  }, [data, router])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Set Up Your Organization
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Configure your SentinelAI workspace. Your settings will be saved when you create your account.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <OrgProfileStep data={data} onChange={handleChange} onNext={handleNext} />
          )}
          {step === 2 && (
            <AIStackStep data={data} onChange={handleChange} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 3 && (
            <ComplianceStep data={data} onChange={handleChange} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 4 && (
            <TeamIntegrationsStep data={data} onChange={handleChange} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 5 && (
            <PlanSelectionStep data={data} onChange={handleChange} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 6 && (
            <ReviewStep
              data={data}
              onEdit={handleEdit}
              onComplete={handleComplete}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="text-center mt-8">
        <p className="text-xs text-muted-foreground">
          Already have an account?{' '}
          <a href="/auth/sign-in" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
