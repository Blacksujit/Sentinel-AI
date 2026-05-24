'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { INTEGRATIONS, TEAM_SIZE_OPTIONS } from '../data/integrations'
import type { WizardData, IntegrationConfig } from '../page'

interface Props {
  data: WizardData
  onChange: (update: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

export function TeamIntegrationsStep({ data, onChange, onNext, onBack }: Props) {
  const [expanded, setExpanded] = useState<string[]>([])

  const toggleIntegration = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    if (!data.integrations?.[id]) {
      const current = data.integrations || {}
      onChange({
        integrations: {
          ...current,
          [id]: {},
        } as IntegrationConfig,
      })
    }
  }

  const updateIntegrationField = (integrationId: string, fieldKey: string, value: string) => {
    const current = data.integrations || {}
    onChange({
      integrations: {
        ...current,
        [integrationId]: {
          ...(current[integrationId] || {}),
          [fieldKey]: value,
        },
      } as IntegrationConfig,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="card-premium border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">Team & Integrations</CardTitle>
          <CardDescription>
            Configure your team size and connect your favorite tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Team size</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TEAM_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ teamSize: opt.value })}
                  className={`p-3 rounded-lg border text-sm transition-all ${
                    data.teamSize === opt.value
                      ? 'border-electric-blue bg-electric-blue/10 text-white'
                      : 'border-white/10 text-muted hover:border-white/20 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Integrations</h3>
            <p className="text-xs text-muted">
              Connect your tools to receive alerts and create tickets automatically
            </p>
            <div className="space-y-2">
              {INTEGRATIONS.map((integration) => {
                const isExpanded = expanded.includes(integration.id)
                return (
                  <div
                    key={integration.id}
                    className="border border-white/10 rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleIntegration(integration.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{integration.label}</div>
                        <div className="text-xs text-muted mt-0.5">{integration.description}</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                        {integration.fields.map((field) => (
                          <div key={field.key} className="space-y-1.5">
                            <Label className="text-xs text-muted">{field.label}</Label>
                            {field.type === 'select' ? (
                              <div className="flex gap-2">
                                {(field.options || []).map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() =>
                                      updateIntegrationField(integration.id, field.key, opt)
                                    }
                                    className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                                      (data.integrations?.[integration.id]?.[field.key]) === opt
                                        ? 'border-electric-blue bg-electric-blue/10 text-white'
                                        : 'border-white/10 text-muted hover:border-white/20'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <Input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={data.integrations?.[integration.id]?.[field.key] || ''}
                                onChange={(e) =>
                                  updateIntegrationField(integration.id, field.key, e.target.value)
                                }
                                className="bg-black/30 border-white/15 text-white text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
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
