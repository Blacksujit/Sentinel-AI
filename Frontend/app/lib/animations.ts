import { type VariantLabels, type Variants } from 'framer-motion'

/**
 * Common animation variants for Framer Motion
 */

// Fade animations
export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.3, ease: 'easeOut' }
    },
}

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
}

export const fadeInDown: Variants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
}

export const fadeInLeft: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
}

export const fadeInRight: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
}

// Scale animations
export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
    },
}

export const scaleInBounce: Variants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1],
            type: 'spring',
            stiffness: 200,
            damping: 15
        }
    },
}

// Stagger container
export const staggerContainer: Variants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
}

export const staggerContainerFast: Variants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0,
        },
    },
}

// Slide animations
export const slideInLeft: Variants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.5, ease: 'easeOut' }
    },
}

export const slideInRight: Variants = {
    hidden: { x: '100%', opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.5, ease: 'easeOut' }
    },
}

// Hover animations
export const hoverScale = {
    scale: 1.05,
    transition: { duration: 0.2, ease: 'easeOut' }
}

export const hoverLift = {
    y: -5,
    transition: { duration: 0.2, ease: 'easeOut' }
}

export const hoverGlow = {
    boxShadow: '0 0 30px rgba(0, 229, 255, 0.5)',
    transition: { duration: 0.3, ease: 'easeOut' }
}

// Tap animations
export const tapScale = {
    scale: 0.95,
    transition: { duration: 0.1 }
}

// Rotation
export const rotate360: Variants = {
    hidden: { rotate: 0 },
    visible: {
        rotate: 360,
        transition: { duration: 1, ease: 'linear', repeat: Infinity }
    },
}

// Number counter animation config
export const numberCounterConfig = {
    duration: 1.5,
    ease: 'easeOut',
}

// Page transition variants
export const pageTransition: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: { duration: 0.3, ease: 'easeIn' }
    },
}

// Floating animation
export const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
        duration: 3,
        ease: 'easeInOut',
        repeat: Infinity,
    }
}

// Pulse animation
export const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
        duration: 2,
        ease: 'easeInOut',
        repeat: Infinity,
    }
}

/**
 * Custom easing functions
 */
export const easings = {
    easeOutCubic: [0.33, 1, 0.68, 1],
    easeInCubic: [0.32, 0, 0.67, 0],
    easeInOutCubic: [0.65, 0, 0.35, 1],
    easeOutQuart: [0.25, 1, 0.5, 1],
    easeOutExpo: [0.16, 1, 0.3, 1],
    easeOutBack: [0.34, 1.56, 0.64, 1],
    spring: { type: 'spring', stiffness: 200, damping: 20 },
    softSpring: { type: 'spring', stiffness: 100, damping: 15 },
}

/**
 * Duration constants (in seconds)
 */
export const durations = {
    instant: 0.1,
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
    slower: 0.8,
    slowest: 1.2,
}
