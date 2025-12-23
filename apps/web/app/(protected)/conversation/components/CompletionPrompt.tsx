'use client'

import { useState, useEffect } from 'react'

interface CompletionPromptProps {
  isAllCompleted: boolean
  onContinue: () => void
  onEnd: () => void
}

export default function CompletionPrompt({ isAllCompleted, onContinue, onEnd }: CompletionPromptProps) {
  const [show, setShow] = useState(false)
  const [completedAt, setCompletedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (isAllCompleted && !completedAt) {
      setCompletedAt(new Date())
    }

    if (completedAt) {
      const timer = setTimeout(() => {
        setShow(true)
      }, 30000) // 30秒後顯示

      return () => clearTimeout(timer)
    }
  }, [isAllCompleted, completedAt])

  if (!show) return null

  return (
    <div className="fixed bottom-20 right-6 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-lg shadow-2xl max-w-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1">Mission Complete!</h3>
            <p className="text-xs mb-3">You have completed all conversation objectives.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShow(false)
                  onContinue()
                }}
                className="flex-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-xs font-medium transition"
              >
                Continue Practice
              </button>
              <button
                onClick={onEnd}
                className="flex-1 bg-white text-green-600 hover:bg-gray-100 px-3 py-1.5 rounded text-xs font-medium transition"
              >
                View Report
              </button>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-white/80 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
