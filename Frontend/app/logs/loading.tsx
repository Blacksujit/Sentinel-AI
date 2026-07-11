import { AppLayout } from '../components/layout/AppLayout'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-[520px]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full lg:col-span-2" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </AppLayout>
  )
}
