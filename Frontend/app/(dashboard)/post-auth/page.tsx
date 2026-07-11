'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useOrganizationList } from '@clerk/nextjs'
import { apiGet } from '@/lib/api-client'

type MemberResponse = {
  id: number
  clerk_user_id: string
  email: string
  name?: string | null
  onboarding_completed: boolean
}

export default function PostAuthPage() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { userMemberships, isLoaded: orgListLoaded } = useOrganizationList()

  const membershipList = userMemberships?.data || []

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !orgListLoaded) return
      if (!isSignedIn) {
        router.replace('/auth/sign-in')
        return
      }

      const token = await getToken()
      let me: MemberResponse
      try {
        me = await apiGet('/me', token!)
      } catch {
        router.replace('/user/onboarding')
        return
      }

      if (!me.onboarding_completed) {
        router.replace('/user/onboarding')
        return
      }

      if (membershipList.length > 0) {
        if (membershipList.length === 1) {
          const org = membershipList[0].organization
          localStorage.setItem("activeOrgId", org.id)
          router.replace(`/org/${org.id}/dashboard`)
        } else {
          router.replace('/org-selector')
        }
        return
      }

      router.replace('/org-onboarding')
    }

    run()
  }, [getToken, isLoaded, isSignedIn, orgListLoaded, membershipList, router])

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
      <div className="text-muted-foreground">Preparing your workspace...</div>
    </div>
  )
}
