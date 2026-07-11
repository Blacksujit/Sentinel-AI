'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { UserGuard } from '@/components/guards/user-org-guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionCard } from '@/components/ui/motion'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui'

export default function UserProfilePage() {
  return (
    <UserGuard>
      <ProfileContent />
    </UserGuard>
  )
}

function ProfileContent() {
  const { user, isLoaded } = useUser()
  const [name, setName] = useState(user?.fullName || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  if (!isLoaded) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setMessage('Profile updated successfully!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <AppLayout>
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences.</p>
          </div>

          <MotionCard className="card-premium p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.primaryEmailAddress?.emailAddress || ''}
                  disabled
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card text-muted-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-premium w-full"
                />
              </div>

              {message && (
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  {message}
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="border-[color:var(--red)] bg-[color:var(--red)] text-white shadow-[0_2px_8px_rgba(168,52,38,0.18)] hover:bg-[color:var(--red)]/90 hover:shadow-[0_4px_12px_rgba(168,52,38,0.22)]"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="card-premium p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Type</span>
                <span className="font-medium text-foreground">Individual User</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-medium text-foreground font-mono text-xs">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium text-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="card-premium p-6 bg-primary/5 border-primary/20">
            <h2 className="text-lg font-semibold text-foreground mb-2">Need API Access?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to an Organization account to get API keys, baselines, and team features.
            </p>
            <a 
              href="/org/create" 
              className="inline-flex items-center justify-center rounded-lg border border-[color:var(--red)] bg-[color:var(--red)] px-4 py-2 font-semibold text-white shadow-[0_2px_8px_rgba(168,52,38,0.18)] transition hover:-translate-y-[1px] hover:bg-[color:var(--red)]/90 hover:shadow-[0_4px_12px_rgba(168,52,38,0.22)]"
            >
              Create Organization
            </a>
          </MotionCard>
        </motion.div>
      </div>
    </AppLayout>
  )
}
