'use client'

import { useEffect, useState, useRef } from 'react'

interface LiveRegionProps {
  /** The message to announce to screen readers */
  message: string
  /** The politeness level of the announcement */
  politeness?: 'polite' | 'assertive'
  /** Clear the message after announcing (for repeated announcements) */
  clearOnAnnounce?: boolean
  /** Delay before announcing (ms) */
  delay?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * LiveRegion - 無障礙公告組件
 *
 * 用於向螢幕閱讀器宣布動態內容變更
 *
 * @example
 * // 禮貌模式（不打斷當前朗讀）
 * <LiveRegion message={`Score: ${score}`} politeness="polite" />
 *
 * @example
 * // 緊急模式（立即宣布）
 * <LiveRegion message="Error: Recording failed" politeness="assertive" />
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  clearOnAnnounce = false,
  delay = 100,
  className = '',
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!message) {
      setAnnouncement('')
      return
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Delay the announcement slightly to ensure screen readers catch it
    timeoutRef.current = setTimeout(() => {
      setAnnouncement(message)

      if (clearOnAnnounce) {
        // Clear after announcement to allow repeated messages
        setTimeout(() => setAnnouncement(''), 1000)
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [message, clearOnAnnounce, delay])

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {announcement}
    </div>
  )
}

interface AnnouncerProps {
  /** Array of messages to announce in sequence */
  messages: string[]
  /** Delay between messages (ms) */
  interval?: number
  /** Politeness level */
  politeness?: 'polite' | 'assertive'
}

/**
 * Announcer - 連續公告組件
 *
 * 用於需要依序宣布多條訊息的場景
 */
export function Announcer({
  messages,
  interval = 2000,
  politeness = 'polite',
}: AnnouncerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentMessage, setCurrentMessage] = useState('')

  useEffect(() => {
    if (messages.length === 0) return

    setCurrentMessage(messages[0])
    setCurrentIndex(0)

    if (messages.length === 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % messages.length
        setCurrentMessage(messages[next])
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [messages, interval])

  return (
    <LiveRegion
      message={currentMessage}
      politeness={politeness}
      clearOnAnnounce={true}
    />
  )
}

/**
 * VisuallyHidden - 視覺隱藏但對螢幕閱讀器可見的內容
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

/**
 * useAnnounce - 程式化公告 Hook
 *
 * @example
 * const announce = useAnnounce()
 *
 * const handleScoreUpdate = (newScore) => {
 *   announce(`Your score is ${newScore}%`)
 * }
 */
export function useAnnounce() {
  const [message, setMessage] = useState('')
  const [key, setKey] = useState(0)

  const announce = (text: string, options?: { politeness?: 'polite' | 'assertive' }) => {
    // Force re-render by changing key
    setKey(k => k + 1)
    setMessage(text)

    // Clear after announcement
    setTimeout(() => setMessage(''), 1000)
  }

  const AnnouncerComponent = () => (
    <LiveRegion
      key={key}
      message={message}
      politeness="polite"
      clearOnAnnounce={true}
    />
  )

  return { announce, AnnouncerComponent }
}

export default LiveRegion
