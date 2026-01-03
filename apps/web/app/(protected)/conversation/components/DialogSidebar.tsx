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
}

export function DialogSidebar({ messages, suggestions, onPlayTTS, isLoading, currentInterviewer, scenarioInfo, checkpoints }: DialogSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true)

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
        <p className="text-sm text-gray-600">Real-time chat with AI instructor</p>
      </div>

      {/* Scenario Progress Tracker - Below Conversation Title */}
      {scenarioInfo && checkpoints && checkpoints.length > 0 && (
        <div className="border-b border-gray-200 p-3">
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
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && suggestions.length > 0 && (
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

          {messages.length === 0 && suggestions.length === 0 && (
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
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden ${
                  message.role === 'instructor'
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
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
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <User className="h-5 w-5 text-gray-600" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === 'instructor'
                    ? 'bg-blue-50 text-gray-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Chinese Text */}
                <div className="text-base font-medium">{message.chinese}</div>

                {/* English Translation (for instructor messages) */}
                {message.role === 'instructor' && message.english && (
                  <div className="mt-1 text-sm text-gray-600 italic">{message.english}</div>
                )}

                {/* Transcript (for user messages) */}
                {message.role === 'user' && message.transcript && (
                  <div className="mt-1 text-xs text-gray-500">Heard: {message.transcript}</div>
                )}

                {/* TTS Button for instructor messages */}
                {message.role === 'instructor' && (
                  <button
                    onClick={() => onPlayTTS(message.chinese)}
                    className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Listen</span>
                  </button>
                )}

                {/* Timestamp */}
                <div className="mt-1 text-[10px] text-gray-400">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Bot className="h-5 w-5" />
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Section - Inside messages area, at bottom */}
        {suggestions.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 bg-gray-50">
            {/* Collapsible content - Positioned above button, shows 3 suggestions without scroll */}
            {suggestionsExpanded && (
              <div className="px-6 py-3 space-y-2 border-b border-gray-200 bg-white">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    chinese={suggestion.chinese}
                    pinyin={suggestion.pinyin}
                    english={suggestion.english}
                    onPlayTTS={onPlayTTS}
                  />
                ))}
              </div>
            )}

            {/* Header button - Always at bottom */}
            <button
              onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-100 transition bg-gray-50"
            >
              <h3 className="text-sm font-semibold text-gray-700">
                Suggested Responses ({Math.min(suggestions.length, 3)})
              </h3>
              {suggestionsExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
