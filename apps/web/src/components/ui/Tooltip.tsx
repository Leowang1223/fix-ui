'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: TooltipPosition
  delay?: number           // 顯示延遲（毫秒）
  disabled?: boolean
  className?: string
  touchHold?: boolean      // 觸控長按顯示
  touchHoldDelay?: number  // 長按延遲（毫秒）
}

const POSITION_STYLES: Record<TooltipPosition, {
  container: string
  arrow: string
  initial: { x?: number; y?: number }
}> = {
  top: {
    container: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
    initial: { y: 5 },
  },
  bottom: {
    container: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
    initial: { y: -5 },
  },
  left: {
    container: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
    initial: { x: 5 },
  },
  right: {
    container: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent',
    initial: { x: -5 },
  },
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  disabled = false,
  className = '',
  touchHold = true,
  touchHoldDelay = 500,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isTouching, setIsTouching] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const positionStyles = POSITION_STYLES[position]

  // 清理定時器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current)
    }
  }, [])

  const showTooltip = () => {
    if (disabled) return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  // 觸控長按處理
  const handleTouchStart = () => {
    if (disabled || !touchHold) return
    setIsTouching(true)
    touchTimeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, touchHoldDelay)
  }

  const handleTouchEnd = () => {
    setIsTouching(false)
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current)
    // 延遲隱藏，讓用戶有時間看到提示
    setTimeout(() => {
      setIsVisible(false)
    }, 1500)
  }

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, ...positionStyles.initial }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...positionStyles.initial }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionStyles.container}`}
          >
            {/* Tooltip 內容 */}
            <div className="px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap max-w-xs">
              {content}
            </div>

            {/* 小三角 */}
            <div
              className={`absolute border-4 ${positionStyles.arrow}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 帶 Tooltip 的圖標按鈕
interface IconButtonProps {
  icon: ReactNode
  tooltip: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  tooltipPosition?: TooltipPosition
}

const VARIANT_STYLES = {
  default: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
}

const SIZE_STYLES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

export function IconButton({
  icon,
  tooltip,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'md',
  className = '',
  tooltipPosition = 'top',
}: IconButtonProps) {
  return (
    <Tooltip content={tooltip} position={tooltipPosition} disabled={disabled}>
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={onClick}
        disabled={disabled}
        className={`
          ${SIZE_STYLES[size]}
          ${VARIANT_STYLES[variant]}
          rounded-full flex items-center justify-center
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
      >
        {icon}
      </motion.button>
    </Tooltip>
  )
}

export default Tooltip
