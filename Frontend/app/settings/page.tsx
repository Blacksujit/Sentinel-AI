"use client"

import { AppLayout } from '../components/layout/AppLayout'
import { UserGuard } from '@/components/guards/user-org-guards'
import SettingsPageContent from './SettingsPageContent'

export default function SettingsPageModern() {
  return (
    <UserGuard>
      <AppLayout>
        <SettingsPageContent />
      </AppLayout>
    </UserGuard>
  )
}
