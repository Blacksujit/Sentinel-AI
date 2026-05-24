'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { apiGet } from '@/lib/api-client'

type Membership = {
  org_id: number
  role: string
  joined_at: string
}

type MeResponse = {
  id: number
  clerk_user_id: string
  email: string
  name?: string | null
  onboarding_completed: boolean
  memberships: Membership[]
}

export default function PostAuthPage() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    const run = async () => {
      if (!isLoaded) return
      if (!isSignedIn) {
        router.replace('/auth/sign-in')
        return
      }

      const token = await getToken()
      let me: MeResponse
      try {
        me = await apiGet('/me', token)
      } catch (err) {
        // If /me fails, user needs onboarding
        router.replace('/user/onboarding')
        return
      }

      if (!me.onboarding_completed) {
        router.replace('/user/onboarding')
        return
      }

      if (me.memberships && me.memberships.length > 0) {
        if (me.memberships.length === 1) {
          // Single org - go directly
          router.replace(`/org/${me.memberships[0].org_id}/dashboard`)
        } else {
          // Multiple orgs - show selector
          router.replace('/org-selector')
        }
        return
      }

      // No org memberships - send user to organization onboarding
      router.replace('/org-onboarding')
    }

    run()
  }, [getToken, isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center">
      <div className="text-muted">Preparing your workspace...</div>
    </div>
  )
}
