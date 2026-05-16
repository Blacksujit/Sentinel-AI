'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrgOnboardingCompatibilityPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/org-onboarding')
  }, [router])

  return null
}
