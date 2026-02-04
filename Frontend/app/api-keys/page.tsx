'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayoutModern } from '../components/layout/AppLayoutModern'
import { Button, Input, Label, Separator } from '@/components/ui'
import { MotionCard, slideUp, staggerContainer, buttonPress } from '@/components/ui/motion'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Swal from 'sweetalert2'

type ApiKeyListItem = {
  id: number
  name: string
  prefix: string
  active: boolean
  created_at?: string
  last_used_at?: string
  revoked_at?: string
}

type ApiKeyCreated = ApiKeyListItem & {
  api_key: string
}

export default function ApiKeysPage() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [keys, setKeys] = useState<ApiKeyListItem[]>([])
  const [name, setName] = useState('')

  const activeCount = useMemo(() => keys.filter((k) => k.active).length, [keys])

  const loadKeys = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/api-keys', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || `HTTP ${response.status}`)
      }
      setKeys(Array.isArray(data) ? (data as ApiKeyListItem[]) : [])
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to load API keys')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const createKey = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the key')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = (await response.json().catch(() => null)) as ApiKeyCreated | any
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || `HTTP ${response.status}`)
      }

      await Swal.fire({
        title: 'API Key Created',
        html: `Copy this key now. You won't be able to see it again.<br/><br/><code style="word-break:break-all;display:block;padding:10px;background:#0b1220;color:#fff;border-radius:8px;">${data.api_key}</code>`,
        icon: 'success',
        confirmButtonText: 'I have copied it',
        confirmButtonColor: '#3085d6',
      })

      setName('')
      toast.success('API key created')
      await loadKeys()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id: number) => {
    const confirm = await Swal.fire({
      title: 'Revoke API Key?',
      text: 'This key will stop working immediately.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Revoke',
      confirmButtonColor: '#d33',
    })

    if (!confirm.isConfirmed) return

    setRevokingId(id)
    try {
      const response = await fetch(`/api/api-keys/${id}/revoke`, { method: 'POST' })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || `HTTP ${response.status}`)
      }
      toast.success('API key revoked')
      await loadKeys()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to revoke API key')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <AppLayoutModern>
      <div className="min-h-screen bg-gradient-navy">
        <div className="relative z-10 space-y-6 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col gap-2"
          >
            <motion.h1 variants={slideUp} className="text-2xl font-bold text-foreground">
              API Keys
            </motion.h1>
            <motion.p variants={slideUp} className="text-sm text-muted">
              Generate and revoke SDK API keys. Keep keys secret and store them in environment variables.
            </motion.p>
          </motion.div>

          <MotionCard variants={slideUp} className="card-premium p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted">Active keys: {activeCount}</div>
                <motion.div {...buttonPress}>
                  <Button variant="outline" onClick={loadKeys} disabled={loading}>
                    Refresh
                  </Button>
                </motion.div>
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="key-name">Key name</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    id="key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. production-chatbot"
                    className="sm:max-w-md"
                  />
                  <motion.div {...buttonPress}>
                    <Button onClick={createKey} disabled={creating || !name.trim()}>
                      {creating ? 'Creating…' : 'Generate key'}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </MotionCard>

          <MotionCard variants={slideUp} className="card-premium p-6">
            <div className="text-sm font-medium text-foreground">Your keys</div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-muted">Loading…</div>
              ) : keys.length === 0 ? (
                <div className="text-sm text-muted">No keys created yet.</div>
              ) : (
                keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{k.name}</div>
                      <div className="text-xs text-muted">Prefix: {k.prefix}</div>
                      <div className="text-xs text-muted">
                        Status: {k.active ? 'Active' : 'Revoked'}
                        {k.last_used_at ? ` • Last used: ${new Date(k.last_used_at).toLocaleString()}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => revokeKey(k.id)}
                        disabled={!k.active || revokingId === k.id}
                      >
                        {revokingId === k.id ? 'Revoking…' : 'Revoke'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MotionCard>
        </div>
      </div>
    </AppLayoutModern>
  )
}
