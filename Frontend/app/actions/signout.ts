'use server'

import { redirect } from 'next/navigation'

export async function signOutAction() {
  // Clear any session data
  redirect('/')
}
