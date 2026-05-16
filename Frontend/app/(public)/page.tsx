'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useCursorInteractions } from '@/hooks/useCursorInteractions'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import {
  fadeIn,
  slideUp,
  slideDown,
  scaleIn,
  staggerContainer,
  MotionCard,
  GlassCard,
  AnimatedGradient,
  buttonPress
} from '@/components/ui/motion'
import {
  ArrowRight,
  ChevronDown,
  BarChart3,
  FileText,
  Filter,
  Shield,
  ShieldCheck,
  Waypoints,
  AlertTriangle,
  Activity,
  Zap,
  Lock,
  Eye,
  TrendingUp,
} from 'lucide-react'

export default function LandingPage() {
  const { registerInteractiveElement } = useCursorInteractions()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const headlineRef = useRef<HTMLElement>(null)
  const subtextRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  return (
    <div className="min-h-screen bg-gradient-navy scroll-smooth">
      {/* Premium animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <AnimatedGradient className="absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/6 glass-effect-dark">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-electric-blue to-electric-violet glow-effect">
              <Shield className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">SentinelAI</div>
              <div className="text-xs text-muted">AI Safety Console</div>
            </div>
          </motion.div>

          {/* Desktop Navigation - Public only */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden items-center gap-4 md:flex"
          >
            <Link href="/docs" className="text-sm text-muted hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="/pricing" className="text-sm text-muted hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm" className="text-muted hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/start">
              <Button variant="default" size="sm" className="btn-premium">
                Get Started
              </Button>
            </Link>
          </motion.nav>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="container mx-auto px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Badge variant="outline" className="mb-6 border-electric-blue/30 bg-electric-blue/10 text-electric-blue">
                <Zap className="mr-1 h-3 w-3" />
                Production-Grade AI Safety
              </Badge>
            </motion.div>

            <motion.h1
              ref={headlineRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight"
            >
              AI systems fail silently.
              <br />
              <span className="text-gradient-electric">SentinelAI doesn't.</span>
            </motion.h1>

            <motion.p
              ref={subtextRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10"
            >
              Real-time prompt anomaly detection, risk scoring, and usage monitoring 
              for LLM applications. Protect your AI systems before they go rogue.
            </motion.p>

            <motion.div
              ref={ctaRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/start">
                <Button size="lg" variant="default" className="btn-premium group min-w-[200px]">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/sign-in">
                <Button size="lg" variant="outline" className="btn-premium-outline min-w-[200px]">
                  Sign In
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-8 text-muted text-sm"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                <span>End-to-End Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-400" />
                <span>Real-time Monitoring</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Enterprise-Grade AI Safety
              </h2>
              <p className="text-muted max-w-2xl mx-auto">
                Everything you need to monitor, protect, and audit your AI systems
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: AlertTriangle,
                  title: 'Anomaly Detection',
                  description: 'Detect prompt injection, jailbreak attempts, and unusual patterns in real-time.'
                },
                {
                  icon: BarChart3,
                  title: 'Risk Scoring',
                  description: 'Configurable risk thresholds with automatic escalation and alerting.'
                },
                {
                  icon: Activity,
                  title: 'Usage Analytics',
                  description: 'Comprehensive dashboards for organizations with team-level insights.'
                }
              ].map((feature, i) => (
                <MotionCard
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="card-premium p-6"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-electric-blue/20 to-electric-violet/20 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-electric-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted">{feature.description}</p>
                </MotionCard>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to secure your AI?
              </h2>
              <p className="text-muted mb-8">
                Start for free. Scale as you grow. Enterprise features when you need them.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/start">
                  <Button size="lg" variant="default" className="btn-premium group min-w-[200px]">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-electric-blue" />
            <span className="text-sm font-semibold text-white">SentinelAI</span>
          </div>
          <p className="text-sm text-muted">
            © 2026 SentinelAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
