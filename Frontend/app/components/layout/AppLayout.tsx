'use client'

import { ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { PageTransition } from '@/components/ui'
import { OrgSwitcher } from '@/components/org/OrgSwitcher'
import { UserMenu } from './UserMenu'
import { ShieldCheck } from 'lucide-react'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
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
    { href: '/user/dashboard', label: 'Dashboard' },
    { href: '/user/playground', label: 'Playground' },
    { href: '/logs', label: 'Logs' },
    { href: '/user/review-queue', label: 'Review Queue' },
    { href: '/user/profile', label: 'Profile' },
  ]

  const breadcrumbLabel = (() => {
    if (pathname === '/user/dashboard') return 'Dashboard'
    if (pathname === '/user/playground') return 'Playground'
    if (pathname === '/logs') return 'Logs'
    if (pathname?.startsWith('/logs/')) return 'Logs / Detail'
    if (pathname === '/user/review-queue') return 'Review Queue'
    if (pathname === '/user/profile') return 'Profile'
    return 'Console'
  })()

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter:blur(0.75px)]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper-raised)]/80 px-2.5 py-1.5 shadow-sm transition hover:border-[color:var(--line-strong)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--red-bg)] text-[color:var(--red)] shadow-[0_1px_3px_rgba(26,24,20,0.08)]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h1 className="cursor-pointer text-lg font-semibold tracking-[0.01em] text-[color:var(--ink)]">SentinelAI</h1>
            </Link>
            <span className="hidden sm:inline text-sm text-[color:var(--ink-soft)]">/</span>
            <span className="hidden sm:inline text-sm font-medium text-[color:var(--ink)]">{breadcrumbLabel}</span>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Top navigation">
            {topNavItems.map((item) => {
              const isActive = item.href === '/user/dashboard'
                ? pathname === item.href
                : pathname && (pathname === item.href || pathname.startsWith(item.href + '/'))

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

          <div className="flex items-center gap-4">
            {pathname?.startsWith('/org/') && <OrgSwitcher />}
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && !isDesktop && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          />
        )}

        <aside
          id="app-sidebar"
          className={cn(
            "fixed left-0 top-16 bottom-0 z-40 w-64 transform transition-transform duration-200 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </aside>

        <main className={cn(
          "flex-1 min-h-screen transition-all duration-200 ease-in-out",
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        )}>
          <PageTransition>
            <div className="relative min-h-[calc(100vh-4rem)]">
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
