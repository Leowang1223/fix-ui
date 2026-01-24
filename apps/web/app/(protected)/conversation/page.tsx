'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Video, VideoOff, CheckCircle2, AlertCircle, MessageSquare,
  BookOpen, Sparkles, Theater, ChevronRight, Check, ArrowLeft
} from 'lucide-react'
import { InterviewerSelector, getInterviewerImagePath, DEFAULT_INTERVIEWER } from '../lesson/components/InterviewerSelector'
import ScenarioSelector from './components/ScenarioSelector'
import RoleSelector from './components/RoleSelector'
import { apiGetScenarioById, type Scenario } from '@/lib/api'

interface LessonHistoryEntry {
  sessionId: string
  lessonId: string
  lessonTitle: string
  completedAt: string
}

interface CompletedChapter {
  chapterId: string
  title: string
  lessonCount: number
}

// 所有可用章節列表
const ALL_CHAPTERS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'] as const

// 章節標題對照
const CHAPTER_TITLES: Record<string, string> = {
  'C1': 'Basic Greetings',
  'C2': 'Daily Conversations',
  'C3': 'Numbers & Time',
  'C4': 'Food & Dining',
  'C5': 'Shopping',
  'C6': 'Transportation',
  'C7': 'Work & Office',
  'C8': 'Health & Hospital',
  'C9': 'Entertainment',
  'C10': 'Advanced Topics'
}

// 三種對話模式定義
type ConversationMode = 'practice' | 'free' | 'scenario'

interface ModeOption {
  id: ConversationMode
  title: string
  titleZh: string
  description: string
  icon: typeof BookOpen
  color: string
  bgColor: string
  borderColor: string
}

const CONVERSATION_MODES: ModeOption[] = [
  {
    id: 'practice',
    title: 'Course Practice',
    titleZh: '課程練習',
    description: 'Review vocabulary and phrases from completed lessons',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500'
  },
  {
    id: 'free',
    title: 'Free Talk',
    titleZh: '自由對話',
    description: 'Open conversation on any topic you choose',
    icon: Sparkles,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500'
  },
  {
    id: 'scenario',
    title: 'Scenario Mode',
    titleZh: '情境模擬',
    description: 'Role-play real-life situations like ordering food',
    icon: Theater,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500'
  }
]

