'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mic, Video, VideoOff, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react'
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

export default function ConversationSetupPage() {
  const router = useRouter()

  // Permission states
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [enableCamera, setEnableCamera] = useState(false)

  // Chapter selection
  const [completedChapters, setCompletedChapters] = useState<CompletedChapter[]>([])
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [topicMode, setTopicMode] = useState<'selected' | 'all' | 'free' | 'scenario'>('all')

  // Interviewer selection
  const [currentInterviewer, setCurrentInterviewer] = useState<string>(DEFAULT_INTERVIEWER)
  const [showInterviewerSelector, setShowInterviewerSelector] = useState(false)

  // Scenario mode
  const [showScenarioSelector, setShowScenarioSelector] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  // Load completed lessons from history
  useEffect(() => {
    const savedInterviewer = localStorage.getItem('selectedInterviewer')
    if (savedInterviewer) {
      setCurrentInterviewer(savedInterviewer)
    }

    const historyStr = localStorage.getItem('lessonHistory')
    if (historyStr) {
      try {
        const history: LessonHistoryEntry[] = JSON.parse(historyStr)

        // Extract unique chapters from completed lessons
        const chapterMap = new Map<string, { lessonCount: number }>()
        history.forEach(entry => {
          const chapterId = entry.lessonId.split('-')[0] // Extract C1, C2, etc.
          if (chapterId) {
            const existing = chapterMap.get(chapterId)
            if (existing) {
              existing.lessonCount++
            } else {
              chapterMap.set(chapterId, { lessonCount: 1 })
            }
          }
        })

        const chapters = Array.from(chapterMap.entries()).map(([chapterId, data]) => ({
          chapterId,
          title: `Chapter ${chapterId.substring(1)}`,
          lessonCount: data.lessonCount
        }))

        setCompletedChapters(chapters)
      } catch (error) {
        console.error('Failed to load lesson history:', error)
      }
    }
  }, [])

  // Request microphone permission
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop()) // Stop immediately after permission
      setMicPermission('granted')
    } catch (error) {
      console.error('Microphone permission denied:', error)
      setMicPermission('denied')
    }
  }

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setCameraPermission('granted')
    } catch (error) {
      console.error('Camera permission denied:', error)
      setCameraPermission('denied')
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

  // Handle start conversation
  const handleStartConversation = () => {
    if (micPermission !== 'granted') {
      alert('Microphone permission is required to start conversation.')
      return
    }

    // Validate scenario mode
    if (topicMode === 'scenario' && (!selectedScenario || !selectedRole)) {
      alert('Please select a scenario and role first.')
      return
    }

    // Save settings to localStorage
    const conversationSettings = {
      interviewerId: currentInterviewer,
      enableCamera,
      topicMode,
      selectedTopics: topicMode === 'selected' ? selectedChapters : [],
      scenarioId: topicMode === 'scenario' ? selectedScenario?.scenario_id : undefined,
      userRole: topicMode === 'scenario' ? selectedRole : undefined,
    }
    localStorage.setItem('conversationSettings', JSON.stringify(conversationSettings))

    // Navigate to conversation chat page
    router.push('/conversation/chat')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">AI Conversation Setup</h1>
          <p className="mt-1 text-sm text-gray-600">
            Practice Chinese with an AI instructor in real-time
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-6">
          {/* Step 1: Permissions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                1
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Permissions</h2>
            </div>

            <div className="space-y-4">
              {/* Microphone */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <Mic className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Microphone</div>
                    <div className="text-sm text-gray-500">Required for conversation</div>
                  </div>
                </div>

                {micPermission === 'pending' && (
                  <button
                    onClick={requestMicPermission}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Grant Permission
                  </button>
                )}
                {micPermission === 'granted' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Granted</span>
                  </div>
                )}
                {micPermission === 'denied' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Denied</span>
                  </div>
                )}
              </div>

              {/* Camera */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  {enableCamera ? (
                    <Video className="h-5 w-5 text-gray-600" />
                  ) : (
                    <VideoOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">Camera</div>
                    <div className="text-sm text-gray-500">Optional - show yourself</div>
                  </div>
                </div>

                <button
                  onClick={toggleCamera}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    enableCamera
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {enableCamera ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Select Interviewer */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                2
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Instructor</h2>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowInterviewerSelector(true)}
                className="group relative h-24 w-24 overflow-hidden rounded-xl border-2 border-gray-200 shadow-md transition-all hover:border-blue-400 hover:shadow-lg"
              >
                <Image
                  src={getInterviewerImagePath(currentInterviewer)}
                  alt="Selected Interviewer"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
                  <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100">
                    Change
                  </span>
                </div>
              </button>

              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Each instructor has a unique voice and teaching style. Click to change.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Topic Selection */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                3
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Conversation Topics</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTopicMode('all')}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    topicMode === 'all'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  All Completed Lessons
                </button>
                <button
                  onClick={() => setTopicMode('selected')}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    topicMode === 'selected'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Select Specific Chapters
                </button>
                <button
                  onClick={() => setTopicMode('free')}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    topicMode === 'free'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Free Talk
                </button>
                <button
                  onClick={() => {
                    setTopicMode('scenario')
                    setShowScenarioSelector(true)
                  }}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    topicMode === 'scenario'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Scenario Mode
                </button>
              </div>

              {topicMode === 'selected' && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">
                    Select chapters to focus on:
                  </p>
                  {completedChapters.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No completed chapters yet. Complete some lessons first to unlock chapter-based conversations.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {completedChapters.map(chapter => (
                        <button
                          key={chapter.chapterId}
                          onClick={() => toggleChapter(chapter.chapterId)}
                          className={`rounded-lg border px-3 py-2 text-center text-sm transition-all ${
                            selectedChapters.includes(chapter.chapterId)
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-bold text-lg">{chapter.chapterId}</div>
                          <div className="text-xs opacity-75">{chapter.lessonCount} lessons</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {topicMode === 'free' && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Free Talk Mode:</strong> The AI instructor will have open-ended conversations
                    without focusing on specific lesson content.
                  </p>
                </div>
              )}

              {topicMode === 'scenario' && selectedScenario && selectedRole && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-purple-900">{selectedScenario.title}</p>
                      <p className="text-xs text-purple-700">{selectedScenario.description}</p>
                    </div>
                    <button
                      onClick={() => setShowScenarioSelector(true)}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-purple-900">Your Role:</span>
                    <span className="text-xs bg-purple-200 text-purple-900 px-2 py-1 rounded">
                      {selectedScenario.roles.find(r => r.id === selectedRole)?.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartConversation}
            disabled={micPermission !== 'granted'}
            className={`w-full rounded-2xl py-4 text-lg font-semibold shadow-lg transition-all ${
              micPermission === 'granted'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="h-6 w-6" />
              <span>Start Conversation</span>
            </div>
          </button>
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
