'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { PLANS } from '../data/plans'
import type { WizardData } from '../page'

interface Props {
  data: WizardData
  onChange: (update: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

export function PlanSelectionStep({ data, onChange, onNext, onBack }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="card-premium border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">Choose Your Plan</CardTitle>
          <CardDescription>
            Select the plan that best fits your organization's needs. Upgrade anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => {
              const selected = data.selectedPlan === plan.id
              return (
                <button
                  key={plan.id}
                  onClick={() => onChange({ selectedPlan: plan.id })}
                  className={`relative p-6 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? 'border-electric-blue bg-electric-blue/5'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-electric-blue to-electric-violet text-white text-xs font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="mt-2">
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-sm text-muted ml-1">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted mt-2">{plan.description}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {plan.features.map((feat) => (
                      <div key={feat.text} className="flex items-center gap-2">
                        {feat.included ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted shrink-0" />
                        )}
                        <span className={`text-xs ${feat.included ? 'text-white' : 'text-muted'}`}>
                          {feat.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    className={`mt-4 w-full py-2 rounded-lg text-sm font-medium text-center transition-all ${
                      selected
                        ? 'bg-gradient-to-r from-electric-blue to-electric-violet text-white'
                        : 'bg-white/10 text-muted hover:bg-white/20'
                    }`}
                  >
                    {plan.cta}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={onBack} className="text-muted">
              Back
            </Button>
            <Button onClick={onNext} className="btn-premium" disabled={!data.selectedPlan}>
              Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
