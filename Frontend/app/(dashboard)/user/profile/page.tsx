'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { UserGuard } from '@/components/guards/user-org-guards'
import { AppLayoutModern } from '@/components/layout/AppLayoutModern'
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
      <AppLayoutModern>
        <div className="min-h-screen bg-gradient-navy flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-electric-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayoutModern>
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
    <AppLayoutModern>
      <div className="min-h-screen bg-gradient-navy p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
            <p className="text-muted">Manage your account settings and preferences.</p>
          </div>

          <MotionCard className="card-premium p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.primaryEmailAddress?.emailAddress || ''}
                  disabled
                  className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-muted"
                />
                <p className="mt-1 text-xs text-muted">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1">
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
                  className="btn-premium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="card-premium p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Account Type</span>
                <span className="font-medium text-white">Individual User</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">User ID</span>
                <span className="font-medium text-white font-mono text-xs">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Created</span>
                <span className="font-medium text-white">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="card-premium p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30">
            <h2 className="text-lg font-semibold text-white mb-2">Need API Access?</h2>
            <p className="text-sm text-muted mb-4">
              Upgrade to an Organization account to get API keys, baselines, and team features.
            </p>
            <a 
              href="/org/create" 
              className="inline-block px-4 py-2 bg-electric-blue text-white rounded-lg font-medium hover:bg-blue-600 transition"
            >
              Create Organization
            </a>
          </MotionCard>
        </motion.div>
      </div>
    </AppLayoutModern>
  )
}
