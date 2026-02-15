'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, User, Bot } from 'lucide-react'
import type { Message, Suggestion } from './DialogSidebar'
import { getInterviewerImagePath } from '../../lesson/components/InterviewerSelector'

interface FullScreenChatModalProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
  suggestions: Suggestion[]
  onPlayTTS: (text: string) => void
  isLoading?: boolean
  currentInterviewer?: string
  scenarioInfo?: {
    interviewerImage?: string
  } | null
}

export function FullScreenChatModal({
  isOpen,
  onClose,
  messages,
  suggestions,
  onPlayTTS,
  isLoading,
  currentInterviewer,
  scenarioInfo
}: FullScreenChatModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages, isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white"
        >
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-base font-semibold text-slate-900">Conversation</h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 pb-32" style={{ height: 'calc(100vh - 60px - 100px)' }}>
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-slate-400">
                  <Bot className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-full overflow-hidden h-9 w-9 ${
                        message.role === 'instructor' ? 'bg-blue-100' : 'bg-slate-100'
                      }`}
                    >
                      {message.role === 'instructor' ? (
                        <Image
                          src={
                            scenarioInfo?.interviewerImage
                              ? `/interviewers/${scenarioInfo.interviewerImage}`
                              : getInterviewerImagePath(currentInterviewer || 'teacher-female-1')
                          }
                          alt="AI"
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <User className="h-5 w-5 text-slate-600" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'instructor'
                          ? 'bg-blue-50 text-slate-900'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      {/* Chinese Text */}
                      <p className="text-base font-medium">{message.chinese}</p>

                      {/* English Translation */}
                      {message.role === 'instructor' && message.english && (
                        <p className="mt-1 text-sm text-slate-500 italic">{message.english}</p>
                      )}

                      {/* User transcript */}
                      {message.role === 'user' && message.transcript && (
                        <p className="mt-1 text-xs text-slate-400">Heard: {message.transcript}</p>
                      )}

                      {/* TTS & Timestamp */}
                      <div className="flex items-center justify-between mt-2">
                        {message.role === 'instructor' && (
                          <button
                            onClick={() => onPlayTTS(message.chinese)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Volume2 className="h-3 w-3" />
                            <span>Listen</span>
                          </button>
                        )}
                        <span className={`text-[10px] text-slate-400 ${message.role === 'user' ? 'ml-auto' : ''}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex shrink-0 items-center justify-center rounded-full h-9 w-9 bg-blue-100">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-blue-50">
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
            )}
          </div>

          {/* Suggestions at bottom */}
          {suggestions.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-bottom">
              <p className="text-xs text-slate-500 font-medium mb-2">Suggested responses:</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onPlayTTS(suggestion.chinese)}
                    className="flex-shrink-0 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
                  >
                    <p className="text-sm font-medium text-blue-900 whitespace-nowrap">{suggestion.chinese}</p>
                    <p className="text-[10px] text-blue-600 whitespace-nowrap">{suggestion.pinyin}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FullScreenChatModal
