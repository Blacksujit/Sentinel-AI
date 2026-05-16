"use client"

import { useState } from "react"
import { LogOut, User } from "lucide-react"

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition"
      >
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-48 bg-background border rounded-lg shadow-xl z-[60] py-1"
        >
          <a
            href="/"
            onClick={() => {
              // Clear any stored data before navigating
              try {
                localStorage.clear()
                sessionStorage.clear()
              } catch {}
            }}
            className="block px-3 py-2 text-sm hover:bg-muted transition text-foreground"
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </span>
          </a>
        </div>
      )}
    </div>
  )
}
