'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Settings,
  Key,
  Users,
  BookOpen,
  Menu,
  X,
  Shield,
  ChevronRight,
  Building2
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

import { OrganizationProvider } from '@/contexts/organization-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  external?: boolean
}

export default function OrgDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const orgId = params?.orgId as string
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems: NavItem[] = [
    { label: 'Overview', href: `/org/${orgId}/dashboard`, icon: LayoutDashboard },
    { label: 'Workspaces', href: `/org/${orgId}/dashboard/workspaces`, icon: Building2 },
    { label: 'API Usage', href: `/org/${orgId}/dashboard/usage`, icon: BarChart3 },
    { label: 'Logs & Activity', href: `/org/${orgId}/dashboard/logs`, icon: FileText },
    { label: 'Baselines', href: `/org/${orgId}/dashboard/baselines`, icon: Shield },
    { label: 'API Keys', href: `/org/${orgId}/dashboard/api-keys`, icon: Key },
    { label: 'Members', href: `/org/${orgId}/dashboard/members`, icon: Users },
    { label: 'Settings', href: `/org/${orgId}/dashboard/settings`, icon: Settings },
    { label: 'Docs', href: `/docs`, icon: BookOpen, external: true },
  ]

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === `/org/${orgId}/dashboard`) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gradient-navy">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-background/80 backdrop-blur border-white/10"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 0 }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 bg-background/95 backdrop-blur-xl border-r border-white/10",
          "overflow-hidden transition-all duration-300 ease-in-out",
          !sidebarOpen && "lg:w-20"
        )}
      >
        <div className="flex flex-col h-full w-[260px]">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link href={`/org/${orgId}/dashboard`} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="font-semibold text-foreground">SentinelAI</div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                      "text-muted hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </a>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-foreground border border-indigo-500/30"
                      : "text-muted hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active && "text-indigo-400")} />
                  <span>{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="active-indicator"
                      className="ml-auto"
                    >
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                    </motion.div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="text-xs text-muted text-center">
              <p>Organization: {orgId}</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarOpen ? "lg:ml-[260px]" : "lg:ml-20"
        )}
      >
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <div className="p-6 lg:p-8">
          <WorkspaceProvider>
            <OrganizationProvider>
              {children}
            </OrganizationProvider>
          </WorkspaceProvider>
        </div>
      </main>
    </div>
  )
}
