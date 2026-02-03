'use client'

import { Badge } from '@/components/ui/Badge'

interface FlagTagProps {
  flag: string
  variant?: 'low' | 'medium' | 'high' | 'critical'
  onRemove?: () => void
}

export function FlagTag({ flag, variant = 'medium', onRemove }: FlagTagProps) {
  const badgeVariant =
    variant === 'critical' ? 'destructive' :
    variant === 'high' ? 'default' :
    variant === 'medium' ? 'secondary' :
    'outline'

  return (
    <Badge variant={badgeVariant} className="relative pr-6">
      {flag}
      {onRemove && (
        <button
          onClick={onRemove}
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-base leading-none text-current opacity-80 hover:opacity-100"
          aria-label={`Remove ${flag} flag`}
        >
          ×
        </button>
      )}
    </Badge>
  )
}
