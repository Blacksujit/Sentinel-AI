'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { AppLayoutModern } from '@/components/layout/AppLayoutModern'
import { Button, Input, Label, Separator } from '@/components/ui'
import { MotionCard, slideUp } from '@/components/ui/motion'
import { motion } from 'framer-motion'

interface ApiKey {
  id: number
  name: string
  prefix: string
  active: boolean
  created_at: string | null
  last_used_at: string | null
  revoked_at: string | null
}

export default function OrgApiKeysPage() {
  const { getToken, isLoaded } = useAuth()
  const params = useParams()!
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`/api/orgs/${params.orgId}/api-keys`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Org-Id': String(params.orgId),
          },
          signal: controller.signal,
        })

        if (!res.ok) throw new Error('Failed to load API keys')
        const data = await res.json()
        setKeys(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load API keys')
        setKeys([])
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [isLoaded, params.orgId, getToken])

  const refreshKeys = async () => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/orgs/${params.orgId}/api-keys`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Org-Id': String(params.orgId),
        },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to refresh')
      const data = await res.json()
      setKeys(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  const createKey = async () => {
    if (!name.trim()) {
      toast.error('Key name is required')
      return
    }
    try {
      const token = await getToken()
      const res = await fetch(`/api/orgs/${params.orgId}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Org-Id': String(params.orgId),
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const err = await res.text()
        toast.error(`Failed to create key: ${err}`)
        return
      }
      await res.json().catch(() => null)
      toast.success('API key created')
      setName('')
      await refreshKeys()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create API key')
    }
  }

  const revokeKey = async (keyId: number) => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/orgs/${params.orgId}/api-keys/${keyId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Org-Id': String(params.orgId),
        },
      })
      if (!res.ok) {
        const err = await res.text()
        toast.error(`Failed to revoke key: ${err}`)
        return
      }
      toast.success('API key revoked')
      await refreshKeys()
    } catch (err) {
      console.error(err)
      toast.error('Failed to revoke API key')
    }
  }

  if (loading) {
    return (
      <AppLayoutModern>
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-muted-foreground">Loading API keys…</div>
        </div>
      </AppLayoutModern>
    )
  }

  return (
    <AppLayoutModern>
      <div className="space-y-6 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="flex flex-col gap-2"
          >
            <h2 className="text-2xl font-bold text-foreground">API Keys</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-72">
                <Label htmlFor="key-name">New key name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. production-key"
                />
                <Button onClick={createKey} disabled={!name.trim()}>
                  Create
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              {keys.map((k) => (
                <MotionCard key={k.id} className="p-4">
                  <div>
                    <div className="font-semibold text-foreground">{k.name}</div>
                    <div className="text-sm text-muted-foreground">Prefix: {k.prefix}</div>
                    <div className="text-xs text-muted-foreground">
                      Status: {k.active ? 'Active' : 'Revoked'}
                      {k.last_used_at ? ` • Last used: ${new Date(k.last_used_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => revokeKey(k.id)}
                      disabled={!k.active}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Revoke
                    </Button>
                  </div>
                </MotionCard>
              ))}
            </div>
          </motion.div>
        </div>
    </AppLayoutModern>
  )
}
