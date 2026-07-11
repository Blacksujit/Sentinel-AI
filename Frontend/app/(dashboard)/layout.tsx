import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { OrganizationProvider } from '@/contexts/organization-context'
import { ClerkLoaded } from '@clerk/nextjs'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/auth/sign-in')
  }

  return (
    <OrganizationProvider>
      <ClerkLoaded>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </ClerkLoaded>
    </OrganizationProvider>
  )
}
