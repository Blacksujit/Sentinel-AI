import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function AnalyzeRedirect() {
  const { userId } = await auth()
  if (userId) redirect('/user/playground')
  redirect('/auth/sign-in')
}
