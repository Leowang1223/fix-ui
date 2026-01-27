'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if user prefers reduced motion
 * Returns true if the user has enabled "reduce motion" in their system settings
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = useReducedMotion()
 *
 * return (
 *   <motion.div
 *     initial={prefersReducedMotion ? false : { opacity: 0 }}
 *     animate={{ opacity: 1 }}
 *     transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
 *   />
 * )
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') return

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    // Legacy browsers (Safari < 14)
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Returns animation props based on reduced motion preference
 * Useful for Framer Motion components
 */
export function useMotionSafe() {
  const prefersReducedMotion = useReducedMotion()

  return {
    prefersReducedMotion,
    // Disable initial animation if reduced motion is preferred
    initial: prefersReducedMotion ? false : undefined,
    // Instant transitions for reduced motion
    transition: prefersReducedMotion
      ? { duration: 0 }
      : undefined,
    // Helper to conditionally apply animation values
    animate: <T extends object>(values: T) =>
      prefersReducedMotion ? {} : values,
  }
}

export default useReducedMotion
