'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Building2, ArrowRight, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function OrgSelectorPage() {
  const router = useRouter()
  const {
    userMemberships,
    setActive,
    isLoaded,
    createOrganization,
  } = useOrganizationList()

  const membershipList = userMemberships?.data || []

  useEffect(() => {
    if (!isLoaded) return
    if (membershipList.length === 1) {
      const org = membershipList[0].organization
      setActive!({ organization: org.id })
      localStorage.setItem("activeOrgId", org.id)
      router.replace(`/org/${org.id}/dashboard`)
    }
  }, [isLoaded, membershipList, setActive, router])

  const selectOrg = async (orgId: string) => {
    localStorage.setItem("activeOrgId", orgId)
    await setActive!({ organization: orgId })
    router.push(`/org/${orgId}/dashboard`)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Select an Organization</h1>
          <p className="mt-2 text-muted-foreground">
            You have access to multiple organizations. Choose one to continue.
          </p>
        </div>

        <div className="space-y-4">
          {membershipList.map((m) => (
            <button
              key={m.organization.id}
              type="button"
              onClick={() => selectOrg(m.organization.id)}
              className="w-full bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md hover:border-primary/30 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{m.organization.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Role: {m.role || 'member'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => router.push('/org/create')}
            className="w-full block bg-card/50 rounded-lg border border-border border-dashed p-6 hover:bg-card transition-all text-center"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create New Organization</span>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">Or continue as an individual user</p>
          <a
            href="/user/dashboard"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Go to Personal Dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}
