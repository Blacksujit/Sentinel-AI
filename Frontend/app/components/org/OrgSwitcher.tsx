'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button, Input, Label } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Organization {
  id: number
  name: string
  slug: string
  plan_tier: string
}

export function OrgSwitcher() {
  const { getToken, isLoaded } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')

  // Extract orgId from pathname if on org page
  useEffect(() => {
    const match = pathname?.match(/\/org\/(\d+)/)
    if (match) {
      setActiveOrgId(match[1])
    }
  }, [pathname])

  // Load organizations
  useEffect(() => {
    if (!isLoaded) return
    loadOrgs()
  }, [isLoaded])

  const loadOrgs = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/orgs', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error('Failed to load organizations')
      const data = await res.json()
      setOrgs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleOrgChange = (orgId: string) => {
    if (orgId === 'create') {
      setCreateOpen(true)
      return
    }
    setActiveOrgId(orgId)
    router.push(`/org/${orgId}/dashboard`)
  }

  const createOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Organization name is required')
      return
    }
    try {
      const token = await getToken()
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })
      if (!res.ok) {
        const err = await res.text()
        toast.error(`Failed to create org: ${err}`)
        return
      }
      const data = await res.json()
      toast.success('Organization created')
      setNewOrgName('')
      setCreateOpen(false)
      await loadOrgs()
      router.push(`/org/${data.id}/dashboard`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to create organization')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={activeOrgId} onValueChange={handleOrgChange}>
        <SelectTrigger className="w-[200px] bg-black/30 border-white/15">
          <SelectValue placeholder="Select organization..." />
        </SelectTrigger>
        <SelectContent className="bg-[#0b1220] border-white/15">
          {orgs.map((org) => (
            <SelectItem key={org.id} value={String(org.id)} className="text-white">
              {org.name}
            </SelectItem>
          ))}
          <SelectItem value="create" className="text-emerald-400 font-medium">
            + Create new org
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0b1220] border-white/15 text-white">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription className="text-white/60">
              Create a new organization to manage API keys and team members.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="bg-black/30 border-white/15"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createOrg} disabled={!newOrgName.trim()}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
