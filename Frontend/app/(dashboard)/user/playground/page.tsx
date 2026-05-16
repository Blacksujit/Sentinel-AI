'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { AppLayoutModern } from '@/components/layout/AppLayoutModern'
import { Button, Badge } from '@/components/ui'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import {
  MotionCard,
  staggerContainer,
  slideUp,
  hoverGlow,
  buttonPress,
} from '@/components/ui/motion'
import { UserGuard } from '@/components/guards/user-org-guards'

type AnalyzeResponse = {
  final_risk_score: number
  flags: string[]
  confidence?: number
  decision?: string
  action_taken?: string
  decision_reason?: string
  settings_version?: number
  thresholds_applied?: any
}

export default function UserPlaygroundPage() {
  return (
    <UserGuard>
      <UserPlaygroundContent />
    </UserGuard>
  )
}

function UserPlaygroundContent() {
  const { getToken } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning && analysisStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - analysisStartTime) / 1000))
      }, 100)
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, analysisStartTime])

  const runAnalysis = async () => {
    if (!prompt.trim() || !response.trim()) {
      const missingFields = []
      if (!prompt.trim()) missingFields.push('Prompt')
      if (!response.trim()) missingFields.push('Response')
      
      await Swal.fire({
        title: 'Validation Required',
        text: `Please enter the following required fields before running analysis:\n${missingFields.join('\n• ')}`,
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'swal2-validation-popup'
        },
        timer: 3000,
        showClass: {
          popup: 'animate__fadeIn'
        },
        hideClass: {
          popup: 'animate__fadeOut'
        }
      })
      return
    }

    setIsRunning(true)
    setAnalysisStartTime(Date.now())
    setElapsedTime(0)
    setResult(null)

    try {
      const token = await getToken()
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, response }),
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `HTTP error! status: ${res.status}`)
      }

      const data = (await res.json()) as AnalyzeResponse
      setResult(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze'
      toast.error(msg)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <AppLayoutModern>
      <div className="min-h-screen bg-gradient-navy">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative z-10 space-y-8 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-2"
          >
            <motion.h1 variants={slideUp} className="text-3xl font-bold tracking-tight text-foreground">
              Playground
            </motion.h1>
            <motion.p variants={slideUp} className="text-muted">
              Test prompts and responses against SentinelAI risk analysis - no production data logged.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Prompt</div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="input-premium min-h-[160px] w-full resize-y"
                  placeholder="Paste the user prompt here"
                />
              </div>
            </MotionCard>

            <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Response</div>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="input-premium min-h-[160px] w-full resize-y"
                  placeholder="Paste the model response here"
                />
              </div>
            </MotionCard>
          </motion.div>

          <motion.div variants={slideUp} className="flex items-center justify-end">
            <motion.div {...buttonPress}>
              <Button className="btn-premium" onClick={runAnalysis} disabled={isRunning}>
                {isRunning ? 'Analyzing…' : 'Run analysis'}
              </Button>
            </motion.div>
          </motion.div>

          {isRunning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="fixed top-24 right-6 z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-[200px] sm:min-w-[250px] timer-popup"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-foreground">Analysis in Progress</div>
                <button
                  onClick={() => {
                    Swal.fire({
                      title: 'Cancel Analysis?',
                      text: 'Are you sure you want to cancel the current analysis?',
                      icon: 'question',
                      showCancelButton: true,
                      confirmButtonColor: '#d33',
                      cancelButtonColor: '#3085d6',
                      confirmButtonText: 'Yes, cancel',
                      cancelButtonText: 'Continue'
                    }).then((result) => {
                      if (result.isConfirmed) {
                        setIsRunning(false)
                        setAnalysisStartTime(null)
                        setElapsedTime(0)
                      }
                    })
                  }}
                  className="text-muted hover:text-foreground transition-colors"
                  aria-label="Cancel analysis"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Elapsed Time</span>
                  <span className="text-lg font-mono font-bold text-foreground">{elapsedTime}s</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary origin-left timer-progress"
                    style={{ 
                      width: isRunning ? `${Math.min((elapsedTime % 10) * 10, 100)}%` : '0%',
                      transition: 'width 0.1s ease-out'
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted text-center">
                {isRunning ? 'Processing your analysis...' : 'Analysis complete'}
              </div>
            </motion.div>
          )}

          {result && (
            <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="badge-premium">{(result.final_risk_score ?? 0).toFixed(2)}</Badge>
                    <Badge className="badge-premium">{String(result.decision || 'unknown')}</Badge>
                    {typeof result.settings_version === 'number' && (
                      <Badge className="badge-premium">settings v{result.settings_version}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted">{result.decision_reason || '—'}</div>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(result.flags) ? result.flags : []).length ? (
                      result.flags.map((f, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-white/20 text-muted">
                          {f}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted">No flags</span>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-2">
                  <div className="text-xs font-medium text-muted">Thresholds applied</div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-mono text-foreground/90 whitespace-pre-wrap">
                    {result.thresholds_applied ? JSON.stringify(result.thresholds_applied, null, 2) : '—'}
                  </div>
                </div>
              </div>
            </MotionCard>
          )}
        </div>
      </div>
    </AppLayoutModern>
  )
}
