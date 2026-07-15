'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { checkBackendHealth, warmupBackend } from '@/lib/backend-warmup'

interface BackendWarmupBannerProps {
  onComplete?: () => void
}

export function BackendWarmupBanner({ onComplete }: BackendWarmupBannerProps) {
  const [status, setStatus] = useState<'checking' | 'warming' | 'ready' | 'error'>('checking')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_BACKEND_WARMUP === 'true') {
      setVisible(false)
      onComplete?.()
      return
    }

    const checkBackend = async () => {
      try {
        const alreadyHealthy = await checkBackendHealth()
        if (alreadyHealthy) {
          setVisible(false)
          onComplete?.()
          return
        }

        setStatus('warming')

        const success = await warmupBackend()

        if (success) {
          setStatus('ready')
          setTimeout(() => {
            setVisible(false)
            onComplete?.()
          }, 2000)
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }

    checkBackend()
  }, [onComplete])

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-[var(--paper-raised)] px-3.5 py-2 shadow-sm">
          {status === 'checking' || status === 'warming' ? (
            <>
              <div className="relative h-2 w-2">
                <div className="absolute inset-0 rounded-full bg-amber animate-ping opacity-40" />
                <div className="absolute inset-0 rounded-full bg-amber" />
              </div>
              <span className="text-xs text-ink-soft">Initializing SentinelAI Engine</span>
            </>
          ) : status === 'ready' ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green" />
              <span className="text-xs text-green">System Ready</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-red" />
              <span className="text-xs text-red">Connection failed — refresh</span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
