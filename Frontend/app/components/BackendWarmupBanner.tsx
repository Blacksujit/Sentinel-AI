 'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { checkBackendHealth, warmupBackend } from '@/lib/backend-warmup'

interface BackendWarmupBannerProps {
  onComplete?: () => void
}

export function BackendWarmupBanner({ onComplete }: BackendWarmupBannerProps) {
  const [status, setStatus] = useState<'checking' | 'warming' | 'ready' | 'error'>('checking')
  const [message, setMessage] = useState('Checking backend status...')
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
        setMessage('Warming up backend... First load may take ~20 seconds')

        const success = await warmupBackend((status) => {
          setMessage(status)
        })

        if (success) {
          setStatus('ready')
          setMessage('Backend ready! Loading your data...')
          setTimeout(() => {
            setVisible(false)
            onComplete?.()
          }, 1500)
        } else {
          setStatus('error')
          setMessage('Backend is starting up. Please refresh in a moment.')
        }
      } catch (error) {
        setStatus('error')
        setMessage('Unable to connect to backend. Please try refreshing.')
      }
    }

    checkBackend()
  }, [onComplete])

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-3">
            {status === 'warming' && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {status === 'ready' && (
              <svg className="h-4 w-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="h-4 w-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
