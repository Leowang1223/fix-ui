'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Video, VideoOff, MessageSquare,
  BookOpen, Sparkles, Theater, ChevronRight, Check, ArrowLeft, Loader2
} from 'lucide-react'
import { InterviewerSelector, getInterviewerImagePath, DEFAULT_INTERVIEWER } from '../lesson/components/InterviewerSelector'
import { apiGetScenarios, apiGetScenarioById, type Scenario } from '@/lib/api'
import { PageGuide } from '@/components/onboarding'

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

const ALL_CHAPTERS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'] as const

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

type ConversationMode = 'practice' | 'free' | 'scenario'

interface ModeOption {
  id: ConversationMode
  title: string
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
    description: 'Review vocabulary and phrases from completed lessons',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500'
  },
  {
    id: 'free',
    title: 'Free Talk',
    description: 'Open conversation on any topic you choose',
    icon: Sparkles,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500'
  },
  {
    id: 'scenario',
    title: 'Scenario Mode',
    description: 'Role-play real-life situations like ordering food',
    icon: Theater,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500'
  }
]

const DIFFICULTY_COLORS: Record<string, string> = {
  'A0-A1': 'bg-green-100 text-green-800',
  'A2-B1': 'bg-yellow-100 text-yellow-800',
  'B2+': 'bg-red-100 text-red-800'
}

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

  // Mode
  const [topicMode, setTopicMode] = useState<ConversationMode>('practice')

  // Interviewer selection
  const [currentInterviewer, setCurrentInterviewer] = useState<string>(DEFAULT_INTERVIEWER)
  const [showInterviewerSelector, setShowInterviewerSelector] = useState(false)

  // Scenario mode - inline flow
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
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

    const completionMap: Record<string, number> = {}
    const historyStr = localStorage.getItem('lessonHistory')
    if (historyStr) {
      try {
        const history: LessonHistoryEntry[] = JSON.parse(historyStr)
        setHasCompletedLessons(history.length > 0)
        setCompletedLessonCount(history.length)

        const VALID_CHAPTER_PATTERN = /^C\d{1,2}$/
        history.forEach(entry => {
          const chapterId = entry.lessonId.split('-')[0]
          if (chapterId && VALID_CHAPTER_PATTERN.test(chapterId)) {
            completionMap[chapterId] = (completionMap[chapterId] || 0) + 1
          }
        })
      } catch (error) {
        console.error('Failed to load lesson history:', error)
      }
    }

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

  // Load scenarios when scenario mode is selected
  useEffect(() => {
    if (topicMode === 'scenario' && scenarios.length === 0 && !scenariosLoading) {
      loadScenarios()
    }
  }, [topicMode])

  async function loadScenarios() {
    try {
      setScenariosLoading(true)
      const { scenarios: data } = await apiGetScenarios()
      setScenarios(data)
    } catch (error) {
      console.error('Failed to load scenarios:', error)
    } finally {
      setScenariosLoading(false)
    }
  }

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

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    )
  }

  // Handle inline scenario selection
  const handleScenarioClick = async (scenario: Scenario) => {
    if (selectedScenario?.scenario_id === scenario.scenario_id) {
      // Toggle off
      setSelectedScenario(null)
      setSelectedRole(null)
      return
    }
    // If scenario doesn't have full data (roles), fetch it
    if (!scenario.roles || scenario.roles.length === 0) {
      try {
        const { scenario: fullScenario } = await apiGetScenarioById(scenario.scenario_id)
        setSelectedScenario(fullScenario)
      } catch {
        setSelectedScenario(scenario)
      }
    } else {
      setSelectedScenario(scenario)
    }
    setSelectedRole(null)
  }

  const handleModeSelect = (mode: ConversationMode) => {
    setTopicMode(mode)
    // Reset scenario selection when switching modes
    if (mode !== 'scenario') {
      setSelectedScenario(null)
      setSelectedRole(null)
    }
  }

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

    return true
  }

  const handleStartConversation = () => {
    if (micPermission !== 'granted') {
      alert('Microphone permission is required to start conversation.')
      return
    }

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

    if (topicMode === 'scenario' && (!selectedScenario || !selectedRole)) {
      alert('Please select a scenario and role first.')
      return
    }

    let backendTopicMode: 'all' | 'selected' | 'free' | 'scenario'
    if (topicMode === 'practice') {
      backendTopicMode = useAllChapters ? 'all' : 'selected'
    } else {
      backendTopicMode = topicMode
    }

    const conversationSettings = {
      interviewerId: currentInterviewer,
      enableCamera,
      topicMode: backendTopicMode,
      selectedTopics: (!useAllChapters && topicMode === 'practice') ? selectedChapters : [],
      scenarioId: topicMode === 'scenario' ? selectedScenario?.scenario_id : undefined,
      userRole: topicMode === 'scenario' ? selectedRole : undefined,
    }
    localStorage.setItem('conversationSettings', JSON.stringify(conversationSettings))

    router.push('/conversation/chat')
  }

  const selectedModeData = CONVERSATION_MODES.find(m => m.id === topicMode)

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
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
              <p className="text-xs sm:text-sm text-slate-500 truncate">Practice speaking Chinese with AI</p>
            </div>

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

        {/* Microphone Permission */}
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

        {/* Mode Selection */}
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
                      <span className={`text-base sm:text-lg font-bold ${isSelected ? mode.color : 'text-slate-900'}`}>
                        {mode.title}
                      </span>
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

          {/* Scenario Mode - Inline combined flow */}
          {topicMode === 'scenario' && (
            <motion.div
              key="scenario-options"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Choose a Scenario & Role</h3>

                {scenariosLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    <span className="ml-2 text-sm text-slate-500">Loading scenarios...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scenarios.map(scenario => {
                      const isExpanded = selectedScenario?.scenario_id === scenario.scenario_id

                      return (
                        <div key={scenario.scenario_id} className="rounded-xl border border-slate-200 overflow-hidden">
                          {/* Scenario card */}
                          <button
                            onClick={() => handleScenarioClick(scenario)}
                            className={`w-full text-left p-3 sm:p-4 transition-all touch-manipulation ${
                              isExpanded ? 'bg-purple-50 border-b border-purple-100' : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-slate-900">{scenario.title}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${DIFFICULTY_COLORS[scenario.difficulty] || 'bg-slate-100 text-slate-700'}`}>
                                    {scenario.difficulty}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{scenario.description}</p>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex-shrink-0 mt-1"
                              >
                                <ChevronRight size={16} className={isExpanded ? 'text-purple-500' : 'text-slate-400'} />
                              </motion.div>
                            </div>
                          </button>

                          {/* Inline role selection */}
                          <AnimatePresence>
                            {isExpanded && selectedScenario?.roles && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 sm:p-4 bg-purple-50/50 space-y-3">
                                  {/* Objective */}
                                  <div className="text-xs text-purple-700 bg-purple-100 rounded-lg p-2">
                                    <strong>Goal:</strong> {selectedScenario.objective}
                                  </div>

                                  {/* Role cards */}
                                  <p className="text-xs font-semibold text-slate-600">Select your role:</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedScenario.roles.map(role => {
                                      const isRoleSelected = selectedRole === role.id
                                      return (
                                        <button
                                          key={role.id}
                                          onClick={() => setSelectedRole(role.id)}
                                          className={`text-left rounded-xl border-2 p-3 transition-all touch-manipulation ${
                                            isRoleSelected
                                              ? 'border-purple-500 bg-purple-100'
                                              : 'border-slate-200 bg-white hover:border-purple-300'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="text-sm font-bold text-slate-900">{role.name}</div>
                                              {role.chineseName && (
                                                <div className="text-xs text-slate-500">{role.chineseName}</div>
                                              )}
                                            </div>
                                            {isRoleSelected && (
                                              <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                              </div>
                                            )}
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}

                    {scenarios.length === 0 && !scenariosLoading && (
                      <p className="text-xs text-slate-500 text-center py-4">No scenarios available</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera toggle */}
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

        {/* Start Button */}
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
                <span>Start {selectedModeData?.title}</span>
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

      {/* First-visit feature guide */}
      <PageGuide
        pageId="conversation"
        steps={[
          {
            title: 'Choose a Mode',
            description: 'Pick from Free Talk, Lesson Practice, or Scenario Mode to start a conversation.',
            icon: MessageSquare,
          },
          {
            title: 'Scenario Practice',
            description: 'Select real-world scenarios like ordering food or asking for directions, then pick a role to play.',
            icon: Sparkles,
          },
          {
            title: 'Camera & Settings',
            description: 'Toggle video on/off and choose your AI conversation partner before starting.',
            icon: Video,
          },
        ]}
      />
    </div>
  )
}
