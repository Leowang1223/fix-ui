'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Mic2,
  BookOpen,
  Sparkles
} from 'lucide-react'

// Types for correction data
export interface GrammarCorrection {
  original: string
  corrected: string
  explanation: string
  explanationZh?: string
  type: 'word-order' | 'measure-word' | 'tense' | 'particle' | 'vocabulary' | 'other'
}

export interface PronunciationIssue {
  word: string
  pinyin: string
  issue: 'tone' | 'initial' | 'final' | 'missing' | 'added'
  description: string
  descriptionZh?: string
  severity: 'minor' | 'moderate' | 'major'
}

export interface TurnCorrection {
  turnIndex: number
  userText: string
  corrections: {
    grammar: GrammarCorrection[]
    pronunciation: PronunciationIssue[]
    correctedText?: string
    correctedPinyin?: string
    score?: number
  }
}

export interface CorrectionSummary {
  totalTurns: number
  turnsWithIssues: number
  grammarIssueCount: number
  pronunciationIssueCount: number
  commonGrammarIssues: string[]
  commonPronunciationIssues: string[]
  overallGrammarScore: number
  overallPronunciationScore: number
  recommendations: string[]
}

interface ConversationCorrectionReportProps {
  turnCorrections: TurnCorrection[]
  summary: CorrectionSummary
  onPlayTTS?: (text: string) => void
}

// Severity badge component
function SeverityBadge({ severity }: { severity: 'minor' | 'moderate' | 'major' }) {
  const colors = {
    minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    moderate: 'bg-orange-100 text-orange-700 border-orange-200',
    major: 'bg-red-100 text-red-700 border-red-200'
  }

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colors[severity]}`}>
      {severity}
    </span>
  )
}

// Grammar type badge
function GrammarTypeBadge({ type }: { type: GrammarCorrection['type'] }) {
  const colors: Record<GrammarCorrection['type'], string> = {
    'word-order': 'bg-blue-100 text-blue-700',
    'measure-word': 'bg-purple-100 text-purple-700',
    'tense': 'bg-green-100 text-green-700',
    'particle': 'bg-pink-100 text-pink-700',
    'vocabulary': 'bg-amber-100 text-amber-700',
    'other': 'bg-slate-100 text-slate-700'
  }

  const labels: Record<GrammarCorrection['type'], string> = {
    'word-order': 'Word Order',
    'measure-word': 'Measure Word',
    'tense': 'Tense',
    'particle': 'Particle',
    'vocabulary': 'Vocabulary',
    'other': 'Other'
  }

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${colors[type]}`}>
      {labels[type]}
    </span>
  )
}

