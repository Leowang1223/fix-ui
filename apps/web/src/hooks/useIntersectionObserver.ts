'use client'

import { useEffect, useRef, useState, RefObject } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  rootMargin?: string
  root?: Element | null
  freezeOnceVisible?: boolean
}

interface UseIntersectionObserverReturn {
  ref: RefObject<HTMLDivElement>
  isVisible: boolean
  entry?: IntersectionObserverEntry
}

/**
 * Hook for detecting when an element is visible in the viewport
 * Useful for lazy loading and virtualization
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0,
    rootMargin = '100px',
    root = null,
    freezeOnceVisible = false,
  } = options

  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  const frozen = freezeOnceVisible && isVisible

  useEffect(() => {
    const element = ref.current
    if (!element || frozen) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
        setEntry(entry)
      },
      { threshold, rootMargin, root }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, root, frozen])

  return { ref, isVisible, entry }
}

/**
 * Hook for lazy loading content
 * Only renders children when element is near viewport
 */
export function useLazyLoad(rootMargin = '200px') {
  const { ref, isVisible } = useIntersectionObserver({
    rootMargin,
    freezeOnceVisible: true,
  })

  return { ref, shouldRender: isVisible }
}

export default useIntersectionObserver
