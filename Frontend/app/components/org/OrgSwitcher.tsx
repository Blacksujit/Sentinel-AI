'use client'

import { OrganizationSwitcher } from '@clerk/nextjs'

export function OrgSwitcher() {
  return (
    <OrganizationSwitcher
      afterCreateOrganizationUrl="/org/:id/dashboard"
      afterSwitchOrganizationUrl="/org/:id/dashboard"
      afterLeaveOrganizationUrl="/"
      appearance={{
        elements: {
          rootBox: 'w-full',
          organizationSwitcherTrigger:
            'w-full justify-between px-3 py-2 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors',
          organizationSwitcherTriggerIcon: 'text-muted-foreground',
          organizationPreview: 'text-foreground',
          organizationPreviewName: 'text-foreground font-medium',
          organizationSwitcherPopoverCard:
            'bg-card border border-border shadow-lg',
          organizationSwitcherPopoverActions:
            'text-foreground',
          organizationList: 'bg-card',
          organizationListItem: 'text-foreground hover:bg-muted',
          createOrganizationButton:
            'text-primary hover:text-primary/80 border-t border-border pt-2 mt-2',
        },
      }}
    />
  )
}
