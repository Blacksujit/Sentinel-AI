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
    <div className="min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper-raised)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-soft)] shadow-sm mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--red)]" />
            Choose your path
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[color:var(--ink)] mb-4">
            How do you want to use SentinelAI?
          </h1>
          <p className="text-[color:var(--ink-soft)] max-w-xl mx-auto">
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
                className={`card-premium p-8 cursor-pointer transition-all duration-300 h-full ${
                  intent === 'user' ? 'border-[color:var(--red)] ring-2 ring-[color:var(--red)]/20 shadow-[0_8px_24px_rgba(168,52,38,0.12)]' : ''
                }`}
                onClick={() => setIntent('user')}
              >
                <div className="h-14 w-14 rounded-2xl border border-[color:var(--line)] bg-[color:var(--red-bg)] flex items-center justify-center mb-6 shadow-sm">
                  <User className="h-7 w-7 text-[color:var(--red)]" />
                </div>
                <h2 className="text-xl font-semibold text-[color:var(--ink)] mb-3">
                  Continue as Individual
                </h2>
                <p className="text-sm text-[color:var(--ink-soft)] mb-6">
                  Perfect for solo developers, researchers, and small projects. 
                  Get started with personal AI monitoring.
                </p>
                <div className="flex items-center text-[color:var(--red)] text-sm font-semibold">
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
            <Link href="/setup/organization">
              <Card 
                className={`card-premium p-8 cursor-pointer transition-all duration-300 h-full ${
                  intent === 'org' ? 'border-[color:var(--green)] ring-2 ring-[color:var(--green)]/20 shadow-[0_8px_24px_rgba(46,82,49,0.12)]' : ''
                }`}
                onClick={() => setIntent('org')}
              >
                <div className="h-14 w-14 rounded-2xl border border-[color:var(--line)] bg-[color:var(--green-bg)] flex items-center justify-center mb-6 shadow-sm">
                  <Building2 className="h-7 w-7 text-[color:var(--green)]" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xl font-semibold text-[color:var(--ink)]">
                    Create Organization
                  </h2>
                  <span className="px-2 py-0.5 text-xs bg-[color:var(--green-bg)] text-[color:var(--green)] rounded-full border border-[color:var(--green-soft)]">
                    Popular
                  </span>
                </div>
                <p className="text-sm text-[color:var(--ink-soft)] mb-6">
                  For teams and enterprises. Manage multiple projects, 
                  collaborate with team members, and centralize AI governance.
                </p>
                <div className="flex items-center text-[color:var(--green)] text-sm font-semibold">
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
          className="text-center mt-8 text-[color:var(--ink-soft)] text-sm"
        >
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-[color:var(--red)] font-semibold hover:underline">
            Sign in
          </Link>
        </motion.p>
      </div>
    </div>
  )
}
