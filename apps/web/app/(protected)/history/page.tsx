'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radar } from 'react-chartjs-2'
import { RefreshCw, Trash2, Layers, BookOpen, X, ArrowLeft, Home, MessageSquare, BarChart3 } from 'lucide-react'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { LessonReportDisplay, type LessonReport } from '../components/report'
import type { MispronouncedEntry, Suggestions } from '../components/report/types'
import { AppButton } from '@/components/ui/AppButton'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface LessonHistory {
  sessionId: string
  lessonId: string
  lessonTitle: string
  completedAt: string
  totalScore: number
  questionsCount: number
  totalAttempts: number
  radar: {
    pronunciation: number
    fluency: number
    accuracy: number
    comprehension: number
    confidence: number
  }
  results: Array<{
    stepId: number
    question: string
    score: number
    attempts: number
    passed: boolean
    detailedScores?: {
      pronunciation: number
      fluency: number
      accuracy: number
      comprehension: number
      confidence: number
    }
    suggestions?: Suggestions
    detailedSuggestions?: string[]
    overallPractice?: string
    feedback?: string
    transcript?: string
    mispronounced?: MispronouncedEntry[]
  }>
}

interface ConversationHistory {
  sessionId: string
  type: 'conversation'
  completedAt: string
  messages: number
  reportId: string
  settings: any
  conversationData?: {
    turns: Array<{ role: string; text: string; timestamp: Date }>
    analysis?: {
      overallScore: number
      feedback: string
      suggestions: string[]
    }
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<LessonHistory[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<LessonHistory | null>(null)
  const [historyType, setHistoryType] = useState<'lessons' | 'conversations'>('lessons')

  useEffect(() => {
    try {
      // 載入學習歷史
      const savedHistory = localStorage.getItem('lessonHistory')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        setHistory(parsed.sort((a: LessonHistory, b: LessonHistory) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        ))
      }

      // 載入對話歷史
      const savedConversations = localStorage.getItem('conversationHistory')
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations)
        setConversationHistory(parsed.sort((a: ConversationHistory, b: ConversationHistory) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        ))
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearHistory = () => {
    if (confirm('Clear all learning history?')) {
      localStorage.removeItem('lessonHistory')
      setHistory([])
      setSelectedSession(null)
    }
  }

  const deleteSession = (sessionId: string) => {
    if (confirm('Delete this record?')) {
      const newHistory = history.filter(h => h.sessionId !== sessionId)
      localStorage.setItem('lessonHistory', JSON.stringify(newHistory))
      setHistory(newHistory)
      if (selectedSession?.sessionId === sessionId) {
        setSelectedSession(null)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-xl text-gray-700">Loading...</div>
      </div>
    )
  }

  // 詳細報表頁面
  if (selectedSession) {
    // 構建報表數據
    const lessonReport: LessonReport = {
      lessonId: selectedSession.lessonId,
      lessonTitle: selectedSession.lessonTitle,
      completedAt: selectedSession.completedAt,
      totalScore: selectedSession.totalScore,
      results: selectedSession.results.map(r => ({
        stepId: r.stepId,
        question: r.question,
        totalScore: r.score,
        score: r.score,
        passed: r.passed,
        detailedScores: r.detailedScores || {
          pronunciation: 0,
          fluency: 0,
          accuracy: 0,
          comprehension: 0,
          confidence: 0
        },
        suggestions: r.suggestions,
        detailedSuggestions: r.detailedSuggestions || undefined,
        overallPractice: r.overallPractice,
        feedback: r.feedback,
        transcript: r.transcript,
        mispronounced: r.mispronounced || [],
        attempts: r.attempts
      }))
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="w-full bg-white rounded-2xl shadow-2xl p-8">
          <AppButton
            icon={ArrowLeft}
            onClick={() => setSelectedSession(null)}
            className="mb-6 max-w-none w-auto"
          >
            Back to History
          </AppButton>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Course Completion Report
            </h1>
            <h2 className="text-xl text-gray-600">{selectedSession.lessonTitle}</h2>
            <p className="text-sm text-gray-500 mt-2">
              Completed: {new Date(selectedSession.completedAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* 總體評分和雷達圖 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* 左側：總分 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white flex flex-col justify-center">
              <div className="text-center">
                <p className="text-lg mb-2">Overall Average Score</p>
                <p className="text-6xl font-bold">{selectedSession.totalScore}</p>
                <p className="text-sm mt-2">
                  {selectedSession.totalScore >= 90 ? 'Excellent!' : 
                   selectedSession.totalScore >= 75 ? 'Good!' : 
                   'Keep practicing!'}
                </p>
                <div className="mt-4 text-sm opacity-90">
                  <p>Questions: {selectedSession.questionsCount}</p>
                  <p>Total Attempts: {selectedSession.totalAttempts}</p>
                  <p>Avg Attempts: {(selectedSession.totalAttempts / selectedSession.questionsCount).toFixed(1)} per question</p>
                </div>
              </div>
            </div>

            {/* 右側：五向雷達圖 */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Performance Radar</h3>
              {selectedSession.radar ? (
                <div className="h-64">
                  <Radar
                    data={{
                      labels: ['Pronunciation', 'Fluency', 'Accuracy', 'Comprehension', 'Confidence'],
                      datasets: [{
                        label: 'Your Performance',
                        data: [
                          selectedSession.radar.pronunciation,
                          selectedSession.radar.fluency,
                          selectedSession.radar.accuracy,
                          selectedSession.radar.comprehension,
                          selectedSession.radar.confidence
                        ],
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100,
                          min: 0,
                          ticks: { stepSize: 25 }
                        }
                      },
                      plugins: {
                        legend: { display: false }
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-center py-20">Radar data not available</p>
              )}
            </div>
          </div>

          {/* 使用統一報表組件 */}
          <LessonReportDisplay
            report={lessonReport}
            showTranscript={true}
            showHeader={false}
            showRetry={true}  // 🆕 啟用 Retry 按鈕
          />

          {/* 底部按鈕 */}
          <div className="flex flex-wrap gap-4 justify-center">
            <AppButton
              icon={RefreshCw}
              onClick={() => router.push(`/lesson/${selectedSession.lessonId}`)}
              className="max-w-none w-auto"
            >
              Retry This Lesson
            </AppButton>
            <AppButton
              icon={Trash2}
              variant="danger"
              onClick={() => deleteSession(selectedSession.sessionId)}
              className="max-w-none w-auto"
            >
              Delete This Record
            </AppButton>
          </div>
        </div>
      </div>
    )
  }

  // 主列表頁面
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8'>
      <div className='w-full'>
        <div className="flex justify-between items-center mb-8">
          <h1 className='text-4xl font-bold text-gray-800 flex items-center gap-3'>
            <BookOpen className="h-10 w-10" />
            Learning History
          </h1>
          <div className="flex flex-wrap gap-4">
            <AppButton
              icon={Layers}
              className="max-w-none w-auto px-5"
              onClick={() => router.push('/flashcards')}
            >
              Review Flashcards
            </AppButton>
            {history.length > 0 && (
              <AppButton
                icon={X}
                variant="danger"
                onClick={clearHistory}
                className="max-w-none w-auto px-5"
              >
                Clear All
              </AppButton>
            )}
            <AppButton
              icon={Home}
              onClick={() => router.push('/dashboard')}
              className="max-w-none w-auto px-5"
            >
              Dashboard
            </AppButton>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setHistoryType('lessons')}
            className={`flex-1 rounded-xl py-3 px-6 font-semibold transition-all ${
              historyType === 'lessons'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Lessons ({history.length})
          </button>
          <button
            onClick={() => setHistoryType('conversations')}
            className={`flex-1 rounded-xl py-3 px-6 font-semibold transition-all ${
              historyType === 'conversations'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Conversations ({conversationHistory.length})
          </button>
        </div>

        {/* 學習歷史 */}
        {historyType === 'lessons' && history.length === 0 ? (
            <div className='text-center py-20'>
              <div className='text-6xl mb-4'>📭</div>
              <h2 className='text-2xl font-bold text-gray-700 mb-2'>No Learning History</h2>
              <p className='text-gray-600 mb-6'>Complete some lessons to see your progress!</p>
              <AppButton
                icon={BookOpen}
                onClick={() => router.push('/dashboard')}
                className="max-w-none w-auto"
              >
                Start Learning
              </AppButton>
            </div>
          ) : historyType === 'lessons' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => setSelectedSession(session)}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {session.totalScore}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {session.lessonTitle}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>Questions:</span>
                      <span className="font-semibold">{session.questionsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attempts:</span>
                      <span className="font-semibold">{session.totalAttempts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-semibold">
                        {new Date(session.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <AppButton
                      icon={RefreshCw}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/lesson/${session.lessonId}`)
                      }}
                      className="max-w-none w-full"
                    >
                      Retry
                    </AppButton>
                    <AppButton
                      icon={Trash2}
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.sessionId)
                      }}
                      className="max-w-none w-full"
                    >
                      Delete
                    </AppButton>
                  </div>
                </div>
              ))}
            </div>
          ) : conversationHistory.length === 0 ? (
            <div className='text-center py-20'>
              <div className='flex justify-center mb-4'>
                <MessageSquare className='h-24 w-24 text-gray-400' />
              </div>
              <h2 className='text-2xl font-bold text-gray-700 mb-2'>No Conversation History</h2>
              <p className='text-gray-600 mb-6'>Start an AI conversation to practice!</p>
              <AppButton
                icon={MessageSquare}
                onClick={() => router.push('/conversation')}
                className="max-w-none w-auto"
              >
                Start Conversation
              </AppButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conversationHistory.map((convo) => (
                <div
                  key={convo.sessionId}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    AI Conversation
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>Messages:</span>
                      <span className="font-semibold">{convo.messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span className="font-semibold capitalize">
                        {convo.settings?.topicMode || 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-semibold">
                        {new Date(convo.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <AppButton
                      icon={BookOpen}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Navigate to conversation report page
                        router.push(`/conversation/report/${convo.reportId}`)
                      }}
                      className="max-w-none w-full"
                    >
                      View Report
                    </AppButton>
                    <AppButton
                      icon={Trash2}
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Delete this conversation record?')) {
                          const newHistory = conversationHistory.filter(c => c.sessionId !== convo.sessionId)
                          localStorage.setItem('conversationHistory', JSON.stringify(newHistory))
                          setConversationHistory(newHistory)
                        }
                      }}
                      className="max-w-none w-full"
                    >
                      Delete
                    </AppButton>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

