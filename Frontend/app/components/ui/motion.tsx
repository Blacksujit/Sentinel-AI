"use client"

import { motion, Variants } from 'framer-motion'

// Premium motion variants for consistent animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.16, ease: 'easeOut' } }
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.16, ease: 'easeOut' } 
  }
}

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.16, ease: 'easeOut' } 
  }
}

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.16, ease: 'easeOut' } 
  }
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.16, ease: 'easeOut' } 
  }
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.16, ease: 'easeOut' } 
  }
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12
    }
  }
}

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.16
    }
  }
}

// Premium hover animations
export const hoverScale = {
  whileHover: { scale: 1.02, transition: { duration: 0.12, ease: 'easeOut' } },
  whileTap: { scale: 0.98 }
}

export const hoverScaleLift = {
  whileHover: { 
    scale: 1.02, 
    y: -4, 
    transition: { duration: 0.12, ease: 'easeOut' } 
  },
  whileTap: { scale: 0.98 }
}

export const hoverScaleLiftStrong = {
  whileHover: { 
    scale: 1.02, 
    y: -8, 
    transition: { duration: 0.12, ease: 'easeOut' } 
  },
  whileTap: { scale: 0.98 }
}

export const hoverGlow = {
  whileHover: { 
    boxShadow: 'var(--shadow-sm)',
    transition: { duration: 0.12, ease: 'easeOut' } 
  }
}

export const hoverGlowViolet = {
  whileHover: { 
    boxShadow: 'var(--shadow-sm)',
    transition: { duration: 0.12, ease: 'easeOut' } 
  }
}

export const hoverGlowTeal = {
  whileHover: { 
    boxShadow: 'var(--shadow-sm)',
    transition: { duration: 0.12, ease: 'easeOut' } 
  }
}

// Page transition variants
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: 'easeOut' } 
  },
  exit: { opacity: 0, y: -20 }
}

// Risk level animations
export const riskLevelAnimations = {
  low: {
    whileHover: { boxShadow: '0 0 12px rgba(56, 118, 56, 0.25)' }
  },
  medium: {
    whileHover: { boxShadow: '0 0 12px rgba(178, 127, 27, 0.25)' }
  },
  high: {
    whileHover: { boxShadow: '0 0 12px rgba(153, 60, 45, 0.25)' }
  },
  critical: {
    whileHover: { boxShadow: '0 0 16px rgba(153, 60, 45, 0.35)' }
  }
}

// Button animations
export const buttonPress = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.12, ease: 'easeOut' }
}

// Modal animations
export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.16, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeOut' } }
}

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.16, ease: 'easeOut' } }
}

// Filter/Drawer animations
export const drawerSlide: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { duration: 0.16, ease: 'easeOut' } },
  exit: { x: '100%', transition: { duration: 0.16, ease: 'easeOut' } }
}

export const filterPanel: Variants = {
  initial: { opacity: 0, height: 0, overflow: 'hidden' },
  animate: { opacity: 1, height: 'auto', overflow: 'hidden', transition: { duration: 0.16, ease: 'easeOut' } },
  exit: { opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.16, ease: 'easeOut' } }
}

// Animated counter component
export const AnimatedCounter = ({ 
  value, 
  duration = 1.6, 
  className = '' 
}: { 
  value: number
  duration?: number
  className?: string 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {value.toLocaleString()}
      </motion.span>
    </motion.div>
  )
}

// Premium card wrapper with motion
export const MotionCard = ({ 
  children, 
  className = '', 
  variants = slideUp,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  variants?: Variants
  [key: string]: any
}) => {
  return (
    <motion.div
      variants={variants}
      {...hoverScaleLift}
      className={`card-premium ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Glass morphism card with motion
export const GlassCard = ({ 
  children, 
  className = '', 
  variants = slideUp,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  variants?: Variants
  [key: string]: any
}) => {
  return (
    <motion.div
      variants={variants}
      {...hoverScaleLift}
      className={`glass-effect-card ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated gradient background
export const AnimatedGradient = ({ 
  className = '', 
  children 
}: {
  className?: string
  children?: React.ReactNode
}) => {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      animate={{
        background: [
          'radial-gradient(circle at 50% 50%, rgba(153, 60, 45, 0.08) 0%, transparent 70%)',
          'radial-gradient(circle at 50% 50%, rgba(56, 118, 56, 0.08) 0%, transparent 70%)',
          'radial-gradient(circle at 50% 50%, rgba(178, 127, 27, 0.08) 0%, transparent 70%)',
          'radial-gradient(circle at 50% 50%, rgba(153, 60, 45, 0.08) 0%, transparent 70%)'
        ]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      {children}
    </motion.div>
  )
}
