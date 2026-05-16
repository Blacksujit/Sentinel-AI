'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export async function signOutAction() {
  const session = await auth()
  
  if (session.sessionId) {
    // Redirect to Clerk's signout endpoint
    redirect('/sign-out')
  }
  
  redirect('/')
}
