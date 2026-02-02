'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'

interface CursorPosition {
  x: number
  y: number
}

interface InteractiveElement {
  element: HTMLElement
  riskLevel?: 'critical' | 'high' | 'medium' | 'low'
}

export function useCursorInteractions() {
  const cursorPosition = useRef<CursorPosition>({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(true)
  const [currentRiskLevel, setCurrentRiskLevel] = useState<'critical' | 'high' | 'medium' | 'low' | null>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<HTMLDivElement[]>([])
  const interactiveElements = useRef<InteractiveElement[]>([])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Trigger initial mouse move to set cursor position
    const handleInitialMouseMove = (e: MouseEvent) => {
      cursorPosition.current = { x: e.clientX, y: e.clientY }
      if (haloRef.current) {
        haloRef.current.style.left = `${e.clientX}px`
        haloRef.current.style.top = `${e.clientY}px`
      }
      // Remove this listener after first move
      document.removeEventListener('mousemove', handleInitialMouseMove)
    }

    // Set up initial position and then regular tracking
    document.addEventListener('mousemove', handleInitialMouseMove)

    const handleMouseMove = (e: MouseEvent) => {
      cursorPosition.current = { x: e.clientX, y: e.clientY }
      
      // Update halo position
      if (haloRef.current) {
        haloRef.current.style.left = `${e.clientX}px`
        haloRef.current.style.top = `${e.clientY}px`
      }

      // Create trail effect
      if (isHovering) {
        const trail = document.createElement('div')
        trail.className = 'cursor-trail active'
        trail.style.left = `${e.clientX}px`
        trail.style.top = `${e.clientY}px`
        document.body.appendChild(trail)
        trailRef.current.push(trail)

        // Remove trail after animation
        setTimeout(() => {
          trail.classList.remove('active')
          setTimeout(() => {
            if (trail.parentNode) {
              trail.parentNode.removeChild(trail)
            }
            const index = trailRef.current.indexOf(trail)
            if (index > -1) {
              trailRef.current.splice(index, 1)
            }
          }, 200)
        }, 100)
      }

      // Check proximity to interactive elements
      let closestElement: { element: HTMLElement; riskLevel?: 'critical' | 'high' | 'medium' | 'low' } | null = null
      let closestDistance = Infinity

      interactiveElements.current.forEach(({ element, riskLevel }) => {
        const rect = element.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const distance = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2))

        if (distance < closestDistance && distance < 100) {
          closestDistance = distance
          closestElement = { element, riskLevel }
        }
      })

      setCurrentRiskLevel((closestElement as any)?.riskLevel || null)
    }

    const handleMouseEnter = () => setIsHovering(true)
    const handleMouseLeave = () => {
      setIsHovering(false)
      setCurrentRiskLevel(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
      
      // Clean up trails
      trailRef.current.forEach(trail => {
        if (trail.parentNode) {
          trail.parentNode.removeChild(trail)
        }
      })
      trailRef.current = []; // Fix syntax error by resetting trailRef.current to an empty array
    }
  }, [isHovering])

  const registerInteractiveElement = (element: HTMLElement, riskLevel?: 'critical' | 'high' | 'medium' | 'low') => {
    interactiveElements.current.push({ element, riskLevel })
    
    return () => {
      const index = interactiveElements.current.findIndex(({ element: el }) => el === element)
      if (index > -1) {
        interactiveElements.current.splice(index, 1)
      }
    }
  }

  const updateCursorPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    cursorPosition.current = { x: centerX, y: centerY }
    
    if (haloRef.current) {
      haloRef.current.style.left = `${centerX}px`
      haloRef.current.style.top = `${centerY}px`
    }
  }

  return {
    cursorPosition,
    isHovering,
    currentRiskLevel,
    registerInteractiveElement,
    updateCursorPosition,
    haloRef,
    trailRef
  }
}

export function CursorProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function CursorHalo() {
  const { haloRef, currentRiskLevel, isHovering } = useCursorInteractions()

  const getHaloColor = () => {
    if (!isHovering) return 'radial-gradient(circle, rgba(79, 139, 255, 0.3) 0%, transparent 70%)'
    switch (currentRiskLevel) {
      case 'critical': return 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)'
      case 'high': return 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)'
      case 'low': return 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)'
      default: return 'radial-gradient(circle, rgba(79, 139, 255, 0.3) 0%, transparent 70%)'
    }
  }

  return (
    <div 
      ref={haloRef}
      className="cursor-halo"
      style={{
        background: getHaloColor(),
        opacity: isHovering ? 1 : 0,
        transform: `translate(-50%, -50%) scale(${currentRiskLevel === 'critical' ? 1.2 : currentRiskLevel ? 1.1 : 1})`
      }}
    />
  )
}