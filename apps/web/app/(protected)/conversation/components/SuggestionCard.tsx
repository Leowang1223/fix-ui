'use client'

import { Volume2 } from 'lucide-react'

interface SuggestionCardProps {
  chinese: string
  pinyin: string
  english: string
  onPlayTTS: (text: string) => void
  transparent?: boolean
}

export function SuggestionCard({ chinese, pinyin, english, onPlayTTS, transparent = false }: SuggestionCardProps) {
  return (
    <div className={`group rounded-lg p-2.5 transition-all ${
      transparent
        ? 'bg-white/10 hover:bg-white/20 border border-white/20'
        : 'border border-gray-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Chinese */}
          <div className={`text-sm font-medium truncate ${transparent ? 'text-white' : 'text-gray-900'}`}>{chinese}</div>

          {/* Pinyin */}
          <div className={`mt-0.5 text-xs truncate ${transparent ? 'text-white/60' : 'text-gray-500'}`}>{pinyin}</div>

          {/* English */}
          <div className={`mt-0.5 text-xs italic truncate ${transparent ? 'text-white/70' : 'text-gray-600'}`}>{english}</div>
        </div>

        {/* TTS Button */}
        <button
          onClick={() => onPlayTTS(chinese)}
          className={`shrink-0 rounded-full p-1.5 transition-colors ${
            transparent ? 'text-white/80 hover:bg-white/20' : 'text-blue-600 hover:bg-blue-50'
          }`}
          title="Listen to pronunciation"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
