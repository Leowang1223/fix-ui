'use client'

import { useState, useRef, useCallback, TouchEvent, MouseEvent } from 'react'

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null

interface SwipeState {
  direction: SwipeDirection
  deltaX: number
  deltaY: number
  isSwiping: boolean
}

interface UseSwipeOptions {
  threshold?: number      // 觸發滑動的最小距離
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipe?: (direction: SwipeDirection, delta: { x: number; y: number }) => void
  preventScroll?: boolean  // 滑動時阻止頁面滾動
}

interface UseSwipeReturn extends SwipeState {
  handlers: {
    onTouchStart: (e: TouchEvent) => void
    onTouchMove: (e: TouchEvent) => void
    onTouchEnd: (e: TouchEvent) => void
    onMouseDown: (e: MouseEvent) => void
    onMouseMove: (e: MouseEvent) => void
    onMouseUp: (e: MouseEvent) => void
    onMouseLeave: (e: MouseEvent) => void
  }
}

export function useSwipe(options: UseSwipeOptions = {}): UseSwipeReturn {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    preventScroll = false,
  } = options

  const [state, setState] = useState<SwipeState>({
    direction: null,
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
  })

  const startPos = useRef({ x: 0, y: 0 })
  const isTracking = useRef(false)

  const handleStart = useCallback((x: number, y: number) => {
    startPos.current = { x, y }
    isTracking.current = true
    setState(prev => ({ ...prev, isSwiping: true, deltaX: 0, deltaY: 0 }))
  }, [])

  const handleMove = useCallback((x: number, y: number, e?: TouchEvent) => {
    if (!isTracking.current) return

    const deltaX = x - startPos.current.x
    const deltaY = y - startPos.current.y

    // 判斷方向
    let direction: SwipeDirection = null
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    // 阻止頁面滾動
    if (preventScroll && e && Math.abs(deltaX) > 10) {
      e.preventDefault()
    }

    setState({ direction, deltaX, deltaY, isSwiping: true })
  }, [preventScroll])

  const handleEnd = useCallback(() => {
    if (!isTracking.current) return

    const { deltaX, deltaY } = state

    // 判斷是否達到閾值
    if (Math.abs(deltaX) >= threshold || Math.abs(deltaY) >= threshold) {
      let finalDirection: SwipeDirection = null

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        finalDirection = deltaX > 0 ? 'right' : 'left'
        if (finalDirection === 'left') onSwipeLeft?.()
        if (finalDirection === 'right') onSwipeRight?.()
      } else {
        finalDirection = deltaY > 0 ? 'down' : 'up'
        if (finalDirection === 'up') onSwipeUp?.()
        if (finalDirection === 'down') onSwipeDown?.()
      }

      onSwipe?.(finalDirection, { x: deltaX, y: deltaY })
    }

    isTracking.current = false
    setState({ direction: null, deltaX: 0, deltaY: 0, isSwiping: false })
  }, [state, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipe])

  // 觸控事件處理
  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }, [handleStart])

  const onTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY, e)
  }, [handleMove])

  const onTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // 滑鼠事件處理（用於桌面端測試）
  const onMouseDown = useCallback((e: MouseEvent) => {
    handleStart(e.clientX, e.clientY)
  }, [handleStart])

  const onMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const onMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  const onMouseLeave = useCallback(() => {
    if (isTracking.current) {
      handleEnd()
    }
  }, [handleEnd])

  return {
    ...state,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
  }
}

// 長按 Hook
interface UseLongPressOptions {
  delay?: number           // 長按觸發時間
  onLongPress: () => void
  onPress?: () => void     // 短按回調
}

export function useLongPress(options: UseLongPressOptions) {
  const { delay = 500, onLongPress, onPress } = options

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const start = useCallback(() => {
    isLongPress.current = false
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, delay)
  }, [delay, onLongPress])

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (!isLongPress.current && onPress) {
      onPress()
    }
  }, [onPress])

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
  }
}

// 下拉刷新 Hook
interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
}

export function usePullToRefresh(options: UsePullToRefreshOptions) {
  const { onRefresh, threshold = 80 } = options
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0 || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY.current)

    // 添加阻尼效果
    const dampedDistance = Math.min(distance * 0.5, threshold * 1.5)
    setPullDistance(dampedDistance)
  }, [isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
    }
    setPullDistance(0)
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}

export default useSwipe
