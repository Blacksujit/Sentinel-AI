'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { AppLayout } from '../components/layout/AppLayout'
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
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [keys, setKeys] = useState<ApiKeyListItem[]>([])
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')

  const activeCount = useMemo(() => keys.filter((k) => k.active).length, [keys])

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return keys
    return keys.filter((k) => {
      const status = k.active ? 'active' : 'revoked'
      return (
        k.name.toLowerCase().includes(q) ||
        k.prefix.toLowerCase().includes(q) ||
        status.includes(q)
      )
    })
  }, [keys, search])

  const loadKeys = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/api-keys', {
        cache: 'no-store',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
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
      const token = await getToken()
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-2xl border border-border bg-card text-foreground',
          title: 'text-foreground',
          htmlContainer: 'text-foreground/80',
          confirmButton:
            'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground transition-colors hover:opacity-90',
          denyButton:
            'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium bg-muted text-foreground border border-border transition-colors hover:bg-accent',
          actions: 'gap-2',
        },
        showDenyButton: true,
        denyButtonText: 'Copy',
        preDeny: async () => {
          const btn = Swal.getDenyButton()
          try {
            await navigator.clipboard.writeText(data.api_key)
            if (btn) {
              btn.classList.remove('bg-muted', 'hover:bg-accent', 'border-border')
              btn.classList.add('bg-success')
              btn.innerHTML =
                '<span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-flex;">✓</span><span>Copied</span></span>'
              btn.disabled = true
              window.setTimeout(() => {
                btn.disabled = false
                btn.classList.remove('bg-success')
                btn.classList.add('bg-muted', 'hover:bg-accent', 'border-border')
                btn.textContent = 'Copy'
              }, 1400)
            }
            toast.success('API key copied')
          } catch {
            toast.error('Failed to copy')
          }
          return false
        },
        confirmButtonText: 'Done',
        confirmButtonColor: '#A83426',
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
      confirmButtonColor: '#A83426',
    })

    if (!confirm.isConfirmed) return

    setRevokingId(id)
    try {
      const token = await getToken()
      const response = await fetch(`/api/api-keys/${id}/revoke`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
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
    <AppLayout>
      <div className="space-y-6 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col gap-2"
          >
            <motion.h1 variants={slideUp} className="text-2xl font-bold text-foreground">
              API Keys
            </motion.h1>
            <motion.p variants={slideUp} className="text-sm text-muted-foreground">
              Generate and revoke SDK API keys. Keep keys secret and store them in environment variables.
            </motion.p>
          </motion.div>

          <MotionCard variants={slideUp} className="card-premium p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Active keys: {activeCount}</div>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-foreground">Your keys</div>
              <div className="w-full sm:w-72">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search keys (name, prefix, status)…"
                  className="bg-muted text-foreground placeholder:text-foreground/40 border-border focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : keys.length === 0 ? (
                <div className="text-sm text-muted-foreground">No keys created yet.</div>
              ) : filteredKeys.length === 0 ? (
                <div className="text-sm text-muted-foreground">No keys match your search.</div>
              ) : (
                <div className="rounded-xl border border-border bg-card">
                  <div className="max-h-[420px] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur">
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 font-medium text-foreground">Name</th>
                          <th className="px-4 py-3 font-medium text-foreground">Prefix</th>
                          <th className="px-4 py-3 font-medium text-foreground">Status</th>
                          <th className="px-4 py-3 font-medium text-foreground">Last used</th>
                          <th className="px-4 py-3 font-medium text-foreground">Created</th>
                          <th className="px-4 py-3 font-medium text-foreground text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredKeys.map((k) => (
                          <tr key={k.id} className="border-b border-border last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="max-w-[280px] truncate font-semibold text-foreground">
                                {k.name}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{k.prefix}</td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  k.active
                                    ? 'inline-flex items-center rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success'
                                    : 'inline-flex items-center rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive'
                                }
                              >
                                {k.active ? 'Active' : 'Revoked'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {k.created_at ? new Date(k.created_at).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                variant="destructive"
                  onClick={() => revokeKey(k.id)}
                  disabled={!k.active || revokingId === k.id}
                              >
                                {revokingId === k.id ? 'Revoking…' : 'Revoke'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </MotionCard>
        </div>
    </AppLayout>
  )
}
