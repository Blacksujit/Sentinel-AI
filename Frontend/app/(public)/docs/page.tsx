import { redirect } from 'next/navigation'
import { DOCS_URL } from '@/lib/site'

export default function DocsPage() {
  redirect(DOCS_URL)
}