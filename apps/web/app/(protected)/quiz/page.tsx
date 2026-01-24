'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Play, Trophy, Target, Clock, CheckCircle2, XCircle,
  ChevronRight, BarChart3, BookOpen, Headphones, FileText, Type,
  Sparkles, Flame, RefreshCw
} from 'lucide-react'
import { useTOCFLQuiz, type TOCFLLevel, type QuestionType, type TOCFLQuestion } from '@/hooks/useTOCFLQuiz'

// Level badge colors
const LEVEL_COLORS: Record<TOCFLLevel, { bg: string; text: string; border: string }> = {
  A1: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  A2: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  B1: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  B2: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  C1: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  C2: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' }
}

// Type icons
const TYPE_ICONS: Record<QuestionType, typeof BookOpen> = {
  vocabulary: Type,
  grammar: BookOpen,
  reading: FileText,
  listening: Headphones
}

// Quiz setup screen
function QuizSetup({
  onStart
}: {
  onStart: (options: { level?: TOCFLLevel; type?: QuestionType | 'mixed'; count?: number }) => void
}) {
  const [selectedLevel, setSelectedLevel] = useState<TOCFLLevel | undefined>(undefined)
  const [selectedType, setSelectedType] = useState<QuestionType | 'mixed'>('mixed')
  const [questionCount, setQuestionCount] = useState(5)
  const { getStats } = useTOCFLQuiz()
  const stats = getStats()

  const levels: TOCFLLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const types: (QuestionType | 'mixed')[] = ['mixed', 'vocabulary', 'grammar', 'reading', 'listening']

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats.totalQuestions > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">Your Progress</h3>
              <p className="text-sm text-white/80">{stats.totalQuestions} questions answered</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.accuracy}%</div>
              <div className="text-xs text-white/70">Accuracy</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.correctAnswers}</div>
              <div className="text-xs text-white/70">Correct</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{Math.round(stats.averageTime / 1000)}s</div>
              <div className="text-xs text-white/70">Avg Time</div>
            </div>
          </div>
        </div>
      )}

      {/* Level Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Select Level
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <button
            onClick={() => setSelectedLevel(undefined)}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all touch-manipulation ${
              selectedLevel === undefined
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {levels.map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all touch-manipulation ${
                selectedLevel === level
                  ? `${LEVEL_COLORS[level].bg} ${LEVEL_COLORS[level].text} ring-2 ring-offset-1 ${LEVEL_COLORS[level].border}`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Type Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Question Type
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {types.map(type => {
            const Icon = type === 'mixed' ? Sparkles : TYPE_ICONS[type]
            const label = type === 'mixed' ? 'Mixed' : type.charAt(0).toUpperCase() + type.slice(1)

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-manipulation ${
                  selectedType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Question Count */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Number of Questions
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={3}
            max={10}
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <span className="w-10 text-center text-lg font-bold text-slate-800">
            {questionCount}
          </span>
        </div>
      </div>

      {/* Start Button */}
      <motion.button
        onClick={() => onStart({ level: selectedLevel, type: selectedType, count: questionCount })}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all touch-manipulation"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-center gap-2">
          <Play className="w-5 h-5" fill="currentColor" />
          <span>Start Quiz</span>
        </div>
      </motion.button>
    </div>
  )
}

