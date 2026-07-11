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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </AppLayout>
  )
}
