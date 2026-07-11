'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { COMPLIANCE_FRAMEWORKS, SECURITY_REQUIREMENTS, DATA_RETENTION_OPTIONS } from '../data/compliance'
import type { WizardData } from '../page'

interface Props {
  data: WizardData
  onChange: (update: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

export function ComplianceStep({ data, onChange, onNext, onBack }: Props) {
  const toggleFramework = (id: string) => {
    if (id === 'none') {
      onChange({ complianceFrameworks: ['none'] })
      return
    }
    const current = (data.complianceFrameworks || []).filter((f) => f !== 'none')
    const updated = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id]
    onChange({ complianceFrameworks: updated })
  }

  const toggleSecurity = (id: string) => {
    const current = data.securityRequirements || []
    const updated = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id]
    onChange({ securityRequirements: updated })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="card-premium border-border">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Compliance & Security</CardTitle>
          <CardDescription>
            Configure compliance frameworks and security requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Compliance frameworks required</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMPLIANCE_FRAMEWORKS.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => toggleFramework(fw.id)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left ${
                    (data.complianceFrameworks || []).includes(fw.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="font-medium text-foreground">{fw.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{fw.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Security requirements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SECURITY_REQUIREMENTS.map((sr) => (
                <button
                  key={sr.id}
                  onClick={() => toggleSecurity(sr.id)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left ${
                    (data.securityRequirements || []).includes(sr.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="font-medium text-foreground">{sr.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{sr.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Data retention period</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DATA_RETENTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ dataRetention: opt.value })}
                  className={`p-2 rounded-lg border text-xs transition-all ${
                    data.dataRetention === opt.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
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
