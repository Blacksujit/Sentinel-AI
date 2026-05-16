'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { User, Building2, ArrowRight, Sparkles } from 'lucide-react'

export default function StartPage() {
  const [intent, setIntent] = useState<string | null>(null)

  // Store intent in sessionStorage for post-auth routing
  useEffect(() => {
    if (intent) {
      sessionStorage.setItem('auth_intent', intent)
    }
  }, [intent])

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How do you want to use SentinelAI?
          </h1>
          <p className="text-muted">
            Choose your path. You can always create an organization later.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Individual User Option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link href="/auth/sign-up?intent=user">
              <Card 
                className={`card-premium p-8 cursor-pointer transition-all duration-300 hover:border-electric-blue/50 h-full ${
                  intent === 'user' ? 'border-electric-blue ring-2 ring-electric-blue/20' : ''
                }`}
                onClick={() => setIntent('user')}
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-electric-blue/20 to-electric-violet/20 flex items-center justify-center mb-6">
                  <User className="h-7 w-7 text-electric-blue" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Continue as Individual
                </h2>
                <p className="text-sm text-muted mb-6">
                  Perfect for solo developers, researchers, and small projects. 
                  Get started with personal AI monitoring.
                </p>
                <div className="flex items-center text-electric-blue text-sm font-medium">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Organization Option */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/auth/sign-up?intent=org">
              <Card 
                className={`card-premium p-8 cursor-pointer transition-all duration-300 hover:border-emerald-500/50 h-full ${
                  intent === 'org' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''
                }`}
                onClick={() => setIntent('org')}
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6">
                  <Building2 className="h-7 w-7 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xl font-semibold text-white">
                    Create Organization
                  </h2>
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                    Popular
                  </span>
                </div>
                <p className="text-sm text-muted mb-6">
                  For teams and enterprises. Manage multiple projects, 
                  collaborate with team members, and centralize AI governance.
                </p>
                <div className="flex items-center text-emerald-400 text-sm font-medium">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Sign In Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-8 text-muted text-sm"
        >
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-electric-blue hover:underline">
            Sign in
          </Link>
        </motion.p>
      </div>
    </div>
  )
}
