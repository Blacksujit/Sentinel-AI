'use client'

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'

export function useRequireOrg() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [hasOrg, setHasOrg] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkOrg() {
      if (!isLoaded || !isSignedIn) {
        setIsChecking(false)
        return
      }

      // Don't redirect if already on onboarding or auth pages
      if (pathname?.includes('/org-onboarding') || pathname?.includes('/auth/')) {
        setIsChecking(false)
        return
      }

      try {
        const token = await getToken()
        const res = await fetch('/api/orgs', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (res.ok) {
          const orgs = await res.json()
          if (orgs && orgs.length > 0) {
            setHasOrg(true)
          } else {
            setHasOrg(false)
            // Redirect to onboarding
            router.push('/org-onboarding')
          }
        } else {
          setHasOrg(false)
          router.push('/org-onboarding')
        }
      } catch (error) {
        console.error('Failed to check orgs:', error)
        setHasOrg(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkOrg()
  }, [isLoaded, isSignedIn, pathname, router, getToken])

  return { hasOrg, isChecking }
}
