'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mic, MicOff, PhoneOff, Loader2, AlertCircle } from 'lucide-react'
import { DialogSidebar, type Message, type Suggestion } from '../components/DialogSidebar'
import { InterviewerSelector, getInterviewerImagePath, getInterviewerVoice, DEFAULT_INTERVIEWER } from '../../lesson/components/InterviewerSelector'
import ProgressTracker from '../components/ProgressTracker'
import CompletionPrompt from '../components/CompletionPrompt'
import { type ScenarioCheckpoint, apiGetScenarioById, fetchJson, getApiBase } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// TTS utility functions (copied from lesson page)
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

  // Track if first message needs manual play (for browser autoplay restrictions)
  const [needsManualPlay, setNeedsManualPlay] = useState(false)
  const [firstMessageText, setFirstMessageText] = useState<string | null>(null)

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

      // Initialize camera if enabled
      if (loadedSettings.enableCamera) {
        initializeCamera()
      }

      // Start conversation
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

  // Preload TTS voices on page mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      console.log('🎤 Initializing TTS voice preload...')

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          console.log('✅ TTS voices loaded:', voices.length, 'voices available')
          // Log Chinese voices for debugging
          const chineseVoices = voices.filter(v => v.lang.includes('zh'))
          console.log('🇨🇳 Chinese voices:', chineseVoices.map(v => v.name).join(', '))
        }
      }

      // Try loading immediately (some browsers have voices ready)
      loadVoices()

      // Listen for the event when voices become available
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
      if (!response.ok) {
        console.error('Failed to fetch lessons from API')
        return []
      }

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

  // Get all completed chapter IDs from lesson history
  const getAllCompletedChapterIds = (): string[] => {
    if (typeof window === 'undefined') return []

    try {
      const historyStr = localStorage.getItem('lessonHistory')
      if (!historyStr) return []

      const history: any[] = JSON.parse(historyStr)
      const chapterSet = new Set<string>()

      history.forEach(entry => {
        if (entry.lessonId) {
          let chapterId: string | null = null

          // Handle different lesson ID formats:
          // - New format: "C1-L01" -> extract "C1"
          // - Old format: "L10" -> map to chapter based on lesson number
          if (entry.lessonId.includes('-')) {
            // New format: C1-L01
            chapterId = entry.lessonId.split('-')[0]
          } else if (entry.lessonId.match(/^L(\d+)$/)) {
            // Old format: L10 -> map to C1
            // Assuming L1-L10 = C1, L11-L20 = C2, etc.
            const lessonNum = parseInt(entry.lessonId.replace('L', ''))
            const chapterNum = Math.ceil(lessonNum / 10)
            chapterId = `C${chapterNum}`
          }

          // Only add valid chapter IDs (C1, C2, etc.)
          if (chapterId && chapterId.match(/^C\d+$/)) {
            chapterSet.add(chapterId)
          }
        }
      })

      const chapters = Array.from(chapterSet)
      console.log('Extracted chapter IDs:', chapters)
      return chapters
    } catch (error) {
      console.error('Failed to load completed chapters:', error)
      return []
    }
  }

  // Start conversation with backend
  const startConversation = async (loadedSettings: ConversationSettings) => {
    setIsLoading(true)
    setError(null)

    try {
      // Determine topics to send
      let topics: string[] = []
      if (loadedSettings.topicMode === 'selected') {
        topics = loadedSettings.selectedTopics
      } else if (loadedSettings.topicMode === 'all') {
        // Fetch all available chapters from API
        topics = await getAllAvailableChapterIds()
        console.log('📚 All available chapters:', topics)
      }

      const requestBody: any = {
        topics,
        topicMode: loadedSettings.topicMode,
        interviewerId: loadedSettings.interviewerId,
      }

      // Add scenario mode parameters
      if (loadedSettings.topicMode === 'scenario') {
        requestBody.scenarioId = loadedSettings.scenarioId
        requestBody.userRole = loadedSettings.userRole
      }

      // Add review mode parameters
      if (loadedSettings.topicMode === 'all') {
        // 從 localStorage 讀取已完成課程清單
        const lessonHistory = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
        const completedLessons = lessonHistory.map((h: any) => h.lessonId)
        requestBody.completedLessons = completedLessons
        console.log('📚 Review mode (all): Sending', completedLessons.length, 'completed lessons')
      } else if (loadedSettings.topicMode === 'selected') {
        // 從 localStorage 讀取已完成課程清單
        const lessonHistory = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
        const allCompletedLessons = lessonHistory.map((h: any) => h.lessonId)

        // 過濾出屬於選定章節的已完成課程
        const selectedChaptersSet = new Set(loadedSettings.selectedTopics)
        const completedLessonsInSelectedChapters = allCompletedLessons.filter((lessonId: string) => {
          const chapterId = lessonId.split('-')[0]
          return selectedChaptersSet.has(chapterId)
        })

        requestBody.selectedChapters = loadedSettings.selectedTopics || []
        requestBody.completedLessons = completedLessonsInSelectedChapters
        console.log('📚 Review mode (selected): Sending chapters', requestBody.selectedChapters)
        console.log('📚 Review mode (selected): Found', completedLessonsInSelectedChapters.length, 'completed lessons in these chapters')
      }

      const data = await fetchJson<{
        sessionId: string
        scenario?: any
        firstMessage?: { chinese: string; english: string }
        suggestions?: any[]
        reviewMode?: any
      }>('/api/conversation/start', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
      setSessionId(data.sessionId)

      // Set scenario info and checkpoints if in scenario mode
      if (data.scenario) {
        // Fetch full scenario data to get interviewer information
        const scenarioData = await apiGetScenarioById(data.scenario.scenarioId)
        const fullScenario = scenarioData.scenario

        // Find the AI role
        const aiRole = fullScenario.roles.find((r: any) => r.id !== data.scenario.userRole)

        // Auto-set interviewer if AI role has interviewerId
        if (aiRole?.interviewerId) {
          setCurrentInterviewer(aiRole.interviewerId)
          console.log(`🎭 Auto-selected interviewer: ${aiRole.interviewerId} for role ${aiRole.id}`)
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

      // Handle first message - may be null if user speaks first
      if (data.firstMessage) {
        // AI speaks first
        const firstMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'instructor',
          chinese: data.firstMessage.chinese,
          english: data.firstMessage.english,
          timestamp: new Date(),
        }
        setMessages([firstMessage])

        // Play TTS with dynamic voice detection
        console.log('🎬 Preparing to play first message TTS...')
        const chineseText = firstMessage.chinese
        const playFirstMessageTTS = async () => {
          let attempts = 0
          const maxAttempts = 20  // 最多等待 2 秒

          while (attempts < maxAttempts) {
            const voices = window.speechSynthesis.getVoices()
            if (voices.length > 0) {
              console.log('✅ TTS voices loaded, playing first message')
              playTTS(chineseText)
              return
            }
            await new Promise(r => setTimeout(r, 100))
            attempts++
          }

          // 超時仍播放，使用默認聲音
          console.warn('⚠️ TTS voices not ready after 2s, playing with default voice')
          playTTS(chineseText)
        }

        playFirstMessageTTS()
      } else {
        // User speaks first - no initial message
        setMessages([])
        console.log('👤 User should speak first')
      }

      // Set initial suggestions
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

  // TTS playback with interviewer voice
  const playTTS = (text: string) => {
    if (!text || !('speechSynthesis' in window)) {
      console.log('⚠️ TTS unavailable: text or speechSynthesis missing')
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    // Clean the text
    let cleanText = removePinyin(text)
    cleanText = convertSymbolsToWords(cleanText)
    cleanText = removePunctuation(cleanText)

    if (!cleanText.trim()) {
      console.log('⚠️ TTS skipped: no text after cleaning')
      return
    }

    // Get voices (should already be loaded from useEffect)
    const voiceConfig = getInterviewerVoice(currentInterviewer)
    const voices = window.speechSynthesis.getVoices()

    if (voices.length === 0) {
      console.warn('⚠️ TTS voices not loaded yet, speech may use default voice')
    }

    // Try to find preferred Chinese voice
    let chineseVoice: SpeechSynthesisVoice | undefined

    if (voiceConfig.preferredVoiceName) {
      const preferredName = voiceConfig.preferredVoiceName
      chineseVoice = voices.find(voice =>
        voice.name === preferredName ||
        voice.name.includes(preferredName)
      )
    }

    if (!chineseVoice) {
      chineseVoice = voices.find(voice => voice.lang.includes(voiceConfig.lang))
    }

    // Create and configure utterance
    const utterance = new SpeechSynthesisUtterance(cleanText)
    if (chineseVoice) {
      utterance.voice = chineseVoice
      console.log('🔊 Using voice:', chineseVoice.name)
    } else {
      console.log('🔊 Using default voice (no Chinese voice found)')
    }
    utterance.lang = voiceConfig.lang
    utterance.rate = voiceConfig.rate
    utterance.pitch = voiceConfig.pitch
    utterance.volume = 1.0

    // Log and play
    console.log('🔊 Playing TTS:', cleanText.substring(0, 30) + '...')
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

  // Send audio message to backend
  const sendAudioMessage = async (audioBlob: Blob) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('sessionId', sessionId)
      formData.append('audio', audioBlob, 'recording.webm')

      // Get Supabase session for authentication
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

      // Add user message
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        chinese: data.userTranscript || '(No transcription)',
        transcript: data.userTranscript,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      // Update checkpoint progress if in scenario mode
      if (data.scenarioProgress) {
        setCheckpoints(data.scenarioProgress.checkpoints)
        // Check if all checkpoints are completed
        if (data.allCheckpointsCompleted && !allCheckpointsCompleted) {
          setAllCheckpointsCompleted(true)
        }
      }

      // Add instructor response
      setTimeout(() => {
        const instructorMessage: Message = {
          id: `msg-${Date.now()}-instructor`,
          role: 'instructor',
          chinese: data.instructorReply.chinese,
          english: data.instructorReply.english,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, instructorMessage])

        // Update suggestions
        if (data.suggestions) {
          setSuggestions(data.suggestions)
        }

        // Play TTS for instructor response
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
      // Check if session exists
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

      // Save to history with conversation turns
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

      // Navigate to report page
      router.push(`/conversation/report/${data.reportId}`)
    } catch (error: any) {
      console.error('Failed to end conversation:', error)
      if (error.message.includes('session') || error.message.includes('SESSION')) {
        setError('Session expired. Your conversation data has been lost. Please start a new conversation.')
      } else {
        setError('Failed to end conversation: ' + error.message)
      }
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
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <div className="border-b bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Conversation</h1>
            <p className="text-sm text-gray-500">
              {settings.topicMode === 'scenario' && scenarioInfo
                ? scenarioInfo.title
                : settings.topicMode === 'free'
                ? 'Free Talk'
                : `${settings.topicMode === 'all' ? 'All' : settings.selectedTopics.length} Topics`}
            </p>
          </div>

          <button
            onClick={handleEndConversation}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <PhoneOff className="h-4 w-4" />
            <span>End Conversation</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video Area (60%) */}
        <div className="relative flex w-3/5 flex-col bg-gray-900">
          {/* Instructor - Fill entire area */}
          {settings.topicMode === 'scenario' ? (
            /* Scenario mode: Fixed interviewer, no selection */
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src={scenarioInfo?.interviewerImage ? `/interviewers/${scenarioInfo.interviewerImage}` : getInterviewerImagePath(currentInterviewer)}
                alt="AI Role"
                fill
                className="object-cover"
                priority
              />
              {scenarioInfo?.interviewerImage && (
                <div className="absolute bottom-4 left-4 bg-blue-900/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-blue-300">
                      <Image
                        src={`/interviewers/${scenarioInfo.interviewerImage}`}
                        alt="AI Role"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">AI Role</p>
                      <p className="text-xs text-blue-200">
                        {scenarioInfo.aiRole}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Normal mode: Clickable interviewer selector */
            <button
              onClick={() => setShowInterviewerSelector(true)}
              className="group relative h-full w-full overflow-hidden"
            >
              <Image
                src={getInterviewerImagePath(currentInterviewer)}
                alt="AI Instructor"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/30 flex items-center justify-center">
                <span className="text-sm font-medium text-white opacity-0 group-hover:opacity-100">
                  Change Instructor
                </span>
              </div>
            </button>
          )}

          {/* User Video - Top Right Corner (if enabled) */}
          {settings.enableCamera && (
            <div className="absolute top-4 right-4 z-10">
              <div className="relative h-32 w-44 overflow-hidden rounded-xl border-2 border-white/30 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                  You
                </div>
              </div>
            </div>
          )}

          {/* Recording Button - Bottom Center Overlay */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isLoading || !sessionId}
              className={`group relative h-20 w-20 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-600 shadow-2xl shadow-red-500/50 scale-110'
                  : 'bg-blue-600 shadow-xl hover:bg-blue-700 hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8 text-white mx-auto" />
              ) : (
                <Mic className="h-8 w-8 text-white mx-auto" />
              )}

              {isRecording && (
                <div className="absolute -inset-2 rounded-full border-4 border-red-400 animate-ping" />
              )}
            </button>

            <p className="mt-3 text-center text-sm text-white drop-shadow-lg">
              {isRecording ? 'Release to send...' : 'Hold to speak'}
            </p>

            {recordingError && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-red-400 bg-black/50 px-3 py-1 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{recordingError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Dialog Sidebar (40%) */}
        <div className="w-2/5 border-l border-gray-200">
          <DialogSidebar
            messages={messages}
            suggestions={suggestions}
            onPlayTTS={playTTS}
            isLoading={isLoading}
            currentInterviewer={currentInterviewer}
            scenarioInfo={settings.topicMode === 'scenario' ? scenarioInfo : null}
            checkpoints={settings.topicMode === 'scenario' ? checkpoints : undefined}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border-t border-red-200 bg-red-50 px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
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

      {/* Auto-completion prompt for scenario mode */}
      {settings.topicMode === 'scenario' && (
        <CompletionPrompt
          isAllCompleted={allCheckpointsCompleted}
          onContinue={() => setAllCheckpointsCompleted(false)} // 關閉提示，繼續對話
          onEnd={handleEndConversation}
        />
      )}
    </div>
  )
}
