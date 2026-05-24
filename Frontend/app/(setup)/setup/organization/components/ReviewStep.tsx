'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { INDUSTRIES, COMPANY_SIZES } from '../data/industries'
import { AI_MODELS, VOLUME_RANGES, USE_CASES } from '../data/models'
import { COMPLIANCE_FRAMEWORKS, SECURITY_REQUIREMENTS } from '../data/compliance'
import { PLANS } from '../data/plans'
import type { WizardData } from '../page'

interface Props {
  data: WizardData
  onEdit: (step: number) => void
  onComplete: () => void
  onBack: () => void
  isSubmitting: boolean
}

function findLabel<T extends { value: string; label: string }>(list: readonly T[], value: string): string {
  return list.find((item) => item.value === value)?.label || value
}

function findLabelById<T extends { id: string; label: string }>(list: readonly T[], id: string): string {
  return list.find((item) => item.id === id)?.label || id
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <button onClick={onEdit} className="text-electric-blue hover:text-electric-violet transition-colors">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-white">{value || '—'}</span>
    </div>
  )
}

export function ReviewStep({ data, onEdit, onComplete, onBack, isSubmitting }: Props) {
  const planName = PLANS.find((p) => p.id === data.selectedPlan)?.name || data.selectedPlan

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="card-premium border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">Review Your Configuration</CardTitle>
          <CardDescription>
            Please review your selections before creating your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="Organization Profile" onEdit={() => onEdit(1)}>
            <Row label="Organization" value={data.orgName} />
            <Row label="Industry" value={findLabel(INDUSTRIES, data.industry)} />
            <Row label="Company Size" value={findLabel(COMPANY_SIZES, data.companySize)} />
          </Section>

          <Section title="AI Stack & Use Case" onEdit={() => onEdit(2)}>
            <Row
              label="Models"
              value={(data.aiModels || []).map((id) => findLabelById(AI_MODELS, id)).join(', ') || 'None selected'}
            />
            <Row label="Daily Volume" value={findLabel(VOLUME_RANGES, data.dailyVolume)} />
            <Row
              label="Use Cases"
              value={(data.useCases || []).map((id) => findLabelById(USE_CASES, id)).join(', ') || 'None selected'}
            />
          </Section>

          <Section title="Compliance & Security" onEdit={() => onEdit(3)}>
            <Row
              label="Frameworks"
              value={(data.complianceFrameworks || []).map((id) => findLabelById(COMPLIANCE_FRAMEWORKS, id)).join(', ') || 'None'}
            />
            <Row
              label="Security"
              value={(data.securityRequirements || []).map((id) => findLabelById(SECURITY_REQUIREMENTS, id)).join(', ') || 'None'}
            />
            <Row label="Data Retention" value={data.dataRetention === '0' ? 'Indefinite' : `${data.dataRetention} days`} />
          </Section>

          <Section title="Team & Integrations" onEdit={() => onEdit(4)}>
            <Row label="Team Size" value={data.teamSize || '—'} />
            <Row
              label="Integrations"
              value={
                data.integrations && Object.keys(data.integrations).length > 0
                  ? Object.keys(data.integrations).join(', ')
                  : 'None configured'
              }
            />
          </Section>

          <Section title="Plan" onEdit={() => onEdit(5)}>
            <Row label="Selected Plan" value={planName} />
          </Section>

          <div className="bg-gradient-to-r from-electric-blue/10 to-electric-violet/10 rounded-lg p-4 mt-4">
            <p className="text-sm text-white text-center">
              You're all set! Creating your account will save all of the above configuration.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={onBack} className="text-muted" disabled={isSubmitting}>
              Back
            </Button>
            <Button onClick={onComplete} disabled={isSubmitting} className="btn-premium">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
