'use client'

import { useEffect, useState } from 'react'

export type SubtitleBarProps = {
  text: string
  isRetry?: boolean
  encouragement?: string
}

export default function SubtitleBar({ text, isRetry = false, encouragement }: SubtitleBarProps) {
  const [displayText, setDisplayText] = useState('')
  const [showEncouragement, setShowEncouragement] = useState(false)

  useEffect(() => {
    setDisplayText(text)
    setShowEncouragement(false)
    
    // 如果有鼓勵文字，在主文字顯示 2 秒後顯示
    if (encouragement && !isRetry) {
      const timer = setTimeout(() => {
        setShowEncouragement(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [text, encouragement, isRetry])

  return (
    <div className="w-full bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 shadow-inner">
      <div className="max-w-4xl mx-auto px-6 py-4">
        {/* 主文字 */}
        <div className={`text-center transition-all duration-300 ${
          isRetry ? 'text-orange-600 font-semibold' : 'text-gray-800'
        }`}>
          <p className="text-lg leading-relaxed">
            {displayText}
          </p>
        </div>

        {/* 鼓勵文字（淡入效果） */}
        {showEncouragement && encouragement && (
          <div className="mt-3 text-center animate-fade-in">
            <p className="text-sm text-green-600 font-medium">
              {encouragement}
            </p>
          </div>
        )}

        {/* 重試提示 */}
        {isRetry && (
          <div className="mt-2 text-center">
            <p className="text-sm text-gray-600">
              請再試一次 🎤
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      ` }} />
    </div>
  )
}
