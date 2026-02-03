'use client'

import { Badge } from '@/components/ui/Badge'

interface RiskScoreBadgeProps {
  score: number
  label?: string
}

export function RiskScoreBadge({ score, label }: RiskScoreBadgeProps) {
  // Determine severity based on score
  const severity = score >= 0.8 ? 'critical' :
                   score >= 0.6 ? 'high' :
                   score >= 0.4 ? 'medium' : 'low'

  const badgeVariant =
    severity === 'critical' ? 'destructive' :
    severity === 'high' ? 'default' :
    severity === 'medium' ? 'secondary' :
    'outline'

  return (
    <div>
      {label && (
        <div style={{ marginBottom: '8px', fontSize: '14px', color: '#4a5568' }}>
          {label}
        </div>
      )}
      <Badge variant={badgeVariant}>
        {score.toFixed(2)}
      </Badge>
    </div>
  )
}
