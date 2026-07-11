'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/separator'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Play,
  FileText,
  User
} from 'lucide-react'

const navigationItems = [
  { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/playground', label: 'Playground', icon: Play },
  { href: '/logs', label: 'Logs', icon: FileText },
  { href: '/user/profile', label: 'Profile', icon: User },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex flex-col h-full border-r border-[color:var(--line)] bg-[color:var(--paper-raised)] shadow-[inset_-1px_0_0_rgba(26,24,20,0.04)] transition-all duration-200 overflow-hidden",
      isOpen ? "w-64" : "w-0"
    )}>
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] px-3 py-2 shadow-sm">
          <div className="h-8 w-8 rounded-lg bg-[color:var(--red)] text-white flex items-center justify-center font-bold shadow-[0_2px_8px_rgba(168,52,38,0.18)]">
            S
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[color:var(--ink)]">SentinelAI</div>
            <div className="text-xs text-[color:var(--ink-soft)]">Safety Console</div>
          </div>
        </div>
      </div>

      <Separator className="bg-[color:var(--line)]" />

      <nav className="flex-1 p-4" aria-label="Primary navigation">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = item.href === '/user/dashboard'
              ? pathname === item.href
              : pathname && (pathname === item.href || pathname.startsWith(item.href + '/'))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Button
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start relative rounded-lg border",
                    isActive ? "border-[color:var(--red-soft)] bg-[color:var(--red-bg)] text-[color:var(--red)] hover:bg-[color:var(--red-bg)]" : "border-transparent bg-transparent text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-sunken)] hover:text-[color:var(--ink)]",
                    isActive && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-[color:var(--red)]"
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={() => onClose?.()}
                    aria-current={isActive ? 'page' : undefined}
                    className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Icon className={cn(
                      "mr-2 h-4 w-4",
                      isActive ? "text-[color:var(--red)]" : "text-[color:var(--ink-soft)]"
                    )} />
                    {item.label}
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
