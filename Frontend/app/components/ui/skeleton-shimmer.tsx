'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface SkeletonShimmerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function SkeletonShimmer({
  className,
  variant = 'default',
  width,
  height,
  lines = 1,
  ...props
}: SkeletonShimmerProps) {
  const baseClasses = cn(
    'relative overflow-hidden bg-muted',
    {
      'rounded-md': variant === 'default' || variant === 'rectangular',
      'rounded-full': variant === 'circular',
      'h-4': variant === 'text' && !height,
      'w-full': variant === 'text' && !width,
    },
    className
  )

  const shimmerVariants = {
    initial: { x: -100 },
    animate: { x: 200 },
  }

  const shimmerTransition = {
    repeat: Infinity,
    duration: 1.2,
    ease: 'linear' as const,
  }

  const style = {
    width: width || (variant === 'circular' ? '40px' : undefined),
    height: height || (variant === 'circular' ? '40px' : undefined),
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'relative overflow-hidden bg-muted h-4 rounded-md',
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              transition={shimmerTransition}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={baseClasses} style={style} {...props}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent -skew-x-12"
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        transition={shimmerTransition}
      />
    </div>
  )
}
