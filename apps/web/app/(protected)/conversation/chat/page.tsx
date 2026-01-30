'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  X
} from 'lucide-react'
import { DialogSidebar, type Message, type Suggestion } from '../components/DialogSidebar'
import { InterviewerSelector, getInterviewerImagePath, getInterviewerVoice, DEFAULT_INTERVIEWER } from '../../lesson/components/InterviewerSelector'
import CompletionPrompt from '../components/CompletionPrompt'
import { type ScenarioCheckpoint, apiGetScenarioById, fetchJson, getApiBase } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// TTS utility functions
function removePinyin(text: string): string {
  if (!text) return ''
  return text.replace(/\([^)]*\)/g, '').trim()
}

function convertSymbolsToWords(text: string): string {
  if (!text) return ''
  const symbolMap: Record<string, string> = {
    '%': 'percent',
    '&': 'and',
    '@': 'at',
    '#': 'hashtag number',
    '$': 'dollar',
    '€': 'euro',
    '£': 'pound',
    '¥': 'yen yuan',
    '+': 'plus',
    '=': 'equals',
    '<': 'less than',
    '>': 'greater than',
  }
  return text.replace(/[%&@#$€£¥+=<>]/g, (match) => ` ${symbolMap[match] || match} `)
}

function removePunctuation(text: string): string {
  if (!text) return ''
  return text.replace(/[，。！？；：、""''《》【】（）]/g, ' ').replace(/\s+/g, ' ').trim()
}

interface ConversationSettings {
  interviewerId: string
  enableCamera: boolean
  topicMode: 'selected' | 'all' | 'free' | 'scenario'
  selectedTopics: string[]
  scenarioId?: string
  userRole?: string
}

export default function ConversationChatPage() {
  const router = useRouter()

  // Conversation state
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Settings
  const [settings, setSettings] = useState<ConversationSettings | null>(null)
  const [currentInterviewer, setCurrentInterviewer] = useState<string>(DEFAULT_INTERVIEWER)
  const [showInterviewerSelector, setShowInterviewerSelector] = useState(false)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Video stream
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Scenario mode
  const [scenarioInfo, setScenarioInfo] = useState<{
    scenarioId: string
    title: string
    objective: string
    userRole: string
    aiRole: string
    interviewerImage?: string
  } | null>(null)
  const [checkpoints, setCheckpoints] = useState<ScenarioCheckpoint[]>([])
  const [allCheckpointsCompleted, setAllCheckpointsCompleted] = useState(false)

  // Mobile UI state
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load settings
  useEffect(() => {
    const settingsStr = localStorage.getItem('conversationSettings')
    if (!settingsStr) {
      router.push('/conversation')
      return
    }

    try {
      const loadedSettings: ConversationSettings = JSON.parse(settingsStr)
      setSettings(loadedSettings)
      setCurrentInterviewer(loadedSettings.interviewerId)

      if (loadedSettings.enableCamera) {
        initializeCamera()
      }

      startConversation(loadedSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
      router.push('/conversation')
    }
  }, [])

  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setVideoStream(stream)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to initialize camera:', error)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [videoStream])

  // Sync video ref with stream
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream
    }
  }, [videoStream])

  // Preload TTS voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          console.log('✅ TTS voices loaded:', voices.length)
        }
      }
      loadVoices()
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [])

  // Get all available chapter IDs from API
  const getAllAvailableChapterIds = async (): Promise<string[]> => {
    try {
      const response = await fetch(`${getApiBase()}/api/lessons`)
      if (!response.ok) return []

      const lessons = await response.json()
      const chapterSet = new Set<string>()

      lessons.forEach((lesson: any) => {
        if (lesson.chapterId) {
          chapterSet.add(lesson.chapterId)
        }
      })

      return Array.from(chapterSet).sort((a, b) => {
        const numA = parseInt(a.replace('C', ''))
        const numB = parseInt(b.replace('C', ''))
        return numA - numB
      })
    } catch (error) {
      console.error('Error fetching available chapters:', error)
      return []
    }
  }

  // Start conversation with backend
  const startConversation = async (loadedSettings: ConversationSettings) => {
    setIsLoading(true)
    setError(null)

    try {
      let topics: string[] = []
      if (loadedSettings.topicMode === 'selected') {
        topics = loadedSettings.selectedTopics
      } else if (loadedSettings.topicMode === 'all') {
        topics = await getAllAvailableChapterIds()
      }

      const requestBody: any = {
        topics,
        topicMode: loadedSettings.topicMode,
        interviewerId: loadedSettings.interviewerId,
      }

      if (loadedSettings.topicMode === 'scenario') {
        requestBody.scenarioId = loadedSettings.scenarioId
        requestBody.userRole = loadedSettings.userRole
      }

      if (loadedSettings.topicMode === 'all' || loadedSettings.topicMode === 'selected') {
        const lessonHistory = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
        const completedLessons = lessonHistory.map((h: any) => h.lessonId)
        requestBody.completedLessons = completedLessons

        if (loadedSettings.topicMode === 'selected') {
          requestBody.selectedChapters = loadedSettings.selectedTopics || []
        }
      }

      const data = await fetchJson<{
        sessionId: string
        scenario?: any
        firstMessage?: { chinese: string; english: string }
        suggestions?: any[]
      }>('/api/conversation/start', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
      setSessionId(data.sessionId)

      if (data.scenario) {
        const scenarioData = await apiGetScenarioById(data.scenario.scenarioId)
        const fullScenario = scenarioData.scenario
        const aiRole = fullScenario.roles.find((r: any) => r.id !== data.scenario.userRole)

        if (aiRole?.interviewerId) {
          setCurrentInterviewer(aiRole.interviewerId)
        }

        setScenarioInfo({
          scenarioId: data.scenario.scenarioId,
          title: data.scenario.title,
          objective: data.scenario.objective,
          userRole: data.scenario.userRole,
          aiRole: data.scenario.aiRole,
          interviewerImage: aiRole?.interviewerImage,
        })
        setCheckpoints(data.scenario.checkpoints)
      }

      if (data.firstMessage) {
        const firstMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'instructor',
          chinese: data.firstMessage.chinese,
          english: data.firstMessage.english,
          timestamp: new Date(),
        }
        setMessages([firstMessage])

        const playFirstMessageTTS = async () => {
          let attempts = 0
          while (attempts < 20) {
            const voices = window.speechSynthesis.getVoices()
            if (voices.length > 0) {
              playTTS(data.firstMessage!.chinese)
              return
            }
            await new Promise(r => setTimeout(r, 100))
            attempts++
          }
          playTTS(data.firstMessage!.chinese)
        }
        playFirstMessageTTS()
      }

      if (data.suggestions) {
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
      setError('Failed to start conversation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // TTS playback
  const playTTS = (text: string) => {
    if (!text || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    let cleanText = removePinyin(text)
    cleanText = convertSymbolsToWords(cleanText)
    cleanText = removePunctuation(cleanText)

    if (!cleanText.trim()) return

    const voiceConfig = getInterviewerVoice(currentInterviewer)
    const voices = window.speechSynthesis.getVoices()

    let chineseVoice: SpeechSynthesisVoice | undefined

    if (voiceConfig.preferredVoiceName) {
      chineseVoice = voices.find(voice =>
        voice.name === voiceConfig.preferredVoiceName ||
        voice.name.includes(voiceConfig.preferredVoiceName!)
      )
    }

    if (!chineseVoice) {
      chineseVoice = voices.find(voice => voice.lang.includes(voiceConfig.lang))
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    if (chineseVoice) {
      utterance.voice = chineseVoice
    }
    utterance.lang = voiceConfig.lang
    utterance.rate = voiceConfig.rate
    utterance.pitch = voiceConfig.pitch
    utterance.volume = 1.0

    window.speechSynthesis.speak(utterance)
  }

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioMessage(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingError(null)
    } catch (error) {
      console.error('Failed to start recording:', error)
      setRecordingError('Failed to access microphone')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Send audio message
  const sendAudioMessage = async (audioBlob: Blob) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('sessionId', sessionId)
      formData.append('audio', audioBlob, 'recording.webm')

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const headers = new Headers()
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
      }

      const response = await fetch(`${getApiBase()}/api/conversation/message`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        chinese: data.userTranscript || '(No transcription)',
        transcript: data.userTranscript,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      if (data.scenarioProgress) {
        setCheckpoints(data.scenarioProgress.checkpoints)
        if (data.allCheckpointsCompleted && !allCheckpointsCompleted) {
          setAllCheckpointsCompleted(true)
        }
      }

      setTimeout(() => {
        const instructorMessage: Message = {
          id: `msg-${Date.now()}-instructor`,
          role: 'instructor',
          chinese: data.instructorReply.chinese,
          english: data.instructorReply.english,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, instructorMessage])

        if (data.suggestions) {
          setSuggestions(data.suggestions)
        }

        playTTS(data.instructorReply.chinese)
      }, 500)
    } catch (error) {
      console.error('Failed to send message:', error)
      setError('Failed to process your message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // End conversation
  const handleEndConversation = async () => {
    const confirm = window.confirm('Are you sure you want to end this conversation?')
    if (!confirm) return

    setIsLoading(true)

    try {
      if (!sessionId) {
        throw new Error('No active session found')
      }

      const data = await fetchJson<{
        reportId: string
        analysis: any
      }>('/api/conversation/end', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      })

      const conversationHistory = {
        sessionId,
        type: 'conversation',
        completedAt: new Date().toISOString(),
        messages: messages.length,
        reportId: data.reportId,
        settings,
        conversationData: {
          turns: messages.map(msg => ({
            role: msg.role,
            text: msg.chinese,
            timestamp: msg.timestamp,
          })),
          analysis: data.analysis,
        },
      }

      const historyStr = localStorage.getItem('conversationHistory') || '[]'
      const history = JSON.parse(historyStr)
      history.unshift(conversationHistory)
      localStorage.setItem('conversationHistory', JSON.stringify(history))

      router.push(`/conversation/report/${data.reportId}`)
    } catch (error: any) {
      console.error('Failed to end conversation:', error)
      setError('Failed to end conversation: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle interviewer change
  const handleSelectInterviewer = (interviewerId: string) => {
    setCurrentInterviewer(interviewerId)
    localStorage.setItem('selectedInterviewer', interviewerId)
    setShowInterviewerSelector(false)
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Header - Responsive */}
      <header className="flex-shrink-0 border-b bg-white px-4 py-3 sm:px-6 shadow-sm z-30">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {settings.topicMode === 'scenario' && scenarioInfo
                ? scenarioInfo.title
                : 'AI Conversation'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {settings.topicMode === 'free'
                ? 'Free Talk'
                : `${settings.topicMode === 'all' ? 'All' : settings.selectedTopics.length} Topics`}
            </p>
          </div>

          <button
            onClick={handleEndConversation}
            disabled={isLoading}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-red-500 px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors touch-manipulation"
          >
            <PhoneOff className="h-4 w-4" />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </header>

      {/* Main Content - Full screen interviewer with overlay chat */}
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        {/* Full Screen Interviewer Image */}
        {settings.topicMode === 'scenario' ? (
          <div className="absolute inset-0">
            <Image
              src={scenarioInfo?.interviewerImage ? `/interviewers/${scenarioInfo.interviewerImage}` : getInterviewerImagePath(currentInterviewer)}
              alt="AI Role"
              fill
              className="object-cover"
              priority
            />
            {scenarioInfo && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                <p className="text-xs sm:text-sm font-medium text-white">{scenarioInfo.aiRole}</p>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowInterviewerSelector(true)}
            className="group absolute inset-0"
          >
            <Image
              src={getInterviewerImagePath(currentInterviewer)}
              alt="AI Instructor"
              fill
              className="object-cover"
              priority
            />
            {/* Change instructor hint - top left */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-medium text-white">Tap to change</span>
            </div>
          </button>
        )}

        {/* User Video - Top Left Corner (moved from right to avoid overlap with chat) */}
        {settings.enableCamera && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
            <div className="relative h-20 w-28 sm:h-28 sm:w-40 overflow-hidden rounded-xl border-2 border-white/30 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 rounded-full bg-black/70 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs text-white">
                You
              </div>
            </div>
          </div>
        )}

        {/* Recording Button - Bottom Center */}
        <div className="absolute bottom-20 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
          <motion.button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isLoading || !sessionId}
            className={`
              relative h-16 w-16 sm:h-20 sm:w-20 rounded-full transition-all touch-manipulation
              ${isRecording
                ? 'bg-red-600 shadow-2xl shadow-red-500/50 scale-110'
                : 'bg-blue-600/90 backdrop-blur-sm shadow-xl hover:bg-blue-700 hover:scale-105'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            whileTap={{ scale: 1.1 }}
          >
            {isRecording ? (
              <MicOff className="h-6 w-6 sm:h-8 sm:w-8 text-white mx-auto" />
            ) : (
              <Mic className="h-6 w-6 sm:h-8 sm:w-8 text-white mx-auto" />
            )}

            {isRecording && (
              <motion.div
                className="absolute -inset-2 rounded-full border-4 border-red-400"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.button>

          <p className="mt-2 text-center text-xs sm:text-sm text-white drop-shadow-lg bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
            {isRecording ? 'Release to send' : 'Hold to speak'}
          </p>

          {recordingError && (
            <div className="mt-2 flex items-center gap-1 text-xs text-red-400 bg-black/70 px-3 py-1 rounded-lg">
              <AlertCircle className="h-3 w-3" />
              <span>{recordingError}</span>
            </div>
          )}
        </div>

        {/* Chat Overlay - Right side on desktop, Bottom on mobile */}
        {isMobile ? (
          /* Mobile: Bottom overlay chat panel */
          <div className="absolute bottom-0 left-0 right-0 z-10">
            {/* Toggle button */}
            <button
              onClick={() => setShowChatPanel(!showChatPanel)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-black/50 backdrop-blur-md border-t border-white/10 touch-manipulation"
            >
              <MessageSquare size={16} className="text-white/80" />
              <span className="text-sm font-medium text-white/90">
                {messages.length} messages
              </span>
              {showChatPanel ? (
                <ChevronDown size={16} className="text-white/60" />
              ) : (
                <ChevronUp size={16} className="text-white/60" />
              )}
            </button>

            {/* Expandable chat panel */}
            <AnimatePresence>
              {showChatPanel && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: '45vh' }}
                  exit={{ height: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="overflow-hidden"
                >
                  <DialogSidebar
                    messages={messages}
                    suggestions={suggestions}
                    onPlayTTS={playTTS}
                    isLoading={isLoading}
                    currentInterviewer={currentInterviewer}
                    scenarioInfo={settings.topicMode === 'scenario' ? scenarioInfo : null}
                    checkpoints={settings.topicMode === 'scenario' ? checkpoints : undefined}
                    transparent
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Desktop: Right side overlay chat panel */
          <div className="absolute top-0 right-0 bottom-0 w-[380px] xl:w-[420px] z-10">
            <DialogSidebar
              messages={messages}
              suggestions={suggestions}
              onPlayTTS={playTTS}
              isLoading={isLoading}
              currentInterviewer={currentInterviewer}
              scenarioInfo={settings.topicMode === 'scenario' ? scenarioInfo : null}
              checkpoints={settings.topicMode === 'scenario' ? checkpoints : undefined}
              transparent
            />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded-full"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Interviewer Selector Modal */}
      {showInterviewerSelector && (
        <InterviewerSelector
          currentInterviewer={currentInterviewer}
          onSelect={handleSelectInterviewer}
          onClose={() => setShowInterviewerSelector(false)}
        />
      )}

      {/* Completion prompt for scenario mode */}
      {settings.topicMode === 'scenario' && (
        <CompletionPrompt
          isAllCompleted={allCheckpointsCompleted}
          onContinue={() => setAllCheckpointsCompleted(false)}
          onEnd={handleEndConversation}
        />
      )}
    </div>
  )
}
