'use client'

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Suggestion } from './DialogSidebar'

interface HorizontalSuggestionPillsProps {
  suggestions: Suggestion[]
  onPlayTTS: (text: string) => void
}

export function HorizontalSuggestionPills({ suggestions, onPlayTTS }: HorizontalSuggestionPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll position
  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    updateScrollButtons()
    const ref = scrollRef.current
    if (ref) {
      ref.addEventListener('scroll', updateScrollButtons)
      return () => ref.removeEventListener('scroll', updateScrollButtons)
    }
  }, [suggestions])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 150
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  if (suggestions.length === 0) return null

  return (
    <div className="absolute bottom-32 left-0 right-0 z-10 px-2">
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white shadow-lg"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Scrollable pills */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-none px-2 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onPlayTTS(suggestion.chinese)}
              className="flex-shrink-0 group"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 hover:bg-white transition-colors min-w-[120px] max-w-[200px]">
                {/* Text content - vertical stack */}
                <div className="flex-1 text-left min-w-0">
                  {/* Chinese text */}
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {suggestion.chinese}
                  </p>
                  {/* Pinyin */}
                  <p className="text-[10px] text-blue-600 truncate">
                    {suggestion.pinyin}
                  </p>
                  {/* English */}
                  <p className="text-[9px] text-slate-500 truncate">
                    {suggestion.english}
                  </p>
                </div>

                {/* Speaker icon */}
                <Volume2 size={14} className="text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white shadow-lg"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Subtle label */}
      <p className="text-center text-[10px] text-white/60 mt-1 drop-shadow">
        Tap to hear suggestion
      </p>
    </div>
  )
}

export default HorizontalSuggestionPills
