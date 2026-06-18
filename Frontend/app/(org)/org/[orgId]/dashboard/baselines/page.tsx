'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button, Card, Badge, Input, Label, Switch, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { motion } from 'framer-motion'
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react'
import { MotionCard, staggerContainer, slideUp, hoverScaleLift, hoverGlow, buttonPress } from '@/components/ui/motion'
import { useCursorInteractions } from '@/hooks/useCursorInteractions'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'

type Baseline = {
  id: number
  text: string
  active: boolean
}

export default function BaselinesPage() {
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getToken } = useAuth()
  const { registerInteractiveElement } = useCursorInteractions()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formPrompt, setFormPrompt] = useState('')
  const [formActive, setFormActive] = useState(true)

  const isEditing = editingId !== null

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = await getToken()
        const data = await apiGet<Baseline[]>('/api/baselines?include_inactive=true', token ?? undefined)
        setBaselines(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load baselines')
        setBaselines([])
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [getToken])

  const stats = useMemo(() => {
    const activeCount = baselines.filter((b) => b.active).length
    const inactiveCount = baselines.filter((b) => !b.active).length

    return {
      activeCount,
      inactiveCount,
      totalCount: baselines.length,
    }
  }, [baselines])

  const openCreate = () => {
    setEditingId(null)
    setFormPrompt('')
    setFormActive(true)
    setModalOpen(true)
  }

  const openEdit = (id: number) => {
    const row = baselines.find((b) => b.id === id)
    if (!row) return
    setEditingId(id)
    setFormPrompt(row.text)
    setFormActive(row.active)
    setModalOpen(true)
  }

  const saveBaseline = async () => {
    const trimmedPrompt = formPrompt.trim()
    if (trimmedPrompt.length === 0) return

    try {
      const token = await getToken()
      if (editingId === null) {
        const created = await apiPost<Baseline>('/api/baselines', { text: trimmedPrompt }, token ?? undefined)

        if (formActive === false) {
          const updated = await apiPatch<Baseline>(`/api/baselines/${created.id}`, { active: false }, token ?? undefined)
          setBaselines((prev) => [updated, ...prev])
        } else {
          setBaselines((prev) => [created, ...prev])
        }
      } else {
        const updated = await apiPatch<Baseline>(`/api/baselines/${editingId}`, { text: trimmedPrompt, active: formActive }, token ?? undefined)
        setBaselines((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      }

      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save baseline')
    }
  }

  const toggleBaseline = async (id: number, active: boolean) => {
    setError(null)
    setBaselines((prev) => prev.map((b) => (b.id === id ? { ...b, active } : b)))

    try {
      const token = await getToken()
      await apiPatch(`/api/baselines/${id}`, { active }, token ?? undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update baseline')
    }
  }

  const deleteBaseline = async (id: number) => {
    setError(null)
    const prev = baselines
    setBaselines((p) => p.filter((b) => b.id !== id))
    try {
      const token = await getToken()
      await apiDelete(`/api/baselines/${id}`, token ?? undefined)
    } catch (err) {
      setBaselines(prev)
      setError(err instanceof Error ? err.message : 'Failed to delete baseline')
    }
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <motion.div variants={slideUp} className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Risk Baselines</h1>
          <p className="text-muted">Configure the brain of your AI safety system</p>
        </motion.div>

        <motion.div variants={slideUp}>
          <motion.div {...buttonPress}>
            <Button onClick={openCreate} className="btn-premium">
              <Plus className="mr-2 h-4 w-4" />
              Add Baseline
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {error && (
        <MotionCard className="card-premium border-risk/30 bg-risk/10 p-4 text-sm text-risk-high">
          {error}
        </MotionCard>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Active Baselines</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeCount}</p>
            </div>
            <Shield className="h-8 w-8 text-electric-blue" />
          </div>
        </MotionCard>

        <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Baselines</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalCount}</p>
            </div>
            <Shield className="h-8 w-8 text-electric-violet" />
          </div>
        </MotionCard>

        <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Inactive Baselines</p>
              <p className="text-2xl font-bold text-foreground">{stats.inactiveCount}</p>
            </div>
            <Shield className="h-8 w-8 text-warning" />
          </div>
        </MotionCard>

        <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Defaults</p>
              <p className="text-2xl font-bold text-foreground">Ready</p>
            </div>
            <Shield className="h-8 w-8 text-success" />
          </div>
        </MotionCard>
      </motion.div>

      <MotionCard variants={slideUp} className="card-premium p-6" {...hoverGlow}>
        <h2 className="text-xl font-semibold text-foreground mb-4">Baseline Prompts</h2>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-muted">Prompt</TableHead>
              <TableHead className="text-muted">Active</TableHead>
              <TableHead className="text-muted">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted">
                  Loading baselines...
                </TableCell>
              </TableRow>
            ) : baselines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted">
                  No baselines found.
                </TableCell>
              </TableRow>
            ) : (
              baselines.map((baseline, index) => (
                <motion.tr
                  key={baseline.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-black/30 transition-all"
                  {...hoverScaleLift}
                >
                  <TableCell className="font-medium">
                    <div className="max-w-[680px] truncate text-foreground">{baseline.text}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={baseline.active}
                        onCheckedChange={(checked) => toggleBaseline(baseline.id, checked)}
                        aria-label={`Toggle baseline ${baseline.id}`}
                        className="data-[state=checked]:bg-electric-blue"
                      />
                      <Badge className={baseline.active ? 'badge-premium' : 'badge-premium-outline'}>
                        {baseline.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <motion.div {...buttonPress}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(baseline.id)}
                          aria-label="Edit baseline"
                          className="btn-premium-outline"
                          ref={registerInteractiveElement('baseline-edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </motion.div>
                      <motion.div {...buttonPress}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBaseline(baseline.id)}
                          aria-label="Delete baseline"
                          className="btn-premium-outline border-risk/30 hover:border-risk/20 hover:bg-risk/10"
                          ref={registerInteractiveElement('baseline-delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </MotionCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="card-premium border-white/10 bg-black/80">
          <DialogHeader>
            <DialogTitle className="text-foreground">{isEditing ? 'Edit Baseline' : 'Add Baseline'}</DialogTitle>
            <DialogDescription className="text-muted">
              Create or update a baseline prompt used for safety evaluation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-prompt" className="text-foreground">Baseline prompt</Label>
              <Input
                id="baseline-prompt"
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="e.g. Refuse jailbreak attempts"
                className="input-premium"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">Active</div>
                <div className="text-xs text-muted">Enable this baseline</div>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} aria-label="Active" className="data-[state=checked]:bg-electric-blue" />
            </div>
          </div>

          <DialogFooter>
            <motion.div {...buttonPress}>
              <Button variant="outline" onClick={() => setModalOpen(false)} className="btn-premium-outline">
                Cancel
              </Button>
            </motion.div>
            <motion.div {...buttonPress}>
              <Button onClick={saveBaseline} disabled={formPrompt.trim().length === 0} className="btn-premium">
                Save
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
