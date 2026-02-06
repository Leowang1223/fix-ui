'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, MessageCircle, ChevronRight } from 'lucide-react'
import type { Message } from './DialogSidebar'

interface FloatingMessageBubbleProps {
  message: Message | null
  messageCount: number
  onTap: () => void
  onPlayTTS: (text: string) => void
  isLoading?: boolean
}

export function FloatingMessageBubble({
  message,
  messageCount,
  onTap,
  onPlayTTS,
  isLoading
}: FloatingMessageBubbleProps) {
  if (!message && !isLoading) return null

  return (
    <div className="absolute top-4 left-4 right-4 z-10">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-black/60 backdrop-blur-md rounded-2xl p-4 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-white/70" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-white/70" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-white/70" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-white/70">AI is thinking...</span>
            </div>
          </motion.div>
        ) : message ? (
          <motion.button
            key={message.id}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            onClick={onTap}
            className="w-full text-left bg-black/60 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/10 active:scale-[0.98] transition-transform"
          >
            {/* Message Content */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Chinese Text */}
                <p className="text-white font-medium text-base leading-relaxed line-clamp-2">
                  {message.chinese}
                </p>

                {/* English Translation */}
                {message.english && (
                  <p className="text-white/60 text-sm mt-1 line-clamp-1 italic">
                    {message.english}
                  </p>
                )}
              </div>

              {/* TTS Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayTTS(message.chinese)
                }}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <Volume2 size={18} className="text-white" />
              </button>
            </div>

            {/* Footer: Tap to expand hint */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-white/50 text-xs">
                <MessageCircle size={12} />
                <span>{messageCount} messages</span>
              </div>
              <div className="flex items-center gap-1 text-blue-300 text-xs font-medium">
                <span>View all</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default FloatingMessageBubble
