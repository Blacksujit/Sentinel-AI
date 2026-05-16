'use client'

import { ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarModern } from './SidebarModern'
import { PageTransition } from '@/components/ui'
import { OrgSwitcher } from '@/components/org/OrgSwitcher'
import { signOut } from '@/actions'
import { LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

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
    { href: '/user/dashboard', label: 'Dashboard' },
    { href: '/user/playground', label: 'Playground' },
    { href: '/logs', label: 'Logs' },
    { href: '/user/profile', label: 'Profile' },
  ]

  const breadcrumbLabel = (() => {
    if (pathname === '/user/dashboard') return 'Dashboard'
    if (pathname === '/user/playground') return 'Playground'
    if (pathname === '/logs') return 'Logs'
    if (pathname?.startsWith('/logs/')) return 'Logs / Detail'
    if (pathname === '/user/profile') return 'Profile'
    return 'Console'
  })()

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter:blur(0.75px)]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <h1 className="text-xl font-bold text-foreground cursor-pointer">SentinelAI</h1>
            </Link>
            <span className="hidden sm:inline text-sm text-muted-foreground">/</span>
            <span className="hidden sm:inline text-sm font-medium text-foreground">{breadcrumbLabel}</span>
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

function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted || !isLoaded) {
    return (
      <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
    )
  }

  // Get user's display name from Clerk data
  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.username 
    ? user.username 
    : user?.primaryEmailAddress?.emailAddress?.split('@')[0] 
    || 'User'
  
  const email = user?.primaryEmailAddress?.emailAddress || ''
  const imageUrl = user?.imageUrl || ''
  
  // Get initials for avatar fallback
  const initials = displayName 
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleProfileClick = () => {
    setIsOpen(false)
    router.push('/user/profile')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition"
      >
        <div className="flex flex-col items-end mr-1">
          <p className="text-sm font-medium text-foreground leading-tight hidden sm:block">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground leading-tight hidden lg:block">
            {email}
          </p>
        </div>
        
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-electric-blue to-electric-violet text-white flex items-center justify-center font-medium text-sm">
            {initials}
          </div>
        )}
        
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-[50]"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute right-0 top-full mt-2 w-64 bg-background border rounded-xl shadow-2xl z-[60] py-2"
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={displayName}
                    className="h-10 w-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-electric-blue to-electric-violet text-white flex items-center justify-center font-medium">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition text-left text-foreground"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Manage Profile
              </button>
            </div>

            <div className="border-t border-border py-1 mt-1">
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition text-left text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