export default function ConversationSetupPage() {
  const router = useRouter()

  // Permission states
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [enableCamera, setEnableCamera] = useState(false)

  // Chapter selection
  const [completedChapters, setCompletedChapters] = useState<CompletedChapter[]>([])
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [useAllChapters, setUseAllChapters] = useState(true)

  // 簡化為 3 種模式
  const [topicMode, setTopicMode] = useState<ConversationMode>('practice')

  // Interviewer selection
  const [currentInterviewer, setCurrentInterviewer] = useState<string>(DEFAULT_INTERVIEWER)
  const [showInterviewerSelector, setShowInterviewerSelector] = useState(false)

  // Scenario mode
  const [showScenarioSelector, setShowScenarioSelector] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  // Track if any lessons completed
  const [hasCompletedLessons, setHasCompletedLessons] = useState(false)
  const [completedLessonCount, setCompletedLessonCount] = useState(0)

  // Load completed lessons from history
  useEffect(() => {
    const savedInterviewer = localStorage.getItem('selectedInterviewer')
    if (savedInterviewer) {
      setCurrentInterviewer(savedInterviewer)
    }

    // 建立完成度對照表
    const completionMap: Record<string, number> = {}

    const historyStr = localStorage.getItem('lessonHistory')
    if (historyStr) {
      try {
        const history: LessonHistoryEntry[] = JSON.parse(historyStr)
        setHasCompletedLessons(history.length > 0)
        setCompletedLessonCount(history.length)

        // 章節 ID 驗證正規表達式：只接受 C + 數字格式
        const VALID_CHAPTER_PATTERN = /^C\d{1,2}$/

        history.forEach(entry => {
          const chapterId = entry.lessonId.split('-')[0]

          // 只計算有效的章節 ID（過濾掉 L10, L3 等舊格式）
          if (chapterId && VALID_CHAPTER_PATTERN.test(chapterId)) {
            completionMap[chapterId] = (completionMap[chapterId] || 0) + 1
          }
        })
      } catch (error) {
        console.error('Failed to load lesson history:', error)
      }
    }

    // 建立章節列表：顯示所有章節並合併完成度資料
    const chapters = ALL_CHAPTERS.map(chapterId => ({
      chapterId,
      title: CHAPTER_TITLES[chapterId],
      lessonCount: completionMap[chapterId] || 0
    }))

    setCompletedChapters(chapters)
  }, [])

  // Auto request mic permission on mount
  useEffect(() => {
    const autoRequestMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
        setMicPermission('granted')
      } catch {
        setMicPermission('pending')
      }
    }
    autoRequestMic()
  }, [])

  // Request microphone permission
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setMicPermission('granted')
    } catch (error) {
      console.error('Microphone permission denied:', error)
      setMicPermission('denied')
    }
  }

  // Toggle camera enable
  const toggleCamera = async () => {
    if (!enableCamera && cameraPermission === 'pending') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop())
        setCameraPermission('granted')
        setEnableCamera(true)
      } catch (error) {
        console.error('Camera permission denied:', error)
        setCameraPermission('denied')
      }
    } else if (!enableCamera && cameraPermission === 'granted') {
      setEnableCamera(true)
    } else {
      setEnableCamera(!enableCamera)
    }
  }

  // Handle chapter selection
  const toggleChapter = (chapterId: string) => {
    setSelectedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    )
  }

  // Handle scenario selection
  const handleScenarioSelect = async (scenarioId: string) => {
    try {
      const { scenario } = await apiGetScenarioById(scenarioId)
      setSelectedScenario(scenario)
      setShowScenarioSelector(false)
      setShowRoleSelector(true)
    } catch (error) {
      console.error('Failed to load scenario:', error)
      alert('Failed to load scenario. Please try again.')
    }
  }

  // Handle role selection
  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId)
    setShowRoleSelector(false)
  }

  // Handle mode selection
  const handleModeSelect = (mode: ConversationMode) => {
    setTopicMode(mode)
    if (mode === 'scenario') {
      setShowScenarioSelector(true)
    }
  }

  // Check if can start
  const canStart = () => {
    if (micPermission !== 'granted') return false

    if (topicMode === 'practice') {
      if (useAllChapters) {
        return hasCompletedLessons
      } else {
        return selectedChapters.length > 0
      }
    }

    if (topicMode === 'scenario') {
      return selectedScenario && selectedRole
    }

    return true // free mode always ok
  }

  // Handle start conversation
  const handleStartConversation = () => {
    if (micPermission !== 'granted') {
      alert('Microphone permission is required to start conversation.')
      return
    }

    // Validate practice mode
    if (topicMode === 'practice') {
      if (useAllChapters && !hasCompletedLessons) {
        alert('Please complete at least one lesson first.')
        return
      }
      if (!useAllChapters && selectedChapters.length === 0) {
        alert('Please select at least one chapter.')
        return
      }
    }

    // Validate scenario mode
    if (topicMode === 'scenario' && (!selectedScenario || !selectedRole)) {
      alert('Please select a scenario and role first.')
      return
    }

    // 轉換為後端相容格式
    let backendTopicMode: 'all' | 'selected' | 'free' | 'scenario'
    if (topicMode === 'practice') {
      backendTopicMode = useAllChapters ? 'all' : 'selected'
    } else {
      backendTopicMode = topicMode
    }

    // Save settings to localStorage
    const conversationSettings = {
      interviewerId: currentInterviewer,
      enableCamera,
      topicMode: backendTopicMode,
      selectedTopics: (!useAllChapters && topicMode === 'practice') ? selectedChapters : [],
      scenarioId: topicMode === 'scenario' ? selectedScenario?.scenario_id : undefined,
      userRole: topicMode === 'scenario' ? selectedRole : undefined,
    }
    localStorage.setItem('conversationSettings', JSON.stringify(conversationSettings))

    // Navigate to conversation chat page
    router.push('/conversation/chat')
  }

  const selectedModeData = CONVERSATION_MODES.find(m => m.id === topicMode)

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header - More compact on mobile */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors touch-manipulation"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">AI Conversation</h1>
              <p className="text-xs sm:text-sm text-slate-500 truncate">Practice speaking Chinese</p>
            </div>

            {/* Instructor avatar in header */}
            <button
              onClick={() => setShowInterviewerSelector(true)}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-colors touch-manipulation"
            >
              <Image
                src={getInterviewerImagePath(currentInterviewer)}
                alt="Instructor"
                fill
                className="object-cover"
              />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto">

        {/* Microphone Permission - Compact card */}
        {micPermission !== 'granted' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Mic className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900">Microphone Required</p>
                <p className="text-xs text-amber-700">Enable to start conversation</p>
              </div>
              <button
                onClick={requestMicPermission}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors touch-manipulation"
              >
                Enable
              </button>
            </div>
          </motion.div>
        )}

        {/* Mode Selection - 3 beautiful cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
            Choose Mode
          </h2>

          <div className="grid gap-3">
            {CONVERSATION_MODES.map((mode) => {
              const isSelected = topicMode === mode.id
              const Icon = mode.icon

              return (
                <motion.button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className={`relative w-full text-left rounded-2xl border-2 p-4 sm:p-5 transition-all touch-manipulation ${
                    isSelected
                      ? `${mode.borderColor} ${mode.bgColor}`
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${mode.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${mode.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-base sm:text-lg font-bold ${isSelected ? mode.color : 'text-slate-900'}`}>
                          {mode.titleZh}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-400">{mode.title}</span>
                      </div>
                      <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{mode.description}</p>
                    </div>

                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      isSelected ? mode.bgColor : 'bg-slate-100'
                    }`}>
                      {isSelected ? (
                        <Check className={`w-4 h-4 ${mode.color}`} />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Mode-specific options */}
        <AnimatePresence mode="wait">
          {/* Practice Mode Options */}
          {topicMode === 'practice' && (
            <motion.div
              key="practice-options"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Select Chapters</h3>

                {/* All chapters toggle */}
                <button
                  onClick={() => setUseAllChapters(!useAllChapters)}
                  className={`w-full flex items-center justify-between rounded-xl border-2 p-3 transition-all touch-manipulation ${
                    useAllChapters
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      useAllChapters ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    }`}>
                      {useAllChapters && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      All completed lessons
                    </span>
                  </div>
                  {hasCompletedLessons && (
                    <span className="text-xs text-blue-600 font-medium">
                      {completedLessonCount} lessons
                    </span>
                  )}
                </button>

                {/* Chapter grid - shown when not using all */}
                {!useAllChapters && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  >
                    {completedChapters.map(chapter => {
                      const isSelected = selectedChapters.includes(chapter.chapterId)
                      const hasProgress = chapter.lessonCount > 0

                      return (
                        <button
                          key={chapter.chapterId}
                          onClick={() => toggleChapter(chapter.chapterId)}
                          className={`relative rounded-xl border-2 p-3 text-center transition-all touch-manipulation ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : hasProgress
                                ? 'border-slate-200 bg-white hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 opacity-50'
                          }`}
                        >
                          <div className={`text-lg font-bold ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                            {chapter.chapterId}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{chapter.title}</div>
                          {hasProgress && (
                            <div className="mt-1 text-[10px] text-emerald-600 font-medium">
                              {chapter.lessonCount} done
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </motion.div>
                )}

                {!hasCompletedLessons && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                    Complete some lessons first to use Course Practice mode.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Free Talk Info */}
          {topicMode === 'free' && (
            <motion.div
              key="free-info"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">
                  <strong>Free Talk Mode</strong> - The AI will have open conversations with you on any topic.
                  Great for practicing natural conversation flow!
                </p>
              </div>
            </motion.div>
          )}

          {/* Scenario Mode Info */}
          {topicMode === 'scenario' && (
            <motion.div
              key="scenario-info"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {selectedScenario && selectedRole ? (
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-purple-900">{selectedScenario.title}</p>
                      <p className="text-xs text-purple-700 mt-1">{selectedScenario.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-purple-700">Your role:</span>
                        <span className="text-xs bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-medium">
                          {selectedScenario.roles.find(r => r.id === selectedRole)?.name}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowScenarioSelector(true)}
                      className="text-xs text-purple-600 hover:text-purple-800 underline touch-manipulation"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowScenarioSelector(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-6 text-center hover:border-purple-400 transition-colors touch-manipulation"
                >
                  <Theater className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                  <p className="text-sm font-medium text-purple-700">Select a Scenario</p>
                  <p className="text-xs text-purple-500 mt-1">Choose a real-life situation to practice</p>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional: Camera toggle */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <button
            onClick={toggleCamera}
            className="w-full flex items-center justify-between touch-manipulation"
          >
            <div className="flex items-center gap-3">
              {enableCamera ? (
                <Video className="w-5 h-5 text-blue-600" />
              ) : (
                <VideoOff className="w-5 h-5 text-slate-400" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">Camera</p>
                <p className="text-xs text-slate-500">Optional - show yourself</p>
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors ${
              enableCamera ? 'bg-blue-500' : 'bg-slate-200'
            }`}>
              <motion.div
                className="w-5 h-5 rounded-full bg-white shadow-sm mt-1"
                animate={{ x: enableCamera ? 26 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>
        </div>

        {/* Start Button - Fixed on mobile */}
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 sm:px-6 lg:relative lg:px-0 lg:bottom-auto">
          <div className="max-w-2xl mx-auto">
            <motion.button
              onClick={handleStartConversation}
              disabled={!canStart()}
              className={`w-full rounded-2xl py-4 sm:py-5 text-base sm:text-lg font-bold shadow-lg transition-all touch-manipulation ${
                canStart()
                  ? `bg-gradient-to-r ${
                      topicMode === 'practice' ? 'from-blue-600 to-blue-500' :
                      topicMode === 'free' ? 'from-emerald-600 to-emerald-500' :
                      'from-purple-600 to-purple-500'
                    } text-white hover:shadow-xl active:scale-[0.98]`
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              whileTap={canStart() ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Start {selectedModeData?.titleZh}</span>
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Interviewer Selector Modal */}
      {showInterviewerSelector && (
        <InterviewerSelector
          currentInterviewer={currentInterviewer}
          onSelect={(id) => {
            setCurrentInterviewer(id)
            localStorage.setItem('selectedInterviewer', id)
            setShowInterviewerSelector(false)
          }}
          onClose={() => setShowInterviewerSelector(false)}
        />
      )}

      {/* Scenario Selector Modal */}
      {showScenarioSelector && (
        <ScenarioSelector
          onSelect={handleScenarioSelect}
          onClose={() => setShowScenarioSelector(false)}
        />
      )}

      {/* Role Selector Modal */}
      {showRoleSelector && selectedScenario && (
        <RoleSelector
          scenario={selectedScenario}
          onSelect={handleRoleSelect}
          onBack={() => {
            setShowRoleSelector(false)
            setShowScenarioSelector(true)
          }}
        />
      )}
    </div>
  )
}