// Individual turn correction card
function TurnCorrectionCard({
  turn,
  isExpanded,
  onToggle,
  onPlayTTS
}: {
  turn: TurnCorrection
  isExpanded: boolean
  onToggle: () => void
  onPlayTTS?: (text: string) => void
}) {
  const hasIssues = turn.corrections.grammar.length > 0 || turn.corrections.pronunciation.length > 0
  const score = turn.corrections.score ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
            ${hasIssues
              ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-600'
            }
          `}>
            {turn.turnIndex}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm text-slate-700 truncate">
              {turn.userText}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {turn.corrections.grammar.length > 0 && (
                <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                  {turn.corrections.grammar.length} grammar
                </span>
              )}
              {turn.corrections.pronunciation.length > 0 && (
                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                  {turn.corrections.pronunciation.length} pronunciation
                </span>
              )}
              {!hasIssues && (
                <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 size={10} /> Perfect
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {score > 0 && (
            <span className={`
              text-lg font-bold
              ${score >= 90 ? 'text-green-600' : score >= 70 ? 'text-blue-600' : score >= 50 ? 'text-orange-600' : 'text-red-600'}
            `}>
              {score}
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-slate-400" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Original vs Corrected */}
              {turn.corrections.correctedText && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                    <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-red-600 mb-1">Your sentence</div>
                      <p className="text-sm text-slate-800">{turn.userText}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                    <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-green-600 mb-1">Corrected</div>
                      <p className="text-sm text-slate-800">{turn.corrections.correctedText}</p>
                      {turn.corrections.correctedPinyin && (
                        <p className="text-xs text-slate-500 mt-1">{turn.corrections.correctedPinyin}</p>
                      )}
                    </div>
                    {onPlayTTS && (
                      <button
                        onClick={() => onPlayTTS(turn.corrections.correctedText!)}
                        className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition touch-manipulation"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Grammar Issues */}
              {turn.corrections.grammar.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <BookOpen size={16} />
                    <span>Grammar Issues</span>
                  </div>
                  {turn.corrections.grammar.map((g, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                        <GrammarTypeBadge type={g.type} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-red-600 line-through">{g.original}</span>
                          {' → '}
                          <span className="text-green-600 font-medium">{g.corrected}</span>
                        </p>
                        <p className="text-xs text-slate-600">{g.explanation}</p>
                        {g.explanationZh && (
                          <p className="text-xs text-slate-500">{g.explanationZh}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pronunciation Issues */}
              {turn.corrections.pronunciation.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Mic2 size={16} />
                    <span>Pronunciation Issues</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {turn.corrections.pronunciation.map((p, idx) => (
                      <div
                        key={idx}
                        className={`
                          p-3 rounded-xl border
                          ${p.severity === 'major'
                            ? 'bg-red-50 border-red-200'
                            : p.severity === 'moderate'
                              ? 'bg-orange-50 border-orange-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg font-bold text-slate-800">{p.word}</span>
                          <SeverityBadge severity={p.severity} />
                        </div>
                        <p className="text-xs text-blue-600 mb-1">{p.pinyin}</p>
                        <p className="text-xs text-slate-600">{p.description}</p>
                        {p.descriptionZh && (
                          <p className="text-xs text-slate-500 mt-0.5">{p.descriptionZh}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Perfect turn message */}
              {!hasIssues && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100">
                  <Sparkles size={18} className="text-green-500" />
                  <p className="text-sm text-green-700">
                    Great job! No corrections needed for this turn.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Summary card component
function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
  color
}: {
  icon: typeof BookOpen
  label: string
  value: string | number
  subValue?: string
  color: 'blue' | 'purple' | 'green' | 'orange'
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600'
  }

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-xs opacity-70 mt-1">{subValue}</div>}
    </div>
  )
}

// Main component
export function ConversationCorrectionReport({
  turnCorrections,
  summary,
  onPlayTTS
}: ConversationCorrectionReportProps) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(
    turnCorrections.find(t => t.corrections.grammar.length > 0 || t.corrections.pronunciation.length > 0)?.turnIndex ?? null
  )

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare size={20} />
          Correction Summary
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={BookOpen}
            label="Grammar Score"
            value={summary.overallGrammarScore}
            subValue={`${summary.grammarIssueCount} issues found`}
            color="blue"
          />
          <SummaryCard
            icon={Mic2}
            label="Pronunciation Score"
            value={summary.overallPronunciationScore}
            subValue={`${summary.pronunciationIssueCount} issues found`}
            color="purple"
          />
          <SummaryCard
            icon={CheckCircle2}
            label="Clean Turns"
            value={`${summary.totalTurns - summary.turnsWithIssues}/${summary.totalTurns}`}
            subValue="without issues"
            color="green"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Needs Work"
            value={summary.turnsWithIssues}
            subValue="turns with issues"
            color="orange"
          />
        </div>
      </div>

      {/* Common Issues */}
      {(summary.commonGrammarIssues.length > 0 || summary.commonPronunciationIssues.length > 0) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            Common Issues to Focus On
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.commonGrammarIssues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-700 mb-2">Grammar</p>
                <ul className="space-y-1">
                  {summary.commonGrammarIssues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.commonPronunciationIssues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-700 mb-2">Pronunciation</p>
                <ul className="space-y-1">
                  {summary.commonPronunciationIssues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <Sparkles size={16} />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {summary.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-blue-500 font-bold">{idx + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Turn-by-Turn Analysis */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare size={20} />
          Turn-by-Turn Analysis
        </h2>

        <div className="space-y-2">
          {turnCorrections.map((turn) => (
            <TurnCorrectionCard
              key={turn.turnIndex}
              turn={turn}
              isExpanded={expandedTurn === turn.turnIndex}
              onToggle={() => setExpandedTurn(
                expandedTurn === turn.turnIndex ? null : turn.turnIndex
              )}
              onPlayTTS={onPlayTTS}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConversationCorrectionReport
