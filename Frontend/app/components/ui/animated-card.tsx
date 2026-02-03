'use client'

import { motion, type MotionProps } from 'framer-motion'
import { Card } from './Card'
import { cn } from '@/lib/utils'
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'

type DivProps = ComponentPropsWithoutRef<'div'>

interface AnimatedCardProps
  extends Omit<DivProps, keyof MotionProps>,
    Omit<MotionProps, 'children'> {
  children?: ReactNode
  delay?: number
  hover?: boolean
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    children, 
    className, 
    delay = 0, 
    hover = true,
    ...props 
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.5, 
          delay,
          ease: "easeOut"
        }}
        whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        className="transition-shadow duration-200"
        {...props}
      >
        <Card className={cn(className)}>
          {children}
        </Card>
      </motion.div>
    )
  }
)

AnimatedCard.displayName = "AnimatedCard"
