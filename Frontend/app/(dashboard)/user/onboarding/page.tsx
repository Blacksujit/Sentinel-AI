'use client'

import { Button, Card, Input, Label } from '@/components/ui'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { apiPost } from '@/lib/api-client'
import { ArrowRight, Briefcase, Code2, GraduationCap, User } from 'lucide-react'

const roles = [
  { id: 'developer', label: 'Developer', icon: Code2, description: 'Building AI applications' },
  { id: 'researcher', label: 'Researcher', icon: GraduationCap, description: 'AI/ML research' },
  { id: 'product', label: 'Product Manager', icon: Briefcase, description: 'Managing AI products' },
  { id: 'other', label: 'Other', icon: User, description: 'Something else' },
]

const useCases = [
  { id: 'safety', label: 'AI Safety Monitoring', description: 'Monitor and detect unsafe AI behavior' },
  { id: 'compliance', label: 'Compliance & Auditing', description: 'Meet regulatory requirements' },
  { id: 'performance', label: 'Performance Monitoring', description: 'Track model performance and drift' },
  { id: 'security', label: 'Security & Threat Detection', description: 'Detect prompt injection and attacks' },
]

export default function UserOnboardingPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    role: '',
    useCase: '',
    experience: 'intermediate',
    company: '',
  })

  const handleComplete = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      console.log('[Onboarding] Starting with token:', token ? 'present' : 'missing')
      
      const result = await apiPost('/user/onboarding', formData, token)
      console.log('[Onboarding] Success:', result)

      toast.success('Welcome to SentinelAI!')
      router.push('/user/dashboard')
    } catch (err: any) {
      console.error('[Onboarding] Error:', err)
      
      // Show detailed error to user
      const errorMsg = err.message || 'Unknown error'
      toast.error(`Onboarding failed: ${errorMsg}`, {
        duration: 5000,
        action: {
          label: 'Skip & Continue',
          onClick: () => {
            console.log('[Onboarding] User skipped backend save')
            toast.info('Continuing without saving profile data')
            router.push('/user/dashboard')
          }
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to SentinelAI</h1>
          <p className="text-muted-foreground">Let's personalize your experience</p>
        </motion.div>

        <Card className="card-premium p-8">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-6">What's your role?</h2>
              <div className="grid grid-cols-2 gap-4">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      setFormData({ ...formData, role: role.id })
                      setStep(2)
                    }}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      formData.role === role.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <role.icon className="h-6 w-6 text-primary mb-3" />
                    <div className="font-medium text-foreground text-sm">{role.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{role.description}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-6">What brings you here?</h2>
              <div className="space-y-3">
                {useCases.map((useCase) => (
                  <button
                    key={useCase.id}
                    onClick={() => {
                      setFormData({ ...formData, useCase: useCase.id })
                      setStep(3)
                    }}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      formData.useCase === useCase.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div className="font-medium text-foreground">{useCase.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{useCase.description}</div>
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="mt-4 text-muted-foreground"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-6">Almost done!</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground">Company/Organization (optional)</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Inc"
                    className="bg-muted border-border text-foreground mt-2"
                  />
                </div>

                <div>
                  <Label className="text-foreground">Experience Level</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {['beginner', 'intermediate', 'expert'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setFormData({ ...formData, experience: level })}
                        className={`p-3 rounded-lg border text-sm capitalize transition-all ${
                          formData.experience === level
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground hover:border-border'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 btn-premium"
                    onClick={handleComplete}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Complete'}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-all ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
