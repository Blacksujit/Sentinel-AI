'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { AppLayoutModern } from '@/components/layout/AppLayoutModern'
import { slideUp } from '@/components/ui/motion'
import { motion } from 'framer-motion'

interface Org {
  id: number
  name: string
  slug: string
  owner_user_id: number
  plan_tier: string
  created_at: string
}

export default function OrgPage() {
  const { getToken, isLoaded } = useAuth()
  const params = useParams()
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`/api/orgs/${params.orgId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Org-Id': String(params.orgId),
          },
          signal: controller.signal,
        })

        if (!res.ok) throw new Error('Failed to load org')
        const data = await res.json()
        setOrg(data)
      } catch (err) {
        console.error(err)
        toast.error('Failed to load organization')
        setOrg(null)
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [isLoaded, params.orgId, getToken])

  if (loading || !org) {
    return (
      <AppLayoutModern>
        <div className="min-h-screen bg-gradient-navy flex items-center justify-center">
          <div className="text-sm text-muted">Loading organization…</div>
        </div>
      </AppLayoutModern>
    )
  }

  return (
    <AppLayoutModern>
      <div className="min-h-screen bg-gradient-navy">
        <div className="relative z-10 space-y-6 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="flex flex-col gap-2"
          >
            <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
            <p className="text-sm text-muted">Organization ID: {org.id}</p>
            <p className="text-sm text-muted">Slug: {org.slug}</p>
            <p className="text-sm text-muted">Plan: {org.plan_tier}</p>
          </motion.div>
        </div>
      </div>
    </AppLayoutModern>
  )
}
