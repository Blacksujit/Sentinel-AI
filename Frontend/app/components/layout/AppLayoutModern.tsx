'use client'

import { ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarModern } from './SidebarModern'
import { PageTransition } from '@/components/ui'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayoutModern({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => {
      setIsDesktop(mq.matches)
      setSidebarOpen(mq.matches)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const topNavItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/logs', label: 'Risk Logs' },
    { href: '/baselines', label: 'Baselines' },
    { href: '/settings', label: 'Settings' },
  ]

  const breadcrumbLabel = (() => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/logs') return 'Risk Logs'
    if (pathname?.startsWith('/logs/')) return 'Risk Logs / Detail'
    if (pathname === '/baselines') return 'Baselines'
    if (pathname === '/settings') return 'Settings'
    return 'Console'
  })()

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter:blur(0.75px)]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-foreground">SentinelAI</h1>
            <span className="hidden sm:inline text-sm text-muted-foreground">/</span>
            <span className="hidden sm:inline text-sm font-medium text-foreground">{breadcrumbLabel}</span>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Top navigation">
            {topNavItems.map((item) => {
              const isActive = item.href === '/dashboard'
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                  )}
                >
                  <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </nav>

          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Mobile backdrop */}
        {sidebarOpen && !isDesktop && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] lg:hidden"
          />
        )}

        {/* Modern Sidebar */}
        <aside
          id="app-sidebar"
          className={cn(
          "fixed left-0 top-16 bottom-0 z-40 w-64 transform transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarModern isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Main Content Area */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-200 ease-in-out",
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        )}>
          <PageTransition>
            <div className="min-h-[calc(100vh-4rem)] bg-muted/20">
              <div className="container mx-auto p-4 sm:p-6">
                {children}
              </div>
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
