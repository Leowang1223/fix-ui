/**
 * Shared report types
 */

export interface CharacterError {
  expected: string
  actual: string
  position: number
  type: 'missing' | 'wrong' | 'extra'
  expectedPinyin?: string
  actualPinyin?: string
}

export interface DetailedScores {
  pronunciation: number
  fluency: number
  accuracy: number
  comprehension: number
  confidence: number
}

export interface MispronouncedEntry {
  text: string
  pinyin?: string
  issue?: string
  tip?: string
}

export interface DimensionSuggestions {
  pronunciation?: string
  fluency?: string
  accuracy?: string
  comprehension?: string
  confidence?: string
}

export type Suggestions = DimensionSuggestions | string[]

export interface StepResult {
  stepId: number
  question: string
  score: number
  attempts: number
  passed: boolean
  detailedScores?: DetailedScores
  feedback?: string
  suggestions?: Suggestions
  detailedSuggestions?: string[]
  overallPractice?: string
  transcript?: string
  expectedAnswer?: string
  errors?: CharacterError[]
  correctionFeedback?: string
  mispronounced?: MispronouncedEntry[]
}

export interface LessonReport {
  lessonId: string
  lessonTitle: string
  completedAt: string
  totalScore: number
  results: StepResult[]
}
