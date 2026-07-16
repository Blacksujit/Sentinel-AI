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
      <Card className="card-premium border-border">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Choose Your Plan</CardTitle>
          <CardDescription>
            Select the plan that best fits your organization&apos;s needs. Upgrade anytime.
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
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border bg-card'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="mt-2">
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {plan.features.map((feat) => (
                      <div key={feat.text} className="flex items-center gap-2">
                        {feat.included ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className={`text-xs ${feat.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {feat.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    className={`mt-4 w-full py-2 rounded-lg text-sm font-medium text-center transition-all ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {plan.cta}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
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
