'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function TopNavbarModern() {
  const [notifications, setNotifications] = useState(3)

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-background border-b">
      {/* Logo and Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            S
          </div>
          <span className="text-xl font-bold text-foreground">SentinelAI</span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex items-center space-x-6">
        <Button variant="ghost" className="text-foreground hover:text-foreground/80">
          Dashboard
        </Button>
        <Button variant="ghost" className="text-foreground hover:text-foreground/80">
          Risk Logs
        </Button>
        <Button variant="ghost" className="text-foreground hover:text-foreground/80">
          Baselines
        </Button>
        <Button variant="ghost" className="text-foreground hover:text-foreground/80">
          Settings
        </Button>
      </div>

      {/* Right Side Items */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.41-1.41L10 14.17l-3.59-3.58L1.41 7.59 2 9l5.59 5.59L9 2l6 6.41 10.41 17 17z" />
              </svg>
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs">
                  {notifications}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <div className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="secondary">{notifications}</Badge>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Mark all as read</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
