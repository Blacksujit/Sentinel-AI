import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { OrganizationProvider } from '@/contexts/organization-context'

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
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </OrganizationProvider>
  )
}
