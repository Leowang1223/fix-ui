'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { isOffline, onNetworkChange } from '@/lib/fetchWithRetry'

interface OfflineAlertProps {
  onRetry?: () => void
}

export function OfflineAlert({ onRetry }: OfflineAlertProps) {
  const [offline, setOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // 初始檢查
    setOffline(isOffline())

    // 監聽變化
    const unsubscribe = onNetworkChange((online) => {
      if (!online) {
        setOffline(true)
        setWasOffline(true)
      } else {
        setOffline(false)
        // 恢復在線後短暫顯示提示
        setTimeout(() => setWasOffline(false), 3000)
      }
    })

    return unsubscribe
  }, [])

  return (
    <AnimatePresence>
      {(offline || wasOffline) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[150] flex justify-center px-4 pt-2"
        >
          <div
            className={`
              flex items-center gap-3 px-4 py-2 rounded-full shadow-lg
              ${offline
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white'
              }
            `}
          >
            {offline ? (
              <>
                <WifiOff size={18} />
                <span className="text-sm font-medium">網絡已斷開</span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </>
            ) : (
              <>
                <Wifi size={18} />
                <span className="text-sm font-medium">網絡已恢復</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 重試指示器
interface RetryIndicatorProps {
  attempt: number
  maxAttempts: number
  isRetrying: boolean
}

export function RetryIndicator({
  attempt,
  maxAttempts,
  isRetrying,
}: RetryIndicatorProps) {
  if (!isRetrying) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <RefreshCw size={16} />
      </motion.div>
      <span className="text-sm font-medium">
        重試中 ({attempt}/{maxAttempts})...
      </span>
    </motion.div>
  )
}

export default OfflineAlert