// Question display
function QuestionView({
  question,
  questionNumber,
  totalQuestions,
  onAnswer
}: {
  question: TOCFLQuestion
  questionNumber: number
  totalQuestions: number
  onAnswer: (answer: number, timeSpent: number) => void
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<NodeJS.Timeout>()

  // Timer
  useEffect(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setTimeSpent(Date.now() - startTimeRef.current)
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [question.id])

  const handleSelect = (index: number) => {
    if (showResult) return

    const elapsed = Date.now() - startTimeRef.current
    setSelectedAnswer(index)
    setShowResult(true)

    if (timerRef.current) clearInterval(timerRef.current)

    // Auto advance after 2 seconds
    setTimeout(() => {
      onAnswer(index, elapsed)
      setSelectedAnswer(null)
      setShowResult(false)
      setTimeSpent(0)
    }, 2000)
  }

  const isCorrect = selectedAnswer === question.correctAnswer
  const levelColors = LEVEL_COLORS[question.level]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${levelColors.bg} ${levelColors.text}`}>
            {question.level}
          </span>
          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
            {question.type}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{(timeSpent / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Question {questionNumber} of {totalQuestions}</span>
          <span>{Math.round((questionNumber / totalQuestions) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
        <p className="text-lg font-medium text-slate-800 whitespace-pre-line">
          {question.question.text}
        </p>
        {question.question.textZh && (
          <p className="mt-2 text-sm text-slate-500">{question.question.textZh}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectAnswer = index === question.correctAnswer
          const showAsCorrect = showResult && isCorrectAnswer
          const showAsWrong = showResult && isSelected && !isCorrectAnswer

          return (
            <motion.button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all touch-manipulation ${
                showAsCorrect
                  ? 'border-emerald-500 bg-emerald-50'
                  : showAsWrong
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              whileTap={!showResult ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  showAsCorrect
                    ? 'bg-emerald-500 text-white'
                    : showAsWrong
                      ? 'bg-red-500 text-white'
                      : isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                }`}>
                  {showAsCorrect ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : showAsWrong ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <div className="flex-1">
                  <span className={`font-medium ${
                    showAsCorrect ? 'text-emerald-700' : showAsWrong ? 'text-red-700' : 'text-slate-700'
                  }`}>
                    {option.text}
                  </span>
                  {option.textZh && option.textZh !== option.text && (
                    <span className="ml-2 text-sm text-slate-400">({option.textZh})</span>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-600" />
                )}
                <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isCorrect ? 'Correct!' : 'Not quite...'}
                </span>
              </div>
              {question.explanation && (
                <p className="text-sm text-slate-600">{question.explanation}</p>
              )}
              {question.explanationZh && (
                <p className="text-sm text-slate-500 mt-1">{question.explanationZh}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Results screen
function QuizResults({
  score,
  totalQuestions,
  correctAnswers,
  onRestart,
  onHome
}: {
  score: number
  totalQuestions: number
  correctAnswers: number
  onRestart: () => void
  onHome: () => void
}) {
  const isGreat = score >= 80
  const isGood = score >= 60

  return (
    <div className="space-y-6 text-center">
      {/* Score display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`mx-auto w-40 h-40 rounded-full flex items-center justify-center ${
          isGreat
            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
            : isGood
              ? 'bg-gradient-to-br from-blue-400 to-blue-600'
              : 'bg-gradient-to-br from-amber-400 to-amber-600'
        }`}
      >
        <div className="text-center text-white">
          <div className="text-4xl font-bold">{score}%</div>
          <div className="text-sm opacity-80">Score</div>
        </div>
      </motion.div>

      {/* Message */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          {isGreat ? 'Excellent!' : isGood ? 'Good job!' : 'Keep practicing!'}
        </h2>
        <p className="text-slate-500 mt-1">
          You got {correctAnswers} out of {totalQuestions} questions correct
        </p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-800">{correctAnswers}</div>
          <div className="text-xs text-slate-500">Correct</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-100 flex items-center justify-center mb-2">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-lg font-bold text-slate-800">{totalQuestions - correctAnswers}</div>
          <div className="text-xs text-slate-500">Wrong</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={onHome}
          className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors touch-manipulation"
        >
          Back to Menu
        </button>
        <motion.button
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors touch-manipulation"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </div>
        </motion.button>
      </div>
    </div>
  )
}

// Main quiz page
export default function QuizPage() {
  const router = useRouter()
  const {
    currentSession,
    startQuiz,
    submitAnswer,
    getCurrentQuestion,
    endQuiz
  } = useTOCFLQuiz()

  const [view, setView] = useState<'setup' | 'quiz' | 'results'>('setup')
  const [lastOptions, setLastOptions] = useState<{ level?: TOCFLLevel; type?: QuestionType | 'mixed'; count?: number }>({})

  const handleStart = (options: { level?: TOCFLLevel; type?: QuestionType | 'mixed'; count?: number }) => {
    setLastOptions(options)
    startQuiz(options)
    setView('quiz')
  }

  const handleAnswer = (answer: number, timeSpent: number) => {
    const result = submitAnswer(answer, timeSpent)
    if (result?.isComplete) {
      setView('results')
    }
  }

  const handleRestart = () => {
    startQuiz(lastOptions)
    setView('quiz')
  }

  const handleHome = () => {
    setView('setup')
  }

  const currentQuestion = getCurrentQuestion()

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => view === 'setup' ? router.push('/dashboard') : setView('setup')}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors touch-manipulation"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">TOCFL Practice</h1>
              <p className="text-xs sm:text-sm text-slate-500">Test your Chinese skills</p>
            </div>
            {view === 'quiz' && currentSession && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {currentSession.results.filter(r => r.isCorrect).length}/{currentSession.results.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuizSetup onStart={handleStart} />
            </motion.div>
          )}

          {view === 'quiz' && currentQuestion && currentSession && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuestionView
                question={currentQuestion}
                questionNumber={currentSession.currentIndex + 1}
                totalQuestions={currentSession.questions.length}
                onAnswer={handleAnswer}
              />
            </motion.div>
          )}

          {view === 'results' && currentSession && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuizResults
                score={currentSession.score || 0}
                totalQuestions={currentSession.questions.length}
                correctAnswers={currentSession.results.filter(r => r.isCorrect).length}
                onRestart={handleRestart}
                onHome={handleHome}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
