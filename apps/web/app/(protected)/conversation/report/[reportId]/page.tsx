'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Clock, Target, TrendingUp, BookOpen, Lightbulb, Award, Plus } from 'lucide-react'
import { addCustomFlashcard } from '../../../flashcards/utils/flashcards'

interface CheckpointDetail {
  id: number
  description: string
  chineseDescription: string
  completed: boolean
  completedAt?: string
  triggerMessage?: string
  turnsToComplete?: number
  weight: number
}

interface ScenarioAnalysis {
  overallScore: number
  checkpointScore: number
  efficiencyScore: number
  conversationQualityScore: number
  checkpointDetails: CheckpointDetail[]
  totalCheckpoints: number
  completedCheckpoints: number
  completionRate: number
  totalTurns: number
  estimatedTurns: number
  efficiency: number
  vocabularyUsed: string[]
  vocabularyDetails?: Array<{
    chinese: string
    pinyin: string
    english: string
  }>
  vocabularyCoverage: number
  feedback: string
  suggestions: string[]
  strengths: string[]
  conversationDuration: number
  averageResponseTime: number
  scenarioId: string
  scenarioTitle: string
  userRole: string
  completedAt: string
}

interface ConversationHistory {
  sessionId: string
  reportId: string
  completedAt: string
  conversationData: {
    analysis: ScenarioAnalysis | any
    turns: any[]
  }
  settings?: any
}

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string

  const [report, setReport] = useState<ConversationHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [flashcardsSaved, setFlashcardsSaved] = useState(false)

  const handleSaveToFlashcards = () => {
    if (!report || !report.conversationData?.analysis) return

    const analysis = report.conversationData.analysis as ScenarioAnalysis

    // Check if vocabulary exists
    if (!analysis.vocabularyUsed || analysis.vocabularyUsed.length === 0) {
      alert('No vocabulary to save')
      return
    }

    const deckName = `Scenario: ${analysis.scenarioTitle}`

    // Save each vocabulary word as a flashcard with full details
    if (analysis.vocabularyDetails && analysis.vocabularyDetails.length > 0) {
      // Use detailed vocabulary data (chinese, pinyin, english)
      analysis.vocabularyDetails.forEach(vocab => {
        addCustomFlashcard({
          prompt: `${vocab.chinese} (${vocab.pinyin})`, // Chinese word with pinyin
          expectedAnswer: vocab.english, // English translation
          language: 'zh-CN',
          pinyin: vocab.pinyin,
          deckName: deckName
        })
      })
    } else {
      // Fallback to simple word list
      analysis.vocabularyUsed.forEach(word => {
        addCustomFlashcard({
          prompt: word, // Chinese word
          expectedAnswer: word,
          language: 'zh-CN',
          deckName: deckName
        })
      })
    }

    setFlashcardsSaved(true)
    alert(`Successfully saved ${analysis.vocabularyUsed.length} vocabulary words to flashcards!`)
  }

  useEffect(() => {
    // Load from localStorage
    const historyStr = localStorage.getItem('conversationHistory')
    if (!historyStr) {
      router.push('/history')
      return
    }

    try {
      const history: ConversationHistory[] = JSON.parse(historyStr)
      const foundReport = history.find(h => h.reportId === reportId || h.sessionId === reportId)

      if (!foundReport) {
        console.error('Report not found:', reportId)
        router.push('/history')
        return
      }

      setReport(foundReport)
    } catch (error) {
      console.error('Failed to load report:', error)
      router.push('/history')
    } finally {
      setLoading(false)
    }
  }, [reportId, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!report || !report.conversationData?.analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Report not found</p>
          <button
            onClick={() => router.push('/history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to History
          </button>
        </div>
      </div>
    )
  }

  const analysis = report.conversationData.analysis as ScenarioAnalysis
  const isScenarioMode = analysis.scenarioTitle !== undefined

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200'
    if (score >= 70) return 'bg-blue-50 border-blue-200'
    if (score >= 50) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/history')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to History</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Conversation Report</h1>
          {isScenarioMode && (
            <p className="text-sm text-gray-500 mt-1">
              Scenario: {analysis.scenarioTitle} • Role: {analysis.userRole}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Overall Score Card */}
        <div className={`rounded-xl border-2 p-6 ${getScoreBgColor(analysis.overallScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-6 w-6 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Overall Score</h2>
              </div>
              <p className="text-sm text-gray-600">
                Completed {new Date(report.completedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">/ 100</div>
            </div>
          </div>
        </div>

        {/* Score Breakdown (Scenario Mode Only) */}
        {isScenarioMode && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score Breakdown
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{Math.round(analysis.checkpointScore)}</div>
                <div className="text-xs text-gray-600 mt-1">Checkpoint Score</div>
                <div className="text-xs text-gray-500 mt-1">(60% weight)</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{Math.round(analysis.efficiencyScore)}</div>
                <div className="text-xs text-gray-600 mt-1">Efficiency Score</div>
                <div className="text-xs text-gray-500 mt-1">(15% weight)</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{Math.round(analysis.conversationQualityScore)}</div>
                <div className="text-xs text-gray-600 mt-1">Quality Score</div>
                <div className="text-xs text-gray-500 mt-1">(25% weight)</div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isScenarioMode && (
            <>
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Completion Rate</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{Math.round(analysis.completionRate * 100)}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {analysis.completedCheckpoints}/{analysis.totalCheckpoints} checkpoints
                </div>
              </div>
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Efficiency</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{Math.round(analysis.efficiency * 100)}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {analysis.totalTurns} turns (est. {analysis.estimatedTurns})
                </div>
              </div>
            </>
          )}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-medium">Total Turns</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{analysis.totalTurns || report.conversationData.turns.filter((t: any) => t.role === 'user').length}</div>
            <div className="text-xs text-gray-500 mt-1">conversation exchanges</div>
          </div>
          {isScenarioMode && analysis.vocabularyUsed && (
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-medium">Vocabulary</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{analysis.vocabularyUsed.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round(analysis.vocabularyCoverage * 100)}% coverage
              </div>
            </div>
          )}
        </div>

        {/* Checkpoint Details (Scenario Mode Only) */}
        {isScenarioMode && analysis.checkpointDetails && analysis.checkpointDetails.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Checkpoint Progress
            </h2>
            <div className="space-y-3">
              {analysis.checkpointDetails.map((checkpoint, idx) => (
                <div
                  key={checkpoint.id}
                  className={`p-4 rounded-lg border transition ${
                    checkpoint.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        checkpoint.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {checkpoint.completed ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${checkpoint.completed ? 'text-green-900' : 'text-gray-700'}`}>
                        {checkpoint.chineseDescription}
                      </div>
                      <div className={`text-xs mt-1 ${checkpoint.completed ? 'text-green-600' : 'text-gray-500'}`}>
                        {checkpoint.description}
                      </div>
                      {checkpoint.completed && checkpoint.completedAt && (
                        <div className="text-xs text-green-600 mt-2 font-medium">
                          ✓ Completed at {new Date(checkpoint.completedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {checkpoint.turnsToComplete && ` • ${checkpoint.turnsToComplete} turns`}
                        </div>
                      )}
                      {checkpoint.triggerMessage && (
                        <div className="text-xs text-gray-600 mt-1 italic">
                          Trigger: "{checkpoint.triggerMessage}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Strengths
            </h2>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span className="text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback */}
        {analysis.feedback && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Feedback
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.feedback}</p>
          </div>
        )}

        {/* Suggestions */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              Suggestions for Improvement
            </h2>
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-gray-700">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Vocabulary Used (Scenario Mode Only) */}
        {isScenarioMode && analysis.vocabularyUsed && analysis.vocabularyUsed.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Vocabulary Used
              </h2>
              <button
                onClick={handleSaveToFlashcards}
                disabled={flashcardsSaved}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  flashcardsSaved
                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>{flashcardsSaved ? 'Saved to Flashcards' : 'Save to Flashcards'}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.vocabularyUsed.map((word, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={() => router.push('/history')}
            className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            Back to History
          </button>
          <button
            onClick={() => router.push('/conversation')}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Start New Conversation
          </button>
        </div>
      </div>
    </div>
  )
}
