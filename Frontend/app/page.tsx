'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useState, useEffect, useRef } from 'react'
import { useCursorInteractions } from '@/hooks/useCursorInteractions'
import { Menu, X } from 'lucide-react'

// Smooth scroll utility with header offset
const scrollToSection = (sectionId: string, setActiveSectionFn?: (section: string) => void) => {
  const element = document.getElementById(sectionId)
  if (element) {
    const headerHeight = 80 // Height of sticky header
    const elementPosition = element.offsetTop - headerHeight
    
    // Update active section immediately
    if (setActiveSectionFn) {
      setActiveSectionFn(sectionId)
    }
    
    // Smooth scroll
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    })
  }
}
import { 
  fadeIn, 
  slideUp, 
  slideDown, 
  scaleIn, 
  staggerContainer, 
  hoverScaleLift, 
  hoverGlow,
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
import Link from 'next/link'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function LandingPage() {
  const { registerInteractiveElement } = useCursorInteractions()
  const sectionFade = slideUp
  const stagger = staggerContainer
  const heroRef = useRef<HTMLElement>(null)
  const headlineRef = useRef<HTMLElement>(null)
  const subtextRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)
  const glowRef = useRef<HTMLElement>(null)
  const workflowRef = useRef<HTMLElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    // GSAP Hero Animation - Controlled animations only
    if (heroRef.current && headlineRef.current && subtextRef.current && ctaRef.current) {
      // Headline text reveal - controlled, no infinite loops
      const headlineText = "AI systems fail silently."
      gsap.set(headlineRef.current, { opacity: 0 })
      gsap.to(headlineRef.current, {
        opacity: 1,
        duration: 1.5,
        ease: "power2.out",
        delay: 0.5
      })

      // Subtext fade in
      gsap.fromTo(subtextRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, delay: 1.2 }
      )

      // CTA slide up
      gsap.fromTo(ctaRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, delay: 1.8 }
      )
    }

    // GSAP ScrollTrigger for workflow animation - user-triggered
    if (workflowRef.current) {
      const workflowItems = workflowRef.current.querySelectorAll('.workflow-item')
      
      gsap.timeline({
        scrollTrigger: {
          trigger: workflowRef.current,
          start: 'top center',
          end: 'bottom center',
          scrub: 1
        }
      })
      .fromTo(workflowItems, 
        { opacity: 0, y: 50, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.3 }
      )
    }

    // Scroll spy for active section detection
    const handleScroll = () => {
      const sections = [
        { id: 'howitworks', ref: workflowRef },
        { id: 'capabilities', element: document.getElementById('capabilities') },
        { id: 'preview', element: document.getElementById('preview') },
        { id: 'whysentinelai', element: document.getElementById('whysentinelai') }
      ]
      
      const scrollPosition = window.scrollY + 100 // Header offset
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        const element = section.ref || section.element
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
      window.removeEventListener('scroll', handleScroll)
    }
  }, [setActiveSection])

  return (
    <div className="min-h-screen bg-gradient-navy scroll-smooth">
      {/* Premium animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <AnimatedGradient className="absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      
      {/* Design intent: the landing should feel like an engineering console entry point, not a consumer marketing page. */}
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

          {/* Desktop Navigation */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden items-center gap-8 md:flex" 
            aria-label="Landing page"
          >
            {[
              { name: 'How it works', id: 'howitworks' },
              { name: 'Capabilities', id: 'capabilities' },
              { name: 'Product preview', id: 'preview' },
              { name: 'Why SentinelAI', id: 'whysentinelai' }
            ].map((item, index) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id, setActiveSection)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === item.id 
                    ? 'text-white' 
                    : 'text-muted hover:text-white'
                }`}
              >
                {item.name}
              </button>
            ))}
          </motion.nav>

          {/* Desktop CTAs */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden items-center gap-3 md:flex"
          >
            <Button 
              asChild 
              variant="outline" 
              className="border-white/10 bg-black/20 text-muted hover:bg-white/10 hover:text-white glass-effect-dark"
            >
              <Link href="/logs">View risk logs</Link>
            </Button>
            <motion.div {...hoverGlow}>
              <Button 
                asChild 
                className="bg-gradient-to-r from-electric-blue to-electric-violet hover:from-electric-blue/90 hover:to-electric-violet/90 text-white border-0 shadow-glow"
              >
                <Link href="/dashboard">
                  Open console
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="md:hidden"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </motion.div>
        </div>

        {/* Mobile Menu */}
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: mobileMenuOpen ? 'auto' : 0, 
            opacity: mobileMenuOpen ? 1 : 0 
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="md:hidden overflow-hidden border-t border-white/6"
        >
          <div className="container mx-auto px-4 py-4 space-y-4">
            {[
              { name: 'How it works', id: 'howitworks' },
              { name: 'Capabilities', id: 'capabilities' },
              { name: 'Product preview', id: 'preview' },
              { name: 'Why SentinelAI', id: 'whysentinelai' }
            ].map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  scrollToSection(item.id, setActiveSection)
                  setTimeout(() => setMobileMenuOpen(false), 300)
                }}
                className={`block text-sm font-medium transition-colors py-2 text-left w-full ${
                  activeSection === item.id 
                    ? 'text-white' 
                    : 'text-muted hover:text-white'
                }`}
              >
                {item.name}
              </button>
            ))}
            <div className="pt-4 space-y-3 border-t border-white/10">
              <Button 
                asChild 
                variant="outline" 
                className="w-full border-white/10 bg-black/20 text-muted hover:bg-white/10 hover:text-white glass-effect-dark"
              >
                <Link href="/logs" onClick={() => setTimeout(() => setMobileMenuOpen(false), 300)}>View risk logs</Link>
              </Button>
              <motion.div {...hoverGlow}>
                <Button 
                  asChild 
                  className="w-full bg-gradient-to-r from-electric-blue to-electric-violet hover:from-electric-blue/90 hover:to-electric-violet/90 text-white border-0 shadow-glow"
                >
                  <Link href="/dashboard" onClick={() => setTimeout(() => setMobileMenuOpen(false), 300)}>
                    Open console
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative px-4 pb-14 pt-14 sm:pb-20 sm:pt-20 max-w-7xl mx-auto">
        {/* Static background glow - no animation */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(79, 139, 255, 0.1) 0%, transparent 70%)'
          }}
        />
        
        <div className="relative z-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-8 lg:col-span-6"
            >
              <motion.div variants={scaleIn} className="mb-8">
                <Badge className="badge-risk font-mono">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Production Risk Detected
                </Badge>
              </motion.div>
              
              <motion.h1 
                ref={headlineRef}
                variants={slideUp} 
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl leading-tight"
              >
                <span className="text-gradient">AI systems fail</span>{' '}
                <span className="text-gradient-secondary">silently.</span>
              </motion.h1>
              
              <motion.p 
                ref={subtextRef}
                variants={slideUp} 
                className="max-w-lg text-base leading-relaxed text-muted sm:text-lg lg:text-xl leading-7"
              >
                SentinelAI makes AI risk visible, controllable, and explainable before it becomes a production incident.
              </motion.p>
              
              <motion.div 
                ref={ctaRef}
                variants={slideUp} 
                className="flex flex-col gap-4 sm:flex-row sm:items-center"
              >
                <motion.div {...buttonPress}>
                  <Button 
                    size="lg" 
                    className="group relative overflow-hidden bg-gradient-to-r from-electric-blue to-electric-violet hover:from-electric-blue/90 hover:to-electric-violet/90 text-white border-0 px-6 py-3 text-base shadow-glow"
                    asChild
                  >
                    <Link href="/dashboard">
                      <span className="relative z-10 flex items-center">
                        Enter Command Center
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                    </Link>
                  </Button>
                </motion.div>
                
                <motion.div {...buttonPress}>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-white/10 bg-black/20 text-muted hover:bg-white/10 hover:text-white px-6 py-3 text-base"
                    onClick={() => scrollToSection('howitworks', setActiveSection)}
                  >
                    See How It Works
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div variants={stagger} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { icon: Eye, title: 'Real-time Monitoring', desc: 'Continuous AI observation' },
                  { icon: TrendingUp, title: 'Risk Intelligence', desc: 'Smart threat detection' },
                  { icon: ShieldCheck, title: 'Audit Ready', desc: 'Compliance reports' }
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    variants={scaleIn}
                    className="text-center"
                  >
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-electric-blue/20 to-electric-violet/20 border border-electric-blue/30">
                      <item.icon className="h-6 w-6 text-electric-blue" />
                    </div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="text-xs text-muted">{item.desc}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Design intent: show that SentinelAI is a tool, not a brochure. Keep visuals calm and UI-like. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
              className="lg:col-span-6 order-first lg:order-last"
            >
              <GlassCard className="overflow-hidden border-white/10">
                <div className="border-b border-white/10 bg-black/20 px-4 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">Investigation snapshot</div>
                      <div className="text-xs text-muted">One decision, fully traceable.</div>
                    </div>
                    <Badge className="badge-risk font-mono">
                      risk 0.82
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4 p-4 sm:p-5">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-2 sm:p-3">
                      <div className="text-xs text-muted">Decision</div>
                      <div className="mt-1 text-sm font-medium text-risk-high">block</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-2 sm:p-3">
                      <div className="text-xs text-muted">Confidence</div>
                      <div className="mt-1 text-sm font-medium text-white">93%</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-2 sm:p-3">
                      <div className="text-xs text-muted">Signals</div>
                      <div className="mt-1 text-sm font-medium text-white">3</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
                    <div className="text-xs font-medium text-muted">Primary reason</div>
                    <div className="mt-1 text-sm text-white leading-relaxed">
                      Detected high-risk content patterns and policy violations; action taken to prevent unsafe response.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
                      <div className="text-xs font-medium text-muted">Prompt</div>
                      <div className="mt-2 h-2 w-11/12 rounded bg-white/10" />
                      <div className="mt-2 h-2 w-9/12 rounded bg-white/10" />
                      <div className="mt-2 h-2 w-10/12 rounded bg-white/10" />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
                      <div className="text-xs font-medium text-muted">Response</div>
                      <div className="mt-2 h-2 w-10/12 rounded bg-white/10" />
                      <div className="mt-2 h-2 w-8/12 rounded bg-white/10" />
                      <div className="mt-2 h-2 w-11/12 rounded bg-white/10" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      <Separator />

      {/* How it works */}
      <section id="howitworks" ref={workflowRef} className="px-4 py-16 sm:py-20">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={sectionFade}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl leading-tight">
              <span className="text-gradient">How it works</span>
            </h2>
            <p className="mt-6 text-lg text-navy-300 leading-7 max-w-2xl mx-auto">
              Three simple steps to AI safety and observability
            </p>
          </motion.div>

          {/* Visual flow - clean icons with arrows showing progression */}
          <div className="mx-auto mt-16">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.16, delay: 0 }}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-electric-teal to-primary shadow-lg mb-4">
                  <Waypoints className="h-10 w-10 text-white" />
                </div>
                <div className="text-lg font-semibold text-white mb-2">Input</div>
                <div className="text-sm text-navy-300 max-w-xs">AI sends data</div>
              </motion.div>

              {/* Arrow 1->2 */}
              <div className="hidden lg:block">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.16, delay: 0.08 }}
                  className="flex items-center"
                >
                  <ArrowRight className="h-6 w-6 text-primary/40" />
                </motion.div>
              </div>

              {/* Mobile arrow */}
              <div className="lg:hidden">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.16, delay: 0.08 }}
                >
                  <ChevronDown className="h-6 w-6 text-primary/40" />
                </motion.div>
              </div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.16, delay: 0.08 }}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-electric-violet shadow-lg mb-4">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <div className="text-lg font-semibold text-white mb-2">Analysis</div>
                <div className="text-sm text-navy-300 max-w-xs">Risk evaluation</div>
              </motion.div>

              {/* Arrow 2->3 */}
              <div className="hidden lg:block">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.16, delay: 0.16 }}
                  className="flex items-center"
                >
                  <ArrowRight className="h-6 w-6 text-primary/40" />
                </motion.div>
              </div>

              {/* Mobile arrow */}
              <div className="lg:hidden">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.16, delay: 0.16 }}
                >
                  <ChevronDown className="h-6 w-6 text-primary/40" />
                </motion.div>
              </div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.16, delay: 0.16 }}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-electric-violet to-electric-teal shadow-lg mb-4">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <div className="text-lg font-semibold text-white mb-2">Insight</div>
                <div className="text-sm text-navy-300 max-w-xs">Clear results</div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Core capabilities */}
      <section id="capabilities" className="px-4 py-16 sm:py-20">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={sectionFade}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl leading-tight">
              <span className="text-gradient">Core capabilities</span>
            </h2>
            <p className="mt-6 text-lg text-navy-300 leading-7 max-w-2xl mx-auto">
              Built for engineering teams that need clarity, not hype.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
            className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2"
          >
            {[
              {
                icon: ShieldCheck,
                title: 'Risk scoring & decisions',
                description: 'Consistent risk scores with a clear decision output (allow / warn / escalate / block).',
                gradient: 'from-primary to-electric-violet'
              },
              {
                icon: FileText,
                title: 'Investigation-ready logs',
                description: 'Every event is a report: prompt, response, signals, confidence, and rationale.',
                gradient: 'from-electric-teal to-primary'
              },
              {
                icon: Filter,
                title: 'Triage and filtering',
                description: 'Find what matters: by risk, decision, flags, and time.',
                gradient: 'from-electric-violet to-electric-teal'
              },
              {
                icon: TrendingUp,
                title: 'Trends and baselines',
                description: 'Watch risk drift over time and compare against the baseline you define.',
                gradient: 'from-primary to-electric-teal'
              }
            ].map((item, index) => (
              <MotionCard
                key={item.title}
                variants={sectionFade}
                className="group border-navy-700 hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg">
                    <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-white leading-tight">{item.title}</div>
                    <div className="text-sm text-navy-300 leading-6 mt-1">{item.description}</div>
                  </div>
                </div>
              </MotionCard>
            ))}
          </motion.div>
        </div>
      </section>

      <Separator />

      {/* Product preview */}
      <section id="preview" className="px-4 py-16 sm:py-20">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={sectionFade}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <span className="text-gradient">Product preview</span>
            </h2>
            <p className="mt-4 text-lg text-navy-300">
              A safety console built for investigation workflows.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
            className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2"
          >
            {/* Dashboard Preview */}
            <MotionCard variants={sectionFade} className="border-navy-700 overflow-hidden">
              <div className="border-b border-navy-700 bg-navy-800/50 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">Dashboard</div>
                    <div className="text-sm text-navy-400">Answer: "Is my AI system safe right now?"</div>
                  </div>
                  <Badge className="bg-gradient-to-r from-electric-teal to-primary border-0">overview</Badge>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-navy-700 bg-navy-800/30 p-4">
                    <div className="text-xs text-navy-400">Critical alerts</div>
                    <div className="mt-1 text-2xl font-semibold text-risk-high">2</div>
                  </div>
                  <div className="rounded-lg border border-navy-700 bg-navy-800/30 p-4">
                    <div className="text-xs text-navy-400">Avg risk</div>
                    <div className="mt-1 text-2xl font-semibold text-risk-medium">0.46</div>
                  </div>
                </div>
                <div className="h-32 rounded-lg border border-navy-700 bg-navy-800/30 flex items-center justify-center">
                  <div className="text-navy-400 text-sm">Real-time risk chart</div>
                </div>
              </div>
            </MotionCard>

            {/* Risk Logs Preview */}
            <MotionCard variants={sectionFade} className="border-navy-700 overflow-hidden">
              <div className="border-b border-navy-700 bg-navy-800/50 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">Risk Logs</div>
                    <div className="text-sm text-navy-400">Investigation-ready audit trail</div>
                  </div>
                  <Badge className="bg-gradient-to-r from-primary to-electric-violet border-0">logs</Badge>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { risk: 0.82, decision: 'block', time: '2 min ago' },
                  { risk: 0.45, decision: 'warn', time: '5 min ago' },
                  { risk: 0.12, decision: 'allow', time: '8 min ago' }
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-navy-700 bg-navy-800/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        log.decision === 'block' ? 'bg-risk-high' :
                        log.decision === 'warn' ? 'bg-risk-medium' : 'bg-risk-low'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-white">{log.decision}</div>
                        <div className="text-xs text-navy-400">{log.time}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-navy-600 text-navy-300">
                      {log.risk}
                    </Badge>
                  </div>
                ))}
              </div>
            </MotionCard>
          </motion.div>
        </div>
      </section>

      <Separator />

      {/* Why SentinelAI */}
      <section id="whysentinelai" className="px-4 py-16 sm:py-20">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={sectionFade}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl leading-tight">
              <span className="text-gradient">Why SentinelAI</span>
            </h2>
            <p className="mt-6 text-lg text-navy-300 leading-7 max-w-2xl mx-auto">
              Trust comes from clear evidence: what happened, what signals were detected, and why an action was taken.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
            className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3"
          >
            {[
              {
                icon: FileText,
                title: 'Explainability by default',
                description: 'Decisions are paired with signals and plain-language rationale so teams can validate outcomes.',
                gradient: 'from-primary to-electric-violet'
              },
              {
                icon: ShieldCheck,
                title: 'Audit-ready exports',
                description: 'Export individual events as structured JSON for incident reviews and compliance workflows.',
                gradient: 'from-electric-teal to-primary'
              },
              {
                icon: Shield,
                title: 'Production workflow first',
                description: 'Built for triage: filters, investigations, and prioritized lists of what to look at next.',
                gradient: 'from-electric-violet to-electric-teal'
              }
            ].map((item, index) => (
              <MotionCard
                key={item.title}
                variants={sectionFade}
                className="border-navy-700 hover:border-primary/50 transition-all duration-300 p-6"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg flex-shrink-0">
                    <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-white leading-tight">{item.title}</div>
                    <div className="text-sm text-navy-300 leading-6 mt-1">{item.description}</div>
                  </div>
                </div>
              </MotionCard>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 pt-6">
        <div className="container mx-auto">
          <GlassCard className="mx-auto max-w-3xl bg-gradient-to-r from-primary/10 to-primary/5 p-10 text-center border-navy-700">
            {/* Design intent: calm invitation to use product; no forced signup language. */}
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <span className="text-gradient">Explore SentinelAI</span>
            </h2>
            <p className="mt-6 text-lg text-navy-300 leading-7 max-w-2xl mx-auto">
              Open console to review recent risk events, investigate decisions, and export evidence.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <motion.div
                {...buttonPress}
              >
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-primary to-electric-violet hover:from-primary/90 hover:to-electric-violet/90 text-white border-0 px-8 py-4 shadow-lg"
                  asChild
                >
                  <Link href="/dashboard">
                    Open console
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div {...buttonPress}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-navy-600 bg-navy-900/50 text-navy-300 hover:bg-navy-800/50 hover:text-white px-8 py-4 glass-effect-dark"
                  asChild
                >
                  <Link href="/logs">View logs</Link>
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        </div>
      </section>

      <footer className="border-t border-navy-800 bg-navy-950">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-electric-violet">
                <Shield className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">SentinelAI</span>
                <span className="text-xs text-navy-400 ml-1">AI safety console</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {[
                { name: 'How it works', id: 'howitworks' },
                { name: 'Capabilities', id: 'capabilities' },
                { name: 'Why SentinelAI', id: 'whysentinelai' },
                { name: 'Open console', href: '/dashboard' }
              ].map((item) => (
                item.href ? (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-navy-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id!, setActiveSection)}
                    className={`transition-colors ${
                      activeSection === item.id 
                        ? 'text-white' 
                        : 'text-navy-400 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </button>
                )
              ))}
            </div>
          </div>
          <div className="mt-8 border-t border-navy-800 pt-6 text-center">
            <p className="text-xs text-navy-400">&copy; 2024 SentinelAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
