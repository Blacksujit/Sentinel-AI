'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { INDUSTRIES, COMPANY_SIZES } from '../data/industries'
import type { WizardData } from '../page'

interface Props {
  data: WizardData
  onChange: (update: Partial<WizardData>) => void
  onNext: () => void
}

export function OrgProfileStep({ data, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    if (!data.orgName.trim()) newErrors.orgName = 'Organization name is required'
    if (!data.industry) newErrors.industry = 'Please select your industry'
    if (!data.companySize) newErrors.companySize = 'Please select company size'
    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="card-premium border-border">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Organization Profile</CardTitle>
          <CardDescription>
            Tell us about your organization so we can tailor the experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-foreground">Organization Name</Label>
            <Input
              id="orgName"
              placeholder="Acme Corp"
              value={data.orgName}
              onChange={(e) => onChange({ orgName: e.target.value })}
              className="bg-muted border-border text-foreground"
            />
            {errors.orgName && <p className="text-xs text-red-400">{errors.orgName}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Industry</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  onClick={() => onChange({ industry: ind.value })}
                  className={`p-3 rounded-lg border text-sm transition-all text-left ${
                    data.industry === ind.value
? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
                   }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
            {errors.industry && <p className="text-xs text-red-400">{errors.industry}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Company Size</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COMPANY_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => onChange({ companySize: size.value })}
                  className={`p-3 rounded-lg border text-sm transition-all ${
                    data.companySize === size.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
            {errors.companySize && <p className="text-xs text-red-400">{errors.companySize}</p>}
          </div>

          <div className="flex justify-between pt-4">
            <div />
            <Button onClick={handleNext} className="btn-premium">
              Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
