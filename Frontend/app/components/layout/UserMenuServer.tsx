import { currentUser } from '@clerk/nextjs/server'
import { UserMenuClient } from './UserMenuClient'

export async function UserMenu() {
  const user = await currentUser()
  
  return (
    <UserMenuClient 
      user={{
        fullName: user?.fullName || 'User',
        email: user?.emailAddresses[0]?.emailAddress || '',
        imageUrl: user?.imageUrl || '',
      }}
    />
  )
}
