'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Volume2, User, Bot, ChevronUp, ChevronDown } from 'lucide-react'
import { SuggestionCard } from './SuggestionCard'
import ProgressTracker from './ProgressTracker'
import { type ScenarioCheckpoint } from '@/lib/api'
import { getInterviewerImagePath } from '../../lesson/components/InterviewerSelector'

export interface Message {
  id: string
  role: 'user' | 'instructor'
  chinese: string
  english?: string
  transcript?: string
  timestamp: Date
}

export interface Suggestion {
  chinese: string
  pinyin: string
  english: string
}

interface DialogSidebarProps {
  messages: Message[]
  suggestions: Suggestion[]
  onPlayTTS: (text: string) => void
  isLoading?: boolean
  currentInterviewer?: string
  scenarioInfo?: {
    title: string
    objective: string
    interviewerImage?: string
  } | null
  checkpoints?: ScenarioCheckpoint[]
  /** 半透明彈幕模式 - 疊加在人像上 */
  transparent?: boolean
}

export function DialogSidebar({ messages, suggestions, onPlayTTS, isLoading, currentInterviewer, scenarioInfo, checkpoints, transparent = false }: DialogSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true)

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={`flex h-full flex-col ${transparent ? 'bg-transparent' : 'bg-white'}`}>
      {/* Header - Hidden in transparent mode */}
      {!transparent && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
          <p className="text-sm text-gray-600">Real-time chat with AI instructor</p>
        </div>
      )}

      {/* Scenario Progress Tracker - Below Conversation Title */}
      {scenarioInfo && checkpoints && checkpoints.length > 0 && (
        <div className={`p-3 ${transparent ? 'bg-black/30 backdrop-blur-sm' : 'border-b border-gray-200'}`}>
          <ProgressTracker
            checkpoints={checkpoints}
            objective={scenarioInfo.objective}
            scenarioTitle={scenarioInfo.title}
          />
        </div>
      )}

      {/* Messages Area - contains both messages and suggestions */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable Messages */}
        <div className={`flex-1 space-y-3 overflow-y-auto ${transparent ? 'p-4' : 'p-6'}`}>
          {messages.length === 0 && suggestions.length > 0 && !transparent && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  開始對話
                </h3>
                <p className="text-sm text-gray-600">
                  點擊下方建議或直接說話開始練習
                </p>
              </div>
            </div>
          )}

          {messages.length === 0 && suggestions.length === 0 && !transparent && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-gray-400">
                <Bot className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Conversation will appear here</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar - smaller in transparent mode */}
              <div
                className={`flex shrink-0 items-center justify-center rounded-full overflow-hidden ${
                  transparent ? 'h-6 w-6' : 'h-8 w-8'
                } ${
                  message.role === 'instructor'
                    ? transparent ? 'bg-white/30 backdrop-blur-sm' : 'bg-blue-100'
                    : transparent ? 'bg-white/30 backdrop-blur-sm' : 'bg-gray-100'
                }`}
              >
                {message.role === 'instructor' ? (
                  <Image
                    src={
                      scenarioInfo?.interviewerImage
                        ? `/interviewers/${scenarioInfo.interviewerImage}`
                        : getInterviewerImagePath(currentInterviewer || 'teacher-female-1')
                    }
                    alt="AI Instructor"
                    width={transparent ? 24 : 32}
                    height={transparent ? 24 : 32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <User className={`${transparent ? 'h-4 w-4' : 'h-5 w-5'} ${transparent ? 'text-white' : 'text-gray-600'}`} />
                )}
              </div>

              {/* Message Bubble - Glass effect in transparent mode */}
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  transparent
                    ? message.role === 'instructor'
                      ? 'bg-black/50 backdrop-blur-md text-white'
                      : 'bg-white/40 backdrop-blur-md text-white'
                    : message.role === 'instructor'
                      ? 'bg-blue-50 text-gray-900'
                      : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Chinese Text */}
                <div className={`${transparent ? 'text-sm' : 'text-base'} font-medium`}>{message.chinese}</div>

                {/* English Translation (for instructor messages) */}
                {message.role === 'instructor' && message.english && (
                  <div className={`mt-1 text-xs italic ${transparent ? 'text-white/70' : 'text-gray-600'}`}>{message.english}</div>
                )}

                {/* Transcript (for user messages) */}
                {message.role === 'user' && message.transcript && (
                  <div className={`mt-1 text-xs ${transparent ? 'text-white/60' : 'text-gray-500'}`}>Heard: {message.transcript}</div>
                )}

                {/* TTS Button for instructor messages */}
                {message.role === 'instructor' && (
                  <button
                    onClick={() => onPlayTTS(message.chinese)}
                    className={`mt-1.5 flex items-center gap-1 text-xs ${transparent ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Listen</span>
                  </button>
                )}

                {/* Timestamp - Hidden in transparent mode to reduce clutter */}
                {!transparent && (
                  <div className="mt-1 text-[10px] text-gray-400">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className={`flex shrink-0 items-center justify-center rounded-full ${
                transparent ? 'h-6 w-6 bg-white/30 backdrop-blur-sm text-white' : 'h-8 w-8 bg-blue-100 text-blue-600'
              }`}>
                <Bot className={transparent ? 'h-4 w-4' : 'h-5 w-5'} />
              </div>
              <div className={`rounded-2xl px-3 py-2 ${transparent ? 'bg-black/50 backdrop-blur-md' : 'bg-blue-50'}`}>
                <div className="flex gap-1">
                  <div className={`h-2 w-2 animate-bounce rounded-full ${transparent ? 'bg-white/70' : 'bg-blue-400'}`} style={{ animationDelay: '0ms' }} />
                  <div className={`h-2 w-2 animate-bounce rounded-full ${transparent ? 'bg-white/70' : 'bg-blue-400'}`} style={{ animationDelay: '150ms' }} />
                  <div className={`h-2 w-2 animate-bounce rounded-full ${transparent ? 'bg-white/70' : 'bg-blue-400'}`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Section - Inside messages area, at bottom */}
        {suggestions.length > 0 && (
          <div className={`shrink-0 ${transparent ? 'bg-black/40 backdrop-blur-md' : 'border-t border-gray-200 bg-gray-50'}`}>
            {/* Collapsible content - Positioned above button, shows 3 suggestions without scroll */}
            {suggestionsExpanded && (
              <div className={`px-4 py-3 space-y-2 ${transparent ? 'border-b border-white/10' : 'border-b border-gray-200 bg-white'}`}>
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    chinese={suggestion.chinese}
                    pinyin={suggestion.pinyin}
                    english={suggestion.english}
                    onPlayTTS={onPlayTTS}
                    transparent={transparent}
                  />
                ))}
              </div>
            )}

            {/* Header button - Always at bottom */}
            <button
              onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
              className={`w-full flex items-center justify-between px-4 py-2.5 transition ${
                transparent ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 bg-gray-50'
              }`}
            >
              <h3 className={`text-sm font-semibold ${transparent ? 'text-white/90' : 'text-gray-700'}`}>
                Suggested Responses ({Math.min(suggestions.length, 3)})
              </h3>
              {suggestionsExpanded ? (
                <ChevronDown className={`h-4 w-4 ${transparent ? 'text-white/60' : 'text-gray-500'}`} />
              ) : (
                <ChevronUp className={`h-4 w-4 ${transparent ? 'text-white/60' : 'text-gray-500'}`} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
