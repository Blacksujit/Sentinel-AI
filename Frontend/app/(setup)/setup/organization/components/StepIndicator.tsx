'use client'

import { cn } from '@/lib/utils'

const STEPS = [
  { step: 1, label: 'Profile' },
  { step: 2, label: 'AI Stack' },
  { step: 3, label: 'Compliance' },
  { step: 4, label: 'Team' },
  { step: 5, label: 'Plan' },
  { step: 6, label: 'Review' },
]

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full mb-10">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {STEPS.map((s, i) => (
          <div key={s.step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300',
                  s.step === currentStep
                    ? 'border-primary bg-primary/20 text-primary'
                    : s.step < currentStep
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-border text-muted-foreground'
                )}
              >
                {s.step < currentStep ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1.5 transition-colors',
                  s.step <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-12 sm:w-20 h-0.5 mx-2 sm:mx-4 transition-colors duration-300',
                  s.step < currentStep ? 'bg-emerald-500/50' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
