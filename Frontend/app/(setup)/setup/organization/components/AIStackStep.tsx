'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AI_MODELS, VOLUME_RANGES, USE_CASES } from '../data/models'
import type { WizardData } from '../page'

interface Props {
  data: WizardData
  onChange: (update: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

export function AIStackStep({ data, onChange, onNext, onBack }: Props) {
  const toggleModel = (id: string) => {
    const current = data.aiModels || []
    const updated = current.includes(id)
      ? current.filter((m) => m !== id)
      : [...current, id]
    onChange({ aiModels: updated })
  }

  const toggleUseCase = (id: string) => {
    const current = data.useCases || []
    const updated = current.includes(id)
      ? current.filter((u) => u !== id)
      : [...current, id]
    onChange({ useCases: updated })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="card-premium border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">AI Stack & Use Case</CardTitle>
          <CardDescription>
            Help us understand your AI infrastructure and monitoring needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Which AI models do you use?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left ${
                    (data.aiModels || []).includes(model.id)
                      ? 'border-electric-blue bg-electric-blue/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="font-medium text-white">{model.label}</div>
                  <div className="text-xs text-muted mt-0.5">{model.provider}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Daily API call volume</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VOLUME_RANGES.map((vol) => (
                <button
                  key={vol.value}
                  onClick={() => onChange({ dailyVolume: vol.value })}
                  className={`p-3 rounded-lg border text-sm transition-all ${
                    data.dailyVolume === vol.value
                      ? 'border-electric-blue bg-electric-blue/10 text-white'
                      : 'border-white/10 text-muted hover:border-white/20 hover:text-white'
                  }`}
                >
                  {vol.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Primary use cases</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {USE_CASES.map((uc) => (
                <button
                  key={uc.id}
                  onClick={() => toggleUseCase(uc.id)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left ${
                    (data.useCases || []).includes(uc.id)
                      ? 'border-electric-blue bg-electric-blue/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="font-medium text-white">{uc.label}</div>
                  <div className="text-xs text-muted mt-0.5">{uc.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={onBack} className="text-muted">
              Back
            </Button>
            <Button onClick={onNext} className="btn-premium">
              Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
