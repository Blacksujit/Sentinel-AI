"use client"

import { useState } from "react"
import { LogOut, User } from "lucide-react"

interface UserMenuClientProps {
  user: {
    fullName: string
    email: string
    imageUrl: string
  } | null
}

export function UserMenuClient({ user }: UserMenuClientProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = () => {
    // Navigate to sign-out API endpoint
    window.location.href = '/api/sign-out'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition"
      >
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.fullName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-56 bg-background border rounded-lg shadow-xl z-[60] py-2"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium truncate text-foreground">{user?.fullName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition text-left text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
