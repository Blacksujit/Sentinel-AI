import SettingsPageContent from '@/settings/SettingsPageContent'
import { Info } from 'lucide-react'

export default function OrgSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          These settings are platform-wide and apply to every organization. Per-org
          policy overrides are on the roadmap.
        </p>
      </div>
      <SettingsPageContent />
    </div>
  )
}
