'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/separator'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard,
  ScanSearch,
  FileText,
  Settings,
  BarChart3,
  KeyRound
} from 'lucide-react'

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analyze', label: 'Analyze', icon: ScanSearch },
  { href: '/logs', label: 'Risk Logs', icon: FileText },
  { href: '/baselines', label: 'Baselines', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/api-keys', label: 'API Keys', icon: KeyRound },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function SidebarModern({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-200 overflow-hidden",
      isOpen ? "w-64" : "w-0"
    )}>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            S
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">SentinelAI</div>
            <div className="text-xs text-muted-foreground">Safety Console</div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <nav className="flex-1 p-4" aria-label="Primary navigation">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            
            return (
              <li key={item.href}>
                <Button
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start relative",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/15",
                    isActive && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
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
                      isActive ? "text-primary" : "text-muted-foreground"
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
