'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { signOut } from '@/actions'
import { LogOut, Settings, ChevronDown } from 'lucide-react'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isLoaded) {
    return (
      <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
    )
  }

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username
    ? user.username
    : user?.primaryEmailAddress?.emailAddress?.split('@')[0]
    || 'User'

  const email = user?.primaryEmailAddress?.emailAddress || ''
  const imageUrl = user?.imageUrl || ''

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
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
            {initials}
          </div>
        )}

        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[50]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-2 w-64 bg-popover border rounded-xl shadow-2xl z-[60] py-2"
          >
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={displayName}
                    className="h-10 w-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              </div>
            </div>

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
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition text-left text-destructive"
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
