'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Radar } from 'react-chartjs-2'
import confetti from 'canvas-confetti'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { pinyin } from 'pinyin-pro'

// 報表組件
import { LessonReportDisplay, type LessonReport } from '../../components/report'
import { SuggestionsDisplay } from '../../components/report/SuggestionsDisplay'
import type { MispronouncedEntry, Suggestions } from '../../components/report/types'
import { API_BASE } from '../../config'
import { addOrUpdateFlashcard, getDeckNames as getFlashcardDecks, addDeckName as registerFlashcardDeck } from '../../flashcards/utils/flashcards'
import { AppButton } from '@/components/ui/AppButton'
import { BookmarkPlus, Volume2 } from 'lucide-react'

// 講師選擇器
import { InterviewerSelector, getInterviewerImagePath, getInterviewerVoice, DEFAULT_INTERVIEWER } from '../components/InterviewerSelector'

// 音節反饋組件
import { SyllableFeedbackPanel, type SyllableData } from '@/components/lesson'

// 入門教程
import { LessonTutorial, hasCompletedLessonTutorial } from '@/components/onboarding'

// 音效與觸覺反饋
import { sounds } from '@/lib/sounds'
import { haptic } from '@/lib/haptic'

// 成就系統
import { trackRecording, trackLessonComplete, checkAndUnlockAchievements, type UnlockedAchievement } from '@/lib/achievements'
import { AchievementToast } from '@/components/ui/AchievementToast'

// 音頻對比
import { AudioCompare } from '@/components/ui/AudioCompare'

// 🔧 字串相似度計算工具（Levenshtein Distance）
function normalizeText(text: string): string {
  return (text || '')
    .replace(/\s+/g, '') // 移除空格
    .replace(/[，,。.！!？?；;：:、「」『』【】《》〈〉（）()]/g, '') // 移除中英文標點
    .replace(/["'"'']/g, '') // 移除引號
    .toLowerCase()
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  return dp[m][n]
}

function calculateSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1)
  const normalized2 = normalizeText(text2)
  
  if (!normalized1 && !normalized2) return 1.0
  if (!normalized1 || !normalized2) return 0.0
  
  const distance = levenshteinDistance(normalized1, normalized2)
  const maxLength = Math.max(normalized1.length, normalized2.length)
  
  return 1 - (distance / maxLength)
}

// 🔧 逐字分析並找出錯誤（使用拼音判斷，更寬鬆）
interface CharacterError {
  expected: string
  actual: string
  position: number
  type: 'missing' | 'wrong' | 'extra'
  expectedPinyin?: string
  actualPinyin?: string
}

// 🔧 輔助函數：檢查兩個字符是否拼音相同或相似
function arePinyinSimilar(char1: string, char2: string): boolean {
  // 如果字符相同，直接返回 true
  if (char1 === char2) return true
  
  // 英文字母大小寫不敏感
  if (/[a-zA-Z]/.test(char1) && /[a-zA-Z]/.test(char2)) {
    return char1.toLowerCase() === char2.toLowerCase()
  }
  
  // 只有中文才轉拼音比較
  if (!/[\u4e00-\u9fa5]/.test(char1) || !/[\u4e00-\u9fa5]/.test(char2)) {
    return false
  }
  
  try {
    const pinyin1 = pinyin(char1, { toneType: 'num', type: 'array' })[0] || ''
    const pinyin2 = pinyin(char2, { toneType: 'num', type: 'array' })[0] || ''
    
    // 去掉聲調，只比較聲母韻母
    const base1 = pinyin1.replace(/[1-5]/g, '')
    const base2 = pinyin2.replace(/[1-5]/g, '')
    
    // 拼音完全相同（忽略聲調）
    if (base1 === base2) return true
    
    // 常見混淆音：n/l, an/ang, en/eng, in/ing
    const confusablePairs = [
      ['n', 'l'],
      ['an', 'ang'],
      ['en', 'eng'],
      ['in', 'ing'],
      ['un', 'ong']
    ]
    
    for (const [a, b] of confusablePairs) {
      if ((base1.includes(a) && base2.includes(b)) || 
          (base1.includes(b) && base2.includes(a))) {
        return true
      }
    }
  } catch (error) {
    return false
  }
  
  return false
}

// 🔧 輔助函數：獲取字符的拼音
function getCharPinyin(char: string): string {
  if (!char || !/[\u4e00-\u9fa5]/.test(char)) return ''
  try {
    return pinyin(char, { toneType: 'num', type: 'array' })[0] || ''
  } catch {
    return ''
  }
}

const normalizeMispronouncedEntries = (source: any): MispronouncedEntry[] => {
  if (!Array.isArray(source)) return []
  return source
    .map((entry) => {
      if (!entry) return null
      if (typeof entry === 'string') {
        const text = entry.trim()
        return text ? { text } : null
      }
      if (typeof entry === 'object') {
        const text = entry.text || entry.character || entry.word || ''
        if (!text) return null
        return {
          text,
          pinyin: entry.pinyin || entry.phonetic || entry.pronunciation,
          issue: entry.issue || entry.reason || entry.message,
          tip: entry.tip || entry.suggestion || entry.advice
        } as MispronouncedEntry
      }
      return null
    })
    .filter((item): item is MispronouncedEntry => !!item && !!item.text)
}

function analyzeErrors(expected: string, actual: string): CharacterError[] {
  const expectedNorm = normalizeText(expected)
  const actualNorm = normalizeText(actual)
  const errors: CharacterError[] = []
  
  const maxLen = Math.max(expectedNorm.length, actualNorm.length)
  
  for (let i = 0; i < maxLen; i++) {
    const expChar = expectedNorm[i] || ''
    const actChar = actualNorm[i] || ''
    
    if (!expChar && actChar) {
      // Extra character - 但如果是空格或標點，忽略
      if (actChar.trim() && !/[，。！？；：、]/.test(actChar)) {
        errors.push({ 
          expected: '', 
          actual: actChar, 
          position: i, 
          type: 'extra',
          actualPinyin: getCharPinyin(actChar)
        })
      }
    } else if (expChar && !actChar) {
      // Missing character
      errors.push({ 
        expected: expChar, 
        actual: '', 
        position: i, 
        type: 'missing',
        expectedPinyin: getCharPinyin(expChar)
      })
    } else if (expChar !== actChar) {
      // 🔧 使用拼音判斷是否真的錯誤
      if (!arePinyinSimilar(expChar, actChar)) {
        errors.push({ 
          expected: expChar, 
          actual: actChar, 
          position: i, 
          type: 'wrong',
          expectedPinyin: getCharPinyin(expChar),
          actualPinyin: getCharPinyin(actChar)
        })
      }
      // 如果拼音相似，不算錯誤（例如繁簡體：湯/汤）
    }
  }
  
  return errors
}

// 🔧 中文轉拼音 tokens（含聲調數字）
function toPinyinTokens(text: string): string[] {
  try {
    return pinyin(text, { 
      toneType: 'num',      // 聲調用數字 1-5
      type: 'array',        // 返回陣列
      nonZh: 'removed'      // 移除非中文
    })
      .map(s => s.trim())
      .filter(Boolean)
  } catch (error) {
    console.error('拼音轉換錯誤:', error)
    return []
  }
}

// 🔧 拼音層級的編輯距離（聲母/韻母/聲調權重）
function phonemeDistance(a: string[], b: string[]): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  const split = (syll: string) => {
    const tone = syll.match(/[1-5]$/)?.[0] ?? ''
    const base = tone ? syll.slice(0, -1) : syll
    return { base, tone }
  }

  const near = (x: string, y: string) => {
    const pairs = [
      ['n', 'l'], 
      ['an', 'ang'], 
      ['en', 'eng'], 
      ['in', 'ing'], 
      ['uan', 'uang']
    ]
    return pairs.some(([p, q]) => 
      (x.includes(p) && y.includes(q)) || (x.includes(q) && y.includes(p))
    ) || x[0] === y[0]
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const A = split(a[i - 1])
      const B = split(b[j - 1])
      
      let subCost = 1
      if (A.base === B.base) {
        subCost = (A.tone === B.tone) ? 0 : 0.5  // 同音節不同聲調：0.5
      } else if (near(A.base, B.base)) {
        subCost = 0.7  // 聲母/韻母接近：0.7
      }
      
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,           // 刪除
        dp[i][j - 1] + 1,           // 插入
        dp[i - 1][j - 1] + subCost  // 替換
      )
    }
  }
  
  return dp[m][n]
}

// 🔧 拼音相似度
function phonemeSimilarity(text1: string, text2: string): number {
  const a = toPinyinTokens(text1)
  const b = toPinyinTokens(text2)
  if (!a.length || !b.length) return 0
  const dist = phonemeDistance(a, b)
  const maxLen = Math.max(a.length, b.length)
  return 1 - dist / maxLen
}

// 🔧 聲調準確度
function toneAccuracy(text1: string, text2: string): number {
  const a = toPinyinTokens(text1)
  const b = toPinyinTokens(text2)
  const L = Math.min(a.length, b.length)
  if (!L) return 0
  
  let toneMatch = 0
  for (let i = 0; i < L; i++) {
    const ta = a[i].match(/[1-5]$/)?.[0] ?? ''
    const tb = b[i].match(/[1-5]$/)?.[0] ?? ''
    if (ta && tb && ta === tb) toneMatch++
  }
  
  return toneMatch / L
}

// 🔧 三維評分模組（統一計算文字/拼音/聲調相似度）
interface ThreeDimensionalScore {
  textSim: number
  phonemeSim: number
  toneAcc: number
  combinedScore: number
}

function calculateThreeDimensionalScore(expected: string, actual: string): ThreeDimensionalScore {
  console.log('🔥🔥🔥 calculateThreeDimensionalScore 開始執行')
  console.log('  預期:', expected)
  console.log('  實際:', actual)
  
  const textSim = calculateSimilarity(expected, actual)
  const phonemeSim = phonemeSimilarity(expected, actual)
  const toneAcc = toneAccuracy(expected, actual)
  const combinedScore = (textSim + phonemeSim + toneAcc) / 3
  
  console.log('  文字相似度:', (textSim * 100).toFixed(1) + '%')
  console.log('  拼音相似度:', (phonemeSim * 100).toFixed(1) + '%')
  console.log('  聲調準確度:', (toneAcc * 100).toFixed(1) + '%')
  console.log('  綜合得分:', (combinedScore * 100).toFixed(1) + '%')
  
  return { textSim, phonemeSim, toneAcc, combinedScore }
}

// 🔧 門檻判定模組（根據句子長度返回對應門檻）
interface ScoreThresholds {
  text: number
  phoneme: number
  tone: number
  type: 'short' | 'standard'
}

function getScoreThresholds(text: string): ScoreThresholds {
  const chars = Array.from(text.replace(/[，。！？；：、\s]/g, ''))
  const len = chars.length
  const isShort = len <= 3
  
  return isShort
    ? { text: 0.95, phoneme: 0.95, tone: 0.95, type: 'short' as const }
    : { text: 0.85, phoneme: 0.88, tone: 0.85, type: 'standard' as const }
}

// 🔧 評分判定模組（統一判定是否通過）
interface ScoreJudgement {
  slotValid: boolean
  textPass: boolean
  phonemePass: boolean
  tonePass: boolean
  passed: boolean
  finalScore: number
  thresholds: ScoreThresholds
}

function judgeScore(
  score: ThreeDimensionalScore,
  slotCheck: { valid: boolean; errors: string[]; mismatchPositions: number[] },
  expectedAnswer: string,
  backendScore: number
): ScoreJudgement {
  console.log('🎯🎯🎯 judgeScore 開始執行')
  console.log('  槽位檢查結果:', slotCheck.valid ? '✅ 通過' : '❌ 失敗')
  if (!slotCheck.valid) {
    console.log('  槽位錯誤:', slotCheck.errors)
    console.log('  錯誤位置:', slotCheck.mismatchPositions)
  }
  
  const thresholds = getScoreThresholds(expectedAnswer)
  
  const slotValid = slotCheck.valid
  const textPass = score.textSim >= thresholds.text
  const phonemePass = score.phonemeSim >= thresholds.phoneme
  const tonePass = score.toneAcc >= thresholds.tone
  
  console.log('  門檻檢查:')
  console.log('    - 文字:', textPass ? '✅' : '❌', `(${(score.textSim * 100).toFixed(1)}% >= ${(thresholds.text * 100)}%)`)
  console.log('    - 拼音:', phonemePass ? '✅' : '❌', `(${(score.phonemeSim * 100).toFixed(1)}% >= ${(thresholds.phoneme * 100)}%)`)
  console.log('    - 聲調:', tonePass ? '✅' : '❌', `(${(score.toneAcc * 100).toFixed(1)}% >= ${(thresholds.tone * 100)}%)`)
  
  const passed = slotValid && textPass && phonemePass && tonePass
  
  // 分數護欄：取最小值
  let finalScore = Math.min(
    backendScore,
    Math.round(score.textSim * 100),
    Math.round(score.phonemeSim * 100),
    Math.round(score.toneAcc * 100)
  )
  
  // 槽位錯誤強制降分
  if (!slotValid) {
    console.log('  ⚠️ 槽位錯誤，強制降分到 50 以下')
    finalScore = Math.min(finalScore, 50)
  }
  
  console.log('  最終判定:', passed ? '✅✅✅ PASSED' : '❌❌❌ FAILED')
  console.log('  最終分數:', finalScore)
  
  return {
    slotValid,
    textPass,
    phonemePass,
    tonePass,
    passed,
    finalScore,
    thresholds
  }
}

// 🔧 詳細日誌輸出模組（統一格式化日誌）
function logScoringDetails(
  expected: string,
  actual: string,
  score: ThreeDimensionalScore,
  slotCheck: { valid: boolean; errors: string[]; mismatchPositions: number[] },
  judgement: ScoreJudgement
) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 評分詳情')
  console.log('='.repeat(60))
  console.log('預期答案:', expected)
  console.log('實際回答:', actual)
  console.log('-'.repeat(60))
  
  console.log('📈 三維相似度:')
  console.log(`  - 文字相似度: ${(score.textSim * 100).toFixed(1)}%`)
  console.log(`  - 拼音相似度: ${(score.phonemeSim * 100).toFixed(1)}%`)
  console.log(`  - 聲調準確度: ${(score.toneAcc * 100).toFixed(1)}%`)
  console.log(`  - 綜合得分: ${(score.combinedScore * 100).toFixed(1)}%`)
  console.log('-'.repeat(60))
  
  console.log('🔐 槽位檢查:')
  console.log(`  - 結果: ${slotCheck.valid ? '✅ 通過' : '❌ 失敗'}`)
  if (!slotCheck.valid) {
    console.log(`  - 錯誤數: ${slotCheck.errors.length}`)
    console.log(`  - 位置: [${slotCheck.mismatchPositions.join(', ')}]`)
    slotCheck.errors.forEach((err, idx) => {
      console.log(`    ${idx + 1}. ${err}`)
    })
  }
  console.log('-'.repeat(60))
  
  console.log(`📏 門檻設定: ${judgement.thresholds.type === 'short' ? '短句(≤3字)' : '標準(>3字)'}`)
  console.log(`  - 文字門檻: ${(judgement.thresholds.text * 100).toFixed(0)}%`)
  console.log(`  - 拼音門檻: ${(judgement.thresholds.phoneme * 100).toFixed(0)}%`)
  console.log(`  - 聲調門檻: ${(judgement.thresholds.tone * 100).toFixed(0)}%`)
  console.log('-'.repeat(60))
  
  console.log('🎯 通過條件:')
  console.log(`  ✓ 槽位檢查: ${judgement.slotValid ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  ✓ 文字達標: ${judgement.textPass ? '✅ PASS' : '❌ FAIL'} [${(score.textSim * 100).toFixed(1)}% vs ${(judgement.thresholds.text * 100).toFixed(0)}%]`)
  console.log(`  ✓ 拼音達標: ${judgement.phonemePass ? '✅ PASS' : '❌ FAIL'} [${(score.phonemeSim * 100).toFixed(1)}% vs ${(judgement.thresholds.phoneme * 100).toFixed(0)}%]`)
  console.log(`  ✓ 聲調達標: ${judgement.tonePass ? '✅ PASS' : '❌ FAIL'} [${(score.toneAcc * 100).toFixed(1)}% vs ${(judgement.thresholds.tone * 100).toFixed(0)}%]`)
  console.log('-'.repeat(60))
  
  console.log(`🎲 最終判定: ${judgement.passed ? '✅✅✅ PASSED ✅✅✅' : '❌❌❌ FAILED ❌❌❌'}`)
  console.log(`🏆 最終分數: ${judgement.finalScore}`)
  console.log('='.repeat(60) + '\n')
}

// 🔧 【超嚴格】關鍵槽位檢查（代詞位置必須 100% 完全匹配）
function checkKeySlots(expected: string, actual: string): {
  valid: boolean
  errors: string[]
  mismatchPositions: number[]
} {
  // 🚨 強制輸出：確保函數被調用
  console.log('🚨🚨🚨 checkKeySlots 函數被調用！')
  console.log('🚨 輸入 - 預期:', expected)
  console.log('🚨 輸入 - 實際:', actual)
  
  const errors: string[] = []
  const mismatchPositions: number[] = []
  
  // ✅ Step 1: 清理文本（只移除標點符號，保留所有中文字符）
  const cleanExpected = expected
    .replace(/[，。！？；：、""''（）《》【】\s]/g, '')
    .replace(/[,\.!?;:"'\(\)\[\]\s]/g, '')
  
  const cleanActual = actual
    .replace(/[，。！？；：、""''（）《》【】\s]/g, '')
    .replace(/[,\.!?;:"'\(\)\[\]\s]/g, '')
  
  // ✅ Step 2: 轉為字符數組（正確處理 Unicode）
  const expChars = Array.from(cleanExpected)
  const actChars = Array.from(cleanActual)
  
  console.log('\n' + '━'.repeat(80))
  console.log('🔍 【槽位檢查】CHARACTER-BY-CHARACTER POSITION CHECK')
  console.log('━'.repeat(80))
  console.log('📝 原始預期文本:', expected)
  console.log('📝 原始實際文本:', actual)
  console.log('🧹 清理後預期:', cleanExpected)
  console.log('🧹 清理後實際:', cleanActual)
  console.log('📊 字符數量: 預期=' + expChars.length + ' 實際=' + actChars.length)
  console.log('━'.repeat(80))
  
  // ✅ Step 3: 定義所有中文代詞（人稱代詞）
  const PRONOUNS = new Set([
    // 第一人稱
    '我', '俺', '咱', '咱們', '咱们', '吾',
    // 第二人稱
    '你', '您', '妳', '儂', '侬', '汝',
    // 第三人稱
    '他', '她', '它', '牠', '祂', '伊'
  ])
  
  // ✅ Step 4: 逐字符嚴格比對
  const maxLen = Math.max(expChars.length, actChars.length)
  let pronounCheckCount = 0
  let pronounErrorCount = 0
  
  for (let i = 0; i < maxLen; i++) {
    const expChar = expChars[i] || ''
    const actChar = actChars[i] || ''
    
    const expIsPronoun = PRONOUNS.has(expChar)
    const actIsPronoun = PRONOUNS.has(actChar)
    
    // 只檢查涉及代詞的位置
    if (expIsPronoun || actIsPronoun) {
      pronounCheckCount++
      console.log(`\n[位置 ${i}] 🎯 代詞關鍵位置檢查:`)
      console.log(`  預期: "${expChar}" ${expIsPronoun ? '(✓ 是代詞)' : '(✗ 非代詞)'}`)
      console.log(`  實際: "${actChar}" ${actIsPronoun ? '(✓ 是代詞)' : '(✗ 非代詞)'}`)
      
      // ❌ 規則 1: 預期有代詞，但實際完全缺失
      if (expIsPronoun && !actChar) {
        const error = `位置 ${i}: 缺少代詞 "${expChar}"`
        errors.push(error)
        mismatchPositions.push(i)
        pronounErrorCount++
        console.log(`  ❌❌❌ 嚴重錯誤: 缺少必需的代詞 "${expChar}"`)
        continue
      }
      
      // ❌ 規則 2: 預期有代詞，實際字符存在但不是代詞
      if (expIsPronoun && actChar && !actIsPronoun) {
        const error = `位置 ${i}: 預期代詞 "${expChar}"，實際是非代詞 "${actChar}"`
        errors.push(error)
        mismatchPositions.push(i)
        pronounErrorCount++
        console.log(`  ❌❌❌ 嚴重錯誤: 應該是代詞，卻說成了其他字`)
        console.log(`      → 預期: "${expChar}" (代詞)`)
        console.log(`      → 實際: "${actChar}" (不是代詞)`)
        continue
      }
      
      // ❌ 規則 3: 預期有代詞 A，實際說了代詞 B（代詞不匹配）
      if (expIsPronoun && actIsPronoun && expChar !== actChar) {
        const error = `位置 ${i}: 代詞不匹配 - 預期 "${expChar}"，實際 "${actChar}"`
        errors.push(error)
        mismatchPositions.push(i)
        pronounErrorCount++
        console.log(`  ❌❌❌ 致命錯誤: 代詞完全錯誤！`)
        console.log(`      → 預期代詞: "${expChar}"`)
        console.log(`      → 實際代詞: "${actChar}"`)
        console.log(`      → 這會改變句子的主語/賓語，意思完全不同！`)
        console.log(`      → 例如: "你" vs "我" 會讓問句變成陳述句`)
        continue
      }
      
      // ❌ 規則 4: 預期沒有代詞，但實際多說了一個代詞
      if (!expIsPronoun && actIsPronoun) {
        const error = `位置 ${i}: 不應該有代詞，卻出現了 "${actChar}"`
        errors.push(error)
        mismatchPositions.push(i)
        pronounErrorCount++
        console.log(`  ❌❌❌ 錯誤: 多餘的代詞 "${actChar}"`)
        console.log(`      → 預期: "${expChar || '(無字符)'}"`)
        console.log(`      → 實際: "${actChar}" (多餘的代詞)`)
        continue
      }
      
      // ✅ 規則 5: 代詞完全匹配（位置和字符都正確）
      if (expIsPronoun && actIsPronoun && expChar === actChar) {
        console.log(`  ✅✅✅ 完美: 代詞 "${expChar}" 位置和內容 100% 正確`)
      }
    }
  }
  
  const valid = errors.length === 0 && pronounErrorCount === 0
  
  console.log('\n' + '━'.repeat(80))
  console.log('📊 【槽位檢查結果】')
  console.log('━'.repeat(80))
  console.log(`  ✓ 檢查的代詞位置數: ${pronounCheckCount}`)
  console.log(`  ✗ 代詞錯誤數: ${pronounErrorCount}`)
  console.log(`  ✗ 總錯誤數: ${errors.length}`)
  console.log(`  ✗ 錯誤位置: ${mismatchPositions.length > 0 ? '[' + mismatchPositions.join(', ') + ']' : '無'}`)
  console.log(`  🎯 最終判定: ${valid ? '✅✅✅ VALID (通過)' : '❌❌❌ INVALID (失敗)'}`)
  
  if (!valid) {
    console.log('\n⚠️  【錯誤詳情列表】')
    errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err}`)
    })
    console.log('\n💡 提示: 代詞錯誤會導致句子意思完全改變，必須重新錄音！')
  }
  
  console.log('━'.repeat(80) + '\n')
  
  console.log('=' .repeat(60))
  
  return { valid, errors, mismatchPositions }
}

// 🔧 生成詳細的逐字比對分析（英文敘述 + 中文顯示拼音）
interface DetailedCharacterAnalysis {
  characterByCharacterAnalysis: string  // 逐字比對結果
  toneAnalysis?: string                 // 音調分析（如果需要）
  overallFeedback: string               // 總體評價
  metrics?: {
    textSimilarity: number
    phonemeSimilarity: number
    toneAccuracy: number
  }
}

function generateDetailedFeedback(
  expected: string, 
  actual: string, 
  expectedPinyin?: string
): DetailedCharacterAnalysis {
  const expChars = Array.from(expected.replace(/\s+/g, ''))
  const actChars = Array.from(actual.replace(/\s+/g, ''))
  const expPinyin = toPinyinTokens(expected)
  const actPinyin = toPinyinTokens(actual)
  
  console.log('🔍 拼音級分析開始:')
  console.log('  預期字符:', expChars)
  console.log('  預期拼音:', expPinyin)
  console.log('  實際字符:', actChars)
  console.log('  實際拼音:', actPinyin)
  
  const textSim = calculateSimilarity(expected, actual)
  const phSim = phonemeSimilarity(expected, actual)
  const toneAcc = toneAccuracy(expected, actual)
  
  console.log('  文字相似度:', (textSim * 100).toFixed(1) + '%')
  console.log('  拼音相似度:', (phSim * 100).toFixed(1) + '%')
  console.log('  聲調準確度:', (toneAcc * 100).toFixed(1) + '%')
  
  // 如果完美匹配
  if (textSim >= 0.99 && phSim >= 0.99 && toneAcc >= 0.99) {
    console.log('✅ 完美匹配！')
    return {
      characterByCharacterAnalysis: '✅ Perfect! All characters are correct with perfect tones.',
      overallFeedback: 'Excellent pronunciation! Your answer matches perfectly.',
      metrics: { textSimilarity: textSim, phonemeSimilarity: phSim, toneAccuracy: toneAcc }
    }
  }
  
  // 逐字比對分析（拼音級）
  const lines: string[] = []
  const maxLen = Math.max(expChars.length, actChars.length)
  
  console.log('  開始逐字比對 (長度:', maxLen, '):')
  
  for (let i = 0; i < maxLen; i++) {
    const expChar = expChars[i] || ''
    const actChar = actChars[i] || ''
    const expPin = expPinyin[i] || ''
    const actPin = actPinyin[i] || ''
    
    console.log(`    [${i}] 預期="${expChar}"(${expPin}) 實際="${actChar}"(${actPin})`)
    
    if (expChar === actChar && expChar !== '') {
      // 字相同，檢查拼音和聲調
      if (expPin === actPin) {
        lines.push(`✅ "${expChar}" (${expPin}) - Correct`)
      } else {
        // 字對但聲調可能錯
        const expTone = expPin.match(/[1-5]$/)?.[0] || ''
        const actTone = actPin.match(/[1-5]$/)?.[0] || ''
        const expBase = expPin.replace(/[1-5]$/, '')
        const actBase = actPin.replace(/[1-5]$/, '')
        
        if (expBase === actBase && expTone !== actTone) {
          lines.push(`⚠️ "${expChar}" - Correct character, but tone should be ${expTone} (${expPin}), you said tone ${actTone} (${actPin})`)
        } else {
          lines.push(`✅ "${expChar}" (${expPin}) - Correct`)
        }
      }
    } else if (expChar && !actChar) {
      lines.push(`❌ Missing: "${expChar}" (${expPin})`)
      lines.push(`   💬 You should say "${expChar}" (${expPin}) here`)
    } else if (!expChar && actChar) {
      lines.push(`❌ Extra: "${actChar}" (${actPin})`)
      lines.push(`   💬 "${actChar}" should not be here`)
    } else if (expChar !== actChar) {
      lines.push(`❌ "${actChar}" (${actPin}) → Should be "${expChar}" (${expPin})`)
      
      // 分析錯誤類型
      const expBase = expPin.replace(/[1-5]$/, '')
      const actBase = actPin.replace(/[1-5]$/, '')
      const expTone = expPin.match(/[1-5]$/)?.[0] || ''
      const actTone = actPin.match(/[1-5]$/)?.[0] || ''
      
      if (expBase === actBase) {
        lines.push(`   💬 Pronunciation is close, but tone should be ${expTone}, not ${actTone}`)
      } else if (expBase[0] === actBase[0]) {
        lines.push(`   💬 Initial consonant is correct, but the vowel/final is different`)
      } else {
        lines.push(`   💬 Both pronunciation and tone are different`)
      }
    }
  }
  
  const characterByCharacterAnalysis = lines.join('\n')
  
  console.log('📝 逐字分析結果:')
  console.log(characterByCharacterAnalysis)
  
  // 總體評價（基於三個指標）
  let overallFeedback = ''
  if (textSim >= 0.95 && phSim >= 0.95 && toneAcc >= 0.95) {
    overallFeedback = 'Perfect! Your pronunciation is excellent.'
  } else if (toneAcc < 0.7) {
    overallFeedback = 'Pay attention to tones. Chinese tones are crucial for meaning.'
  } else if (phSim < 0.75) {
    overallFeedback = 'Work on your pronunciation. Try to pronounce each syllable clearly.'
  } else if (textSim < 0.8) {
    overallFeedback = 'Your answer differs from the expected. Please check if you said the right words.'
  } else {
    overallFeedback = 'Good effort! Keep practicing to improve accuracy.'
  }
  
  console.log('📊 總體評價:', overallFeedback)
  
  return {
    characterByCharacterAnalysis,
    overallFeedback,
    metrics: { textSimilarity: textSim, phonemeSimilarity: phSim, toneAccuracy: toneAcc }
  }
}

// 保留舊函數以向後兼容
function generateCorrectionFeedback(errors: CharacterError[], expected: string, actual: string): string {
  if (errors.length === 0) {
    return "Perfect pronunciation! Your answer matches the expected response exactly."
  }
  
  const feedback: string[] = []
  const errorCount = errors.length
  const similarity = calculateSimilarity(expected, actual)
  
  // 總體評價
  if (similarity >= 0.9) {
    feedback.push("Your pronunciation is very close to the correct answer.")
  } else if (similarity >= 0.7) {
    feedback.push("Your pronunciation needs some improvement.")
  } else {
    feedback.push("Your pronunciation differs significantly from the expected answer.")
  }
  
  // 具體錯誤
  feedback.push(`\n\nFound ${errorCount} error${errorCount > 1 ? 's' : ''}:`)
  
  errors.slice(0, 5).forEach((error, idx) => { // 最多顯示5個錯誤
    switch (error.type) {
      case 'missing':
        feedback.push(`${idx + 1}. Missing character: "${error.expected}" at position ${error.position + 1}`)
        break
      case 'wrong':
        feedback.push(`${idx + 1}. Wrong character: You said "${error.actual}" but should be "${error.expected}" at position ${error.position + 1}`)
        break
      case 'extra':
        feedback.push(`${idx + 1}. Extra character: "${error.actual}" at position ${error.position + 1} should not be there`)
        break
    }
  })
  
  if (errors.length > 5) {
    feedback.push(`... and ${errors.length - 5} more errors.`)
  }
  
  return feedback.join('\n')
}

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface LessonStep {
  id: number
  teacher: string
  expected_answer: string[]
  pinyin?: string | string[]
  pinyin_examples?: string[]
  english_hint?: string
  encouragement?: string
  video_url?: string
  captions?: {
    text: string
    start: number
    end: number
  }[]
  tts_text?: string
  tts_voice?: string
}

interface Lesson {
  lesson_id: string
  chapter_id?: string
  lesson_number?: number
  title: string
  description?: string
  steps: LessonStep[]
  review?: {
    summary?: string
    mission?: string
  }
}

interface StepResult {
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
  suggestions?: {
    pronunciation?: string
    fluency?: string
    accuracy?: string
    comprehension?: string
    confidence?: string
  } | string[]  // 支持对象或数组格式
  detailedSuggestions?: string[]  // 详细建议数组
  overallPractice?: string
  feedback?: string
  transcript?: string
  expectedAnswer?: string  // 🆕 正確答案
  errors?: CharacterError[]  // 🆕 錯誤字列表
  correctionFeedback?: string  // 🆕 糾正建議
  mispronounced?: MispronouncedEntry[]  // 🆕 读错的字
  apiResponse?: any
}

interface FullReport {
  overview: {
    total_score: number
    radar: {
      pronunciation: number
      fluency: number
      accuracy: number
      comprehension: number
      confidence: number
    }
  }
  per_question: Array<{
    scores: {
      pronunciation: number
      fluency: number
      accuracy: number
      comprehension: number
      confidence: number
      total: number
    }
    advice?: string
  }>
  recommendations: string[]
}

interface CurrentFeedback {
  score: number
  similarity?: number
  phonemeSimilarity?: number
  toneAccuracy?: number
  detailedScores?: {
    pronunciation: number
    fluency: number
    accuracy: number
    comprehension: number
    confidence: number
  }
  transcript?: string
  expectedAnswer: string | string[]
  bestMatchAnswer?: string
  errors?: CharacterError[]
  correctionFeedback?: string
  detailedAnalysis?: DetailedCharacterAnalysis
  slotErrors?: string[]
  slotMismatchPositions?: number[]
  suggestions?: Suggestions
  detailedSuggestions?: string[]
  overallPractice?: string
  mispronounced?: MispronouncedEntry[]
  passed: boolean
  fullResult?: any
  syllables?: SyllableData[]
}



export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string
  
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState('')
  const [isRetrying, setIsRetrying] = useState(false)
  const [stepResults, setStepResults] = useState<StepResult[]>([])
  const [attempts, setAttempts] = useState(0)
  const [showReport, setShowReport] = useState(false)
  const [fullReport, setFullReport] = useState<FullReport | null>(null)
  const [needsManualPlay, setNeedsManualPlay] = useState(false)

  // 🎉 課程完成慶祝畫面
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false)
  const [countdown, setCountdown] = useState(60)

  // ⭐ 樂觀 UI：追蹤背景評分任務
  const pendingScoresRef = useRef<Map<number, Promise<StepResult>>>(new Map())
  const [scoreStatus, setScoreStatus] = useState<Map<number, 'pending' | 'completed' | 'failed'>>(new Map())
  const [currentCaption, setCurrentCaption] = useState('')
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [availableDecks, setAvailableDecks] = useState<string[]>([])
  const [selectedDeck, setSelectedDeck] = useState('')
  const [isDeckInputOpen, setIsDeckInputOpen] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [showDeckSelector, setShowDeckSelector] = useState(false)
  const [flashcardStatus, setFlashcardStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  // 反饋狀態 - 作為 session 的一部分
  const [sessionState, setSessionState] = useState<'question' | 'feedback'>('question')
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null)
  const [currentFeedback, setCurrentFeedback] = useState<CurrentFeedback | null>(null)
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false)
  const [isPlayingCorrectAudio, setIsPlayingCorrectAudio] = useState(false)
  
  // 🔧 新增：錄音錯誤狀態（取代 alert）
  const [recordingError, setRecordingError] = useState<string | null>(null)

  // 🆕 音節反饋狀態
  const [showSyllableFeedback, setShowSyllableFeedback] = useState(false)
  const [currentSyllables, setCurrentSyllables] = useState<SyllableData[]>([])
  const [currentFeedbackScore, setCurrentFeedbackScore] = useState(0)

  // 👤 講師選擇相關
  const [currentInterviewer, setCurrentInterviewer] = useState<string>(DEFAULT_INTERVIEWER)
  const [showInterviewerSelector, setShowInterviewerSelector] = useState(false)

  // 📚 入門教程
  const [showTutorial, setShowTutorial] = useState(false)

  // 🏆 成就系統
  const [unlockedAchievement, setUnlockedAchievement] = useState<UnlockedAchievement | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasAutoplayedForStep = useRef<string>('') // �O���w�۰ʼ��񪺨B�J
  const flashcardStatusTimeout = useRef<number | null>(null)
  const reportSessionIdRef = useRef<string | null>(null)
  const hasGeneratedReportRef = useRef(false)

  useEffect(() => {
    hasGeneratedReportRef.current = false
    reportSessionIdRef.current = null
  }, [lessonId])

  // 📚 第一次進入時顯示教程
  useEffect(() => {
    if (!hasCompletedLessonTutorial()) {
      setShowTutorial(true)
    }
  }, [])

  // 🔧 修復：過濾掉括號內的拼音
  const removePinyin = (text: string): string => {
    // 移除括號內的內容（包含拼音）
    return text.replace(/\([^)]*\)/g, '').trim()
  }

  // 🔧 移除標點符號，避免 TTS 念出標點
  const removePunctuation = (text: string): string => {
    // 移除常見的中英文標點符號和引號，但保留空格和字母數字
    return text
      .replace(/[，,。.！!？?；;：:、「」『』【】《》〈〉（）()]/g, ' ')
      .replace(/["'"'']/g, '') // 移除所有引號
      .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
      .trim()
  }

  // 🔧 將數學符號轉換為英文單詞
  const convertSymbolsToWords = (text: string): string => {
    return text
      .replace(/\+/g, ' plus ')   // + → plus
      .replace(/=/g, ' equals ')  // = → equals
      .replace(/\s+/g, ' ')       // 清理多餘空格
      .trim()
  }

  // 載入課程
  useEffect(() => {
    async function loadLesson() {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/api/lessons/${lessonId}`)
        if (!response.ok) throw new Error('Failed to load lesson')
        const data = await response.json()

        console.log('📚 課程數據載入:', {
          lesson_id: data.lesson_id,
          chapter_id: data.chapter_id,
          title: data.title,
          steps_count: data.steps?.length || 0
        })

        // 檢查課程數據是否有效
        if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
          throw new Error('Lesson has no questions')
        }

        setLesson(data)
        setCurrentSubtitle(data.steps[0].teacher)
      } catch (err) {
        console.error('❌ 課程載入失敗:', err)
        setError(err instanceof Error ? err.message : '未知錯誤')
      } finally {
        setLoading(false)
      }
    }
    loadLesson()
  }, [lessonId])

  useEffect(() => {
    const decks = getFlashcardDecks()
    setAvailableDecks(decks)
    if (decks.length) {
      setSelectedDeck(decks[0])
    }
  }, [])

  useEffect(() => {
    return () => {
      if (flashcardStatusTimeout.current) {
        window.clearTimeout(flashcardStatusTimeout.current)
      }
    }
  }, [])

  // 👤 從 localStorage 讀取講師選擇
  useEffect(() => {
    const savedInterviewer = localStorage.getItem('selectedInterviewer')
    if (savedInterviewer) {
      setCurrentInterviewer(savedInterviewer)
    }
  }, [])

  // 👤 處理講師選擇
  const handleSelectInterviewer = (interviewerId: string) => {
    setCurrentInterviewer(interviewerId)
    localStorage.setItem('selectedInterviewer', interviewerId)
    console.log('✅ Interviewer changed to:', interviewerId)
  }

  // 🎤 當講師切換時，重新播放當前題目的 TTS
  useEffect(() => {
    if (!lesson || sessionState !== 'question') return

    const currentStepData = lesson.steps[currentStepIndex]
    if (!currentStepData) return

    // 如果當前題目沒有影片，重新播放 TTS（使用新講師的聲音）
    if (!currentStepData.video_url) {
      const ttsText = currentStepData.tts_text || currentStepData.teacher
      playTTS(ttsText)
      console.log('🎤 Replaying TTS with new interviewer voice:', currentInterviewer)
    }
  }, [currentInterviewer]) // 只監聽講師切換

  // 🔧 修復：分離中文和英文，使用不同的 TTS，保持順序
  const playTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    // 處理文本：移除拼音 → 轉換符號 → 移除標點
    let cleanText = removePinyin(text)
    cleanText = convertSymbolsToWords(cleanText)
    cleanText = removePunctuation(cleanText)

    // 🔧 按順序分離文本段落（保持原始順序）
    interface TextSegment {
      text: string
      isChinese: boolean
    }

    const segments: TextSegment[] = []

    // 使用正則匹配中英文，並保持順序
    const pattern = /([a-zA-Z\s.,!?'"-]+)|([^a-zA-Z\s.,!?'"-]+)/g
    let match

    while ((match = pattern.exec(cleanText)) !== null) {
      const text = match[0].trim()
      if (!text) continue

      const isChinese = !match[1] // 如果不是英文組，就是中文
      segments.push({ text, isChinese })
    }

    // 🎤 獲取當前講師的語音配置
    const voiceConfig = getInterviewerVoice(currentInterviewer)

    // 獲取語音引擎
    const voices = window.speechSynthesis.getVoices()

    // 選擇英文語音
    const englishVoice = voices.find(voice =>
      voice.lang === 'en-US' &&
      (voice.name.includes('Google') ||
       voice.name.includes('Microsoft') ||
       voice.name.includes('Natural'))
    ) || voices.find(voice => voice.lang.startsWith('en'))

    // 🎤 選擇中文語音：優先使用講師的指定語音
    let chineseVoice: SpeechSynthesisVoice | undefined

    // 1. 嘗試使用講師的首選語音名稱
    if (voiceConfig.preferredVoiceName) {
      const preferredName = voiceConfig.preferredVoiceName
      chineseVoice = voices.find(voice =>
        voice.name === preferredName ||
        voice.name.includes(preferredName)
      )
    }

    // 2. 如果找不到首選語音，根據語言和性別選擇
    if (!chineseVoice) {
      chineseVoice = voices.find(voice => {
        const langMatch = voice.lang.includes(voiceConfig.lang.split('-')[0])
        const genderMatch = voiceConfig.gender === 'female'
          ? (voice.name.includes('Female') || voice.name.includes('female') ||
             voice.name.includes('女') || voice.name.includes('Chen') ||
             voice.name.includes('Xiao') || voice.name.includes('Mei'))
          : (voice.name.includes('Male') || voice.name.includes('male') ||
             voice.name.includes('男') || voice.name.includes('Yun') ||
             voice.name.includes('Chuan'))
        return langMatch && genderMatch
      })
    }

    // 3. 備用方案：按語言選擇
    if (!chineseVoice) {
      chineseVoice = voices.find(voice =>
        voice.lang.includes(voiceConfig.lang) ||
        voice.lang.includes('zh-TW') ||
        voice.lang.includes('zh-Hant') ||
        voice.name.includes('Taiwan') ||
        voice.name.includes('臺灣')
      )
    }

    // 4. 最終備用：任何中文語音
    if (!chineseVoice) {
      chineseVoice = voices.find(voice => voice.lang.includes('zh'))
    }

    // 🔧 按順序播放每個段落，使用正確的語音引擎
    let currentUtterance: SpeechSynthesisUtterance | null = null

    segments.forEach((segment, index) => {
      const utterance = new SpeechSynthesisUtterance(segment.text)

      if (segment.isChinese) {
        // 🎤 中文段落：使用講師的語音配置
        if (chineseVoice) utterance.voice = chineseVoice
        utterance.lang = voiceConfig.lang
        utterance.rate = voiceConfig.rate
        utterance.pitch = voiceConfig.pitch
      } else {
        // 英文段落
        if (englishVoice) utterance.voice = englishVoice
        utterance.lang = 'en-US'
        utterance.rate = 0.9
        utterance.pitch = 1.0
      }

      utterance.volume = 1.0

      // 🔧 使用 onend 事件鏈接下一個段落，確保順序播放
      if (index < segments.length - 1) {
        utterance.onend = () => {
          // 播放完成後自動播放下一個
        }
      }

      window.speechSynthesis.speak(utterance)
      currentUtterance = utterance
    })
  }  // 確保語音列表已載入
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // 初始化語音列表
      let voices = window.speechSynthesis.getVoices()
      
      // 如果語音列表為空，等待加載
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices()
        }
      }
    }
  }, [])

  // ⚠️ 頁面離開警告：防止在背景評分進行時離開
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 檢查是否有待評分的題目
      const hasPendingScores = pendingScoresRef.current.size > 0

      if (hasPendingScores) {
        const message = 'Scoring is not yet complete. Are you sure you want to leave? Incomplete scores will be lost.'
        e.preventDefault()
        e.returnValue = message // 標準做法
        return message // 某些瀏覽器需要
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, []) // 空依賴，只在組件掛載時設置一次

  // 🎉 完成慶祝畫面：倒數計時器和自動返回 dashboard
  useEffect(() => {
    if (!showCompletionCelebration) return

    console.log('🎉 啟動倒數計時器，60 秒後自動返回 dashboard')

    // 每秒更新倒數
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1
        if (newCount <= 0) {
          clearInterval(countdownInterval)
          console.log('⏰ 倒數結束，返回 dashboard')
          router.push('/dashboard')
          return 0
        }
        return newCount
      })
    }, 1000)

    return () => {
      clearInterval(countdownInterval)
    }
  }, [showCompletionCelebration, router])

  // 🎊 完成慶祝畫面：觸發彩帶動畫
  useEffect(() => {
    if (!showCompletionCelebration) return

    console.log('🎊 觸發彩帶動畫!')

    // 初始爆炸
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })

    // 持續彩帶效果（前 3 秒）
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    return () => {
      clearInterval(interval)
    }
  }, [showCompletionCelebration])

  // 🎥 自動播放影片（每題只播放一次，不重複）
  useEffect(() => {
    if (sessionState !== 'question' || !lesson) return
    
    const currentStepData = lesson.steps[currentStepIndex]
    if (!currentStepData) return
    
    const stepKey = `${lesson.lesson_id}-${currentStepData.id}`
    
    // 如果這一題已經自動播放過，就不再播放
    if (hasAutoplayedForStep.current === stepKey) return
    
    if (currentStepData.video_url && videoRef.current) {
      const video = videoRef.current
      hasAutoplayedForStep.current = stepKey
      
      // 重置影片到開頭
      video.currentTime = 0
      video.muted = true // 靜音以允許自動播放
      
      // 嘗試自動播放
      video.play().then(() => {
        // 播放成功後立即取消靜音，讓用戶聽到聲音
        setTimeout(() => {
          if (video) {
            video.muted = false
            video.volume = 1.0
          }
        }, 100) // 延遲 100ms 確保播放已開始
      }).catch(err => {
        console.log('Auto-play blocked, user needs to click play button:', err)
        setNeedsManualPlay(true)
      })
    } else if (!currentStepData.video_url) {
      // 沒有影片，播放 TTS
      const ttsText = currentStepData.tts_text || currentStepData.teacher
      playTTS(ttsText)
      setCurrentSubtitle(currentStepData.teacher)
    }
  }, [sessionState, currentStepIndex, lesson])

  // 🎥 視頻時間更新處理器，用於同步字幕
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !lesson) return
    
    const currentStep = lesson.steps[currentStepIndex]
    if (!currentStep?.captions) return
    
    const currentTime = videoRef.current.currentTime
    const caption = currentStep.captions.find(
      cap => currentTime >= cap.start && currentTime <= cap.end
    )
    
    setCurrentCaption(caption?.text || '')
  }

  // 🎥 視頻播放/暫停控制
  const toggleVideoPlayback = () => {
    if (!videoRef.current) return
    
    if (isVideoPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsVideoPlaying(!isVideoPlaying)
  }

  // 🎯 反饋頁面 - 播放使用者錄音
  const playUserRecording = () => {
    if (!currentAudioBlob || isPlayingUserAudio) return
    
    setIsPlayingUserAudio(true)
    const url = URL.createObjectURL(currentAudioBlob)
    const audio = new Audio(url)
    
    audio.onended = () => {
      setIsPlayingUserAudio(false)
      URL.revokeObjectURL(url)
    }
    
    audio.onerror = () => {
      setIsPlayingUserAudio(false)
      URL.revokeObjectURL(url)
      alert('播放錄音失敗')
    }
    
    audio.play()
  }

  // 🎯 反饋頁面 - 播放正確答案 TTS
  const playCorrectAnswer = () => {
    if (!currentFeedback || isPlayingCorrectAudio) return
    
    const expectedAnswer = Array.isArray(currentFeedback.expectedAnswer)
      ? currentFeedback.expectedAnswer[0]
      : currentFeedback.expectedAnswer
    
    if (!expectedAnswer) return
    
    setIsPlayingCorrectAudio(true)
    window.speechSynthesis.cancel()
    
    // 使用現有的 playTTS 邏輯
    const cleanText = removePinyin(expectedAnswer)
    const finalText = removePunctuation(convertSymbolsToWords(cleanText))
    
    const utterance = new SpeechSynthesisUtterance(finalText)
    const voices = window.speechSynthesis.getVoices()
    
    // 選擇台灣中文語音
    const preferredVoices = [
      'Microsoft HsiaoChen - Chinese (Taiwan)',
      'Microsoft Yating - Chinese (Taiwan)',
      'Google 國語（臺灣）',
      'Mei-Jia',
      'Sin-ji',
      'Ting-Ting'
    ]
    
    let chineseVoice = voices.find(voice => 
      preferredVoices.some(preferred => voice.name.includes(preferred))
    )
    
    if (!chineseVoice) {
      chineseVoice = voices.find(voice => 
        voice.lang.includes('zh-TW') || 
        voice.lang.includes('zh-Hant') ||
        voice.name.includes('Taiwan') ||
        voice.name.includes('臺灣')
      )
    }
    
    if (!chineseVoice) {
      chineseVoice = voices.find(voice => voice.lang.includes('zh'))
    }
    
    if (chineseVoice) utterance.voice = chineseVoice
    utterance.lang = 'zh-TW'
    utterance.rate = 0.85
    utterance.pitch = 1.05
    utterance.volume = 1.0
    
    utterance.onend = () => {
      setIsPlayingCorrectAudio(false)
    }
    
    utterance.onerror = () => {
      setIsPlayingCorrectAudio(false)
    }
    
    window.speechSynthesis.speak(utterance)
  }

  // 🎯 反饋頁面 - 重試錄音
  const handleRetryRecording = () => {
    setSessionState('question')
    setCurrentAudioBlob(null)
    setCurrentFeedback(null)
    setIsRetrying(true)
    setNeedsManualPlay(false)  // 🔧 改為 false，允許立即錄音
    setIsPlayingUserAudio(false)
    setIsPlayingCorrectAudio(false)

    // 停止任何正在播放的音頻
    window.speechSynthesis.cancel()
  }

  // 🎯 手動控制 - 上一題
  const handlePreviousQuestion = () => {
    if (!lesson || currentStepIndex <= 0) return

    const prevIndex = currentStepIndex - 1
    const prevStep = lesson.steps[prevIndex]

    console.log('⬅️ 手動切換到上一題:', prevIndex + 1)

    setCurrentStepIndex(prevIndex)
    setCurrentSubtitle(prevStep?.teacher || '')
    setSessionState('question')
    setIsRecording(false)
    setIsRetrying(false)
    setAttempts(0)
    setNeedsManualPlay(false)
    setCurrentCaption('')
    setRecordingError(null)
    setCurrentAudioBlob(null)
    setCurrentFeedback(null)

    // 停止任何正在播放的音頻
    window.speechSynthesis.cancel()
  }

  // 🎯 手動控制 - 下一題
  const handleManualNextQuestion = () => {
    if (!lesson || currentStepIndex >= lesson.steps.length - 1) return

    const nextIndex = currentStepIndex + 1
    const nextStep = lesson.steps[nextIndex]

    console.log('➡️ 手動切換到下一題:', nextIndex + 1)

    setCurrentStepIndex(nextIndex)
    setCurrentSubtitle(nextStep?.teacher || '')
    setSessionState('question')
    setIsRecording(false)
    setIsRetrying(false)
    setAttempts(0)
    setNeedsManualPlay(false)
    setCurrentCaption('')
    setRecordingError(null)
    setCurrentAudioBlob(null)
    setCurrentFeedback(null)

    // 停止任何正在播放的音頻
    window.speechSynthesis.cancel()

    // 重新播放題目
    if (lesson) {
      const currentStep = lesson.steps[currentStepIndex]
      if (currentStep) {
        if (currentStep.video_url && videoRef.current) {
          videoRef.current.currentTime = 0
          videoRef.current.play()
        } else {
          const ttsText = currentStep.tts_text || currentStep.teacher
          playTTS(ttsText)
        }
      }
    }
  }

  // 🏁 手動結束課程（即使未完成所有題目）
  const handleFinishLesson = () => {
    if (!lesson) return

    console.log('🏁 用戶手動結束課程')
    console.log('  已完成題目:', stepResults.length, '/', lesson.steps.length)

    // 如果沒有任何作答，提示用戶
    if (stepResults.length === 0) {
      const confirmFinish = window.confirm(
        'You haven\'t answered any questions yet. Are you sure you want to end the lesson?'
      )
      if (!confirmFinish) return
    }

    // 如果有未完成的題目，再次確認
    if (stepResults.length < lesson.steps.length && stepResults.length > 0) {
      const confirmFinish = window.confirm(
        `You have completed ${stepResults.length}/${lesson.steps.length} questions. Are you sure you want to end the lesson and view your results?`
      )
      if (!confirmFinish) return
    }

    // 調用 finalizeLesson，即使只做了部分題目
    console.log('✅ 確認結束，調用 finalizeLesson')
    if (stepResults.length > 0) {
      finalizeLesson(stepResults)
    } else {
      // 如果沒有任何結果，直接返回 dashboard
      router.push('/dashboard')
    }
  }

  // 🎯 反饋頁面 - 下一題
  const handleNextQuestion = () => {
    if (!lesson || !currentFeedback) return
    
    const currentStep = lesson.steps[currentStepIndex]
    const { score, detailedScores, fullResult } = currentFeedback
    
    const baseResult: StepResult = {
      stepId: currentStep.id,
      question: currentStep.teacher,
      score: Math.round(score),
      attempts: attempts,
      passed: score >= 75,
      detailedScores: detailedScores || {
        pronunciation: Math.round(score),
        fluency: Math.round(score),
        accuracy: Math.round(score),
        comprehension: Math.round(score),
        confidence: Math.round(score)
      },
      suggestions: fullResult.suggestions,
      overallPractice: fullResult.overallPractice,
      feedback: fullResult.feedback || fullResult.advice || "Great job!",
      transcript: fullResult.transcript || `Response for: ${currentStep.teacher}`,
      apiResponse: fullResult
    }
    
    const existingIndex = stepResults.findIndex(result => result.stepId === currentStep.id)
    let allResults = stepResults
    if (existingIndex === -1) {
      allResults = [...stepResults, baseResult]
      setStepResults(allResults)
    }
    
    setSessionState('question')
    setCurrentAudioBlob(null)
    setCurrentFeedback(null)
    setIsRetrying(false)
    setNeedsManualPlay(false)
    setIsPlayingUserAudio(false)
    setIsPlayingCorrectAudio(false)
    
    window.speechSynthesis.cancel()
    
    if (allResults.length >= lesson.steps.length) {
      console.log('✅ Course completed! Total results:', allResults.length)
      finalizeLesson(allResults.slice(0, lesson.steps.length))
      return
    }
    
    if (currentStepIndex < lesson.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
      setAttempts(0)
    }
  }



  // 開始錄音
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

      mediaRecorder.start()
      setIsRecording(true)
      setAttempts(attempts + 1)

      // 🔊 音效與觸覺反饋
      sounds.recordStart()
      haptic.recordStart()

      // 📊 追蹤錄音次數（用於成就）
      trackRecording()
    } catch (err) {
      console.error('無法啟動麥克風:', err)
      alert('請允許使用麥克風')
    }
  }

  // 停止錄音並分析
  // 🔧 修復：調用新的 /api/score 端點進行評分
  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !lesson) return

    mediaRecorderRef.current.stop()
    setIsRecording(false)
    setRecordingError(null) // 🔧 清除之前的錯誤

    // 🔊 音效與觸覺反饋
    sounds.recordStop()
    haptic.recordStop()

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      
      console.log('🎤 錄音完成')
      console.log('📊 音頻大小:', audioBlob.size, 'bytes')
      console.log('📊 音頻類型:', audioBlob.type)
      
      if (audioBlob.size === 0) {
        console.error('❌ 音頻檔案為空！')
        setRecordingError('Recording failed: Audio file is empty. Please try again.')
        setIsRetrying(false)
        setNeedsManualPlay(false)
        return
      }
      
      if (audioBlob.size < 1000) {
        console.warn('⚠️ 音頻檔案太小，可能錄音時間不足')
      }
      
      try {
        const currentStep = lesson.steps[currentStepIndex]

        // ⭐ 樂觀 UI：創建佔位結果（立即）
        const placeholderResult: StepResult = {
          stepId: currentStep.id,
          question: currentStep.teacher,
          score: -1,  // -1 表示待評分
          attempts: attempts + 1,
          passed: false,
          transcript: '評分中...',
          expectedAnswer: Array.isArray(currentStep.expected_answer)
            ? currentStep.expected_answer[0]
            : currentStep.expected_answer
        }

        // ⭐ 立即添加到結果列表
        const allResults = [...stepResults, placeholderResult]
        setStepResults(allResults)

        console.log(`⚡ 樂觀 UI：題目 ${currentStep.id} 已添加（待評分）`)

        // ⭐ 更新狀態：評分中
        setScoreStatus(prev => new Map(prev).set(currentStep.id, 'pending'))

        // ⭐ 啟動評分任務（等待結果以顯示音節反饋）
        const scorePromise = scoreInBackground(audioBlob, currentStep, currentStep.id, attempts)
        pendingScoresRef.current.set(currentStep.id, scorePromise)

        console.log(`📡 評分已啟動：題目 ${currentStep.id}`)

        // 🆕 等待評分結果以顯示音節反饋
        try {
          const scoreResult = await scorePromise
          console.log('📊 評分結果:', scoreResult)

          // 🔊 根據分數播放音效和觸覺反饋
          sounds.forScore(scoreResult.score)
          haptic.forScore(scoreResult.score)

          // 如果有音節數據，顯示音節反饋面板
          if (scoreResult.apiResponse?.syllables && scoreResult.apiResponse.syllables.length > 0) {
            setCurrentSyllables(scoreResult.apiResponse.syllables)
            setCurrentFeedbackScore(scoreResult.score)
            setShowSyllableFeedback(true)
            console.log('🎯 顯示音節反饋面板')
          } else {
            // 沒有音節數據，直接進入下一題
            handleNextAfterFeedback(allResults)
          }
        } catch (error) {
          console.error('評分等待失敗:', error)
          // 🔊 失敗音效
          sounds.error()
          // 評分失敗也進入下一題
          handleNextAfterFeedback(allResults)
        }
        
      } catch (err) {
        console.error('❌ 評分錯誤:', err)
        const errorMessage = err instanceof Error ? err.message : '未知錯誤'
        alert(`Scoring failed: ${errorMessage}\n\nPlease check:\n1. Is the backend server running on port 8082?\n2. Are microphone permissions granted?\n3. Was the recording duration sufficient?`)
        setIsRetrying(false)
        setNeedsManualPlay(false)
      }

      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
    }
  }

  // 🆕 處理音節反饋後進入下一題
  const handleNextAfterFeedback = (allResults: StepResult[]) => {
    setShowSyllableFeedback(false)
    setCurrentSyllables([])
    setCurrentFeedbackScore(0)

    // 檢查是否為最後一題
    if (allResults.length >= lesson!.steps.length) {
      console.log('🚀 所有題目已完成，顯示慶祝畫面！')
      finalizeLesson(allResults.slice(0, lesson!.steps.length))
    } else {
      // 進入下一題
      const nextIndex = currentStepIndex + 1
      const nextStep = lesson!.steps[nextIndex]

      console.log(`⚡ 進入下一題 ${nextIndex + 1}/${lesson!.steps.length}`)

      setCurrentStepIndex(nextIndex)
      setCurrentSubtitle(nextStep?.teacher || '')
      setSessionState('question')
      setIsRecording(false)
      setIsRetrying(false)
      setAttempts(0)
      setNeedsManualPlay(false)
      setCurrentCaption('')
      setRecordingError(null)

      console.log('✅ 已切換到題目', nextIndex + 1)
    }
  }

  // 🆕 音節反饋面板的「下一題」按鈕處理
  const handleSyllableFeedbackNext = () => {
    handleNextAfterFeedback(stepResults)
  }

  // 🆕 音節反饋面板的「重試」按鈕處理
  const handleSyllableFeedbackRetry = () => {
    setShowSyllableFeedback(false)
    setCurrentSyllables([])
    setIsRetrying(true)
    setAttempts(prev => prev + 1)
  }

  // ⭐ 背景評分函數
  const scoreInBackground = async (
    audioBlob: Blob,
    currentStep: any,
    stepId: number,
    attemptCount: number
  ): Promise<StepResult> => {
    try {
      console.log(`📡 背景評分開始：題目 ${stepId}`)

      // 構建 FormData
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const expectedAnswers = Array.isArray(currentStep.expected_answer)
        ? currentStep.expected_answer
        : [currentStep.expected_answer]

      formData.append('expectedAnswer', JSON.stringify(expectedAnswers))
      formData.append('questionId', stepId.toString())
      formData.append('lessonId', lessonId)

      // 調用評分 API
      const response = await fetch(`${API_BASE}/api/score`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`評分失敗: ${response.status}`)
      }

      const result = await response.json()

      // 處理轉錄結果（使用簡化邏輯）
      const rawTranscript = result.transcript || ''
      const userTranscript = rawTranscript
        .replace(/\[模糊\]/g, '')
        .replace(/\[.*?\]/g, '')
        .trim()

      // 計算評分
      const backendScore = result.overall_score || result.total_score || result.score || 0
      const detailedScores = result.scores || result.detailed_scores || null

      // 使用後端分數作為最終分數
      const finalScore = Math.round(backendScore)
      const passed = finalScore >= 75

      // 構建最終結果
      const finalResult: StepResult = {
        stepId: stepId,
        question: currentStep.teacher,
        score: finalScore,
        attempts: attemptCount + 1,
        passed,
        detailedScores: detailedScores || {
          pronunciation: finalScore,
          fluency: finalScore,
          accuracy: finalScore,
          comprehension: finalScore,
          confidence: finalScore
        },
        transcript: rawTranscript,
        expectedAnswer: Array.isArray(currentStep.expected_answer)
          ? currentStep.expected_answer[0]
          : currentStep.expected_answer,
        suggestions: result.suggestions,
        feedback: result.feedback || '',
        mispronounced: result.mispronounced || [],
        apiResponse: result
      }

      console.log(`✅ 背景評分完成：題目 ${stepId}，分數 ${finalScore}`)

      // 更新結果
      updateStepResult(stepId, finalResult)

      return finalResult

    } catch (error) {
      console.error(`❌ 背景評分失敗：題目 ${stepId}`, error)

      // 使用 fallback 結果
      const fallbackResult: StepResult = {
        stepId: stepId,
        question: currentStep.teacher,
        score: 60, // fallback 分數
        attempts: attemptCount + 1,
        passed: false,
        transcript: '評分失敗',
        expectedAnswer: Array.isArray(currentStep.expected_answer)
          ? currentStep.expected_answer[0]
          : currentStep.expected_answer,
        feedback: '評分服務暫時不可用，已使用預設分數',
        apiResponse: { error: error instanceof Error ? error.message : '未知錯誤' }
      }

      updateStepResult(stepId, fallbackResult)

      return fallbackResult

    } finally {
      // 移除待處理任務
      pendingScoresRef.current.delete(stepId)
      setScoreStatus(prev => {
        const newMap = new Map(prev)
        newMap.set(stepId, 'completed')
        return newMap
      })
    }
  }

  // ⭐ 樂觀 UI：更新已評分的結果
  const updateStepResult = (stepId: number, result: StepResult) => {
    console.log(`📊 更新評分結果：題目 ${stepId}，分數 ${result.score}`)

    setStepResults(prev => {
      const updated = prev.map(r => r.stepId === stepId ? result : r)

      // 檢查是否所有評分都完成
      const allCompleted = updated.every(r => r.score !== -1)
      const hasAllSteps = updated.length >= (lesson?.steps.length || 0)

      console.log(`  進度: ${updated.filter(r => r.score !== -1).length}/${updated.length} 題已評分`)

      // 如果所有評分完成且所有題目已答，觸發報表生成
      if (allCompleted && hasAllSteps && !hasGeneratedReportRef.current) {
        console.log('🎉 所有評分完成，準備生成報表')
        setTimeout(() => {
          if (lesson) {
            finalizeLesson(updated)
          }
        }, 100)
      }

      return updated
    })
  }

  // 生成完整報表（調用 analysis-core 邏輯）
  const generateFullReport = async (
    finalResults?: typeof stepResults,
    options?: {
      sessionId?: string | null
      skipImmediateFallback?: boolean
    }
  ) => {
    if (!lesson) return

    const resultsToUse = finalResults || stepResults
    console.log('📊 Generating report for', resultsToUse.length, 'questions')

    const sessionId = options?.sessionId || `lesson-${lessonId}-${Date.now()}`
    const skipFallback = options?.skipImmediateFallback ?? false

    const runFallback = () => {
      const simpleReport = generateSimpleReport(resultsToUse)
      setFullReport(simpleReport)
      const savedId = saveToHistory(simpleReport, resultsToUse, sessionId)
      if (savedId) {
        reportSessionIdRef.current = savedId
      }
      setShowReport(true)
    }

    try {
      const items = resultsToUse.map((result, index) => ({
        index: index,
        question: result.question,
        answer: 'User audio response',
        thinkingTime: 0,
        answeringTime: 10,
        lessonId: lessonId,
        stepId: result.stepId,
        expectedAnswer: lesson.steps[index].expected_answer
      }))

      const response = await fetch(`${API_BASE}/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          interviewType: lessonId,
          items
        })
      })

      if (!response.ok) throw new Error('完整報表產生失敗')
      
      const report = await response.json()
      setFullReport(report)
      
      const savedId = saveToHistory(report, resultsToUse, sessionId)
      if (savedId) {
        reportSessionIdRef.current = savedId
      }
      
      setShowReport(true)
    } catch (err) {
      console.error('完整報表產生失敗:', err)
      if (!skipFallback) {
        runFallback()
      }
    }
  }



  // 生成簡易報表（當後端失敗時）
  const generateSimpleReport = (resultsToUse?: typeof stepResults): FullReport => {
    const results = resultsToUse || stepResults
    console.log('📝 Generating simple report for', results.length, 'questions')
    
    const totalScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    
    // 從詳細評分計算雷達圖數據
    let pronunciation = 0, fluency = 0, accuracy = 0, comprehension = 0, confidence = 0
    let validCount = 0
    
    results.forEach(result => {
      if (result.detailedScores) {
        pronunciation += result.detailedScores.pronunciation || 0
        fluency += result.detailedScores.fluency || 0
        accuracy += result.detailedScores.accuracy || 0
        comprehension += result.detailedScores.comprehension || 0
        confidence += result.detailedScores.confidence || 0
        validCount++
      }
    })
    
    // 如果沒有詳細評分，使用總分作為基準
    if (validCount === 0) {
      pronunciation = fluency = accuracy = comprehension = confidence = totalScore
    } else {
      pronunciation = Math.round(pronunciation / validCount)
      fluency = Math.round(fluency / validCount)
      accuracy = Math.round(accuracy / validCount)
      comprehension = Math.round(comprehension / validCount)
      confidence = Math.round(confidence / validCount)
    }

    return {
      overview: {
        total_score: totalScore,
        radar: {
          pronunciation,
          fluency,
          accuracy,
          comprehension,
          confidence
        }
      },
      per_question: results.map(result => ({
        scores: {
          pronunciation: result.detailedScores?.pronunciation || totalScore,
          fluency: result.detailedScores?.fluency || totalScore,
          accuracy: result.detailedScores?.accuracy || totalScore,
          comprehension: result.detailedScores?.comprehension || totalScore,
          confidence: result.detailedScores?.confidence || totalScore,
          total: result.score
        },
        advice: result.score < 75 ? "Continue practicing this question." : "Good job!"
      })),
      recommendations: [
        totalScore < 75 ? "Continue practicing to improve your overall performance." : "",
        pronunciation < 75 ? "Focus on pronunciation accuracy." : "",
        fluency < 75 ? "Work on speaking more fluently." : ""
      ].filter(Boolean)
    }
  }

  // 儲存到 localStorage 學習歷史
  const saveToHistory = (
    report: any,
    resultsToUse?: typeof stepResults,
    existingSessionId?: string | null
  ): string | null => {
    if (!lesson) return null

    const results = resultsToUse || stepResults
    console.log('💾 Saving to history:', results.length, 'questions')

    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0)
    const sessionId = existingSessionId || `lesson-${lessonId}-${Date.now()}`
    const sessionData = {
      sessionId,
      lessonId: lessonId,
      lessonTitle: lesson.title,
      completedAt: new Date().toISOString(),
      totalScore: report.overview.total_score,
      questionsCount: results.length,
      totalAttempts: totalAttempts,
      radar: report.overview.radar,
      results: results.map((r, index) => ({
        stepId: r.stepId,
        question: r.question,
        score: r.score,
        attempts: r.attempts,
        passed: r.passed,
        detailedScores: r.detailedScores || {
          pronunciation: r.score,
          fluency: r.score,
          accuracy: r.score,
          comprehension: r.score,
          confidence: r.score
        },
        suggestions: r.suggestions || null,
        detailedSuggestions: r.detailedSuggestions || null,
        overallPractice: r.overallPractice || null,
        mispronounced: r.mispronounced || null,
        feedback: r.feedback || (
          r.score >= 90 ? "Excellent performance! Your pronunciation and fluency are outstanding." :
          r.score >= 75 ? "Good job! You passed this question successfully." :
          "Keep practicing! Focus on pronunciation and try to speak more clearly."
        ),
        transcript: r.transcript || `User response for "${r.question.replace(/\([^)]*\)/g, '').trim()}"`
      }))
    }

    try {
      const existingHistory = localStorage.getItem('lessonHistory')
      const history = existingHistory ? JSON.parse(existingHistory) : []
      if (existingSessionId) {
        const idx = history.findIndex((entry: any) => entry.sessionId === existingSessionId)
        if (idx >= 0) {
          history[idx] = sessionData
        } else {
          history.push(sessionData)
        }
      } else {
        history.push(sessionData)
      }
      localStorage.setItem('lessonHistory', JSON.stringify(history))

      console.log('✅ 已儲存到學習歷史:', {
        sessionId: sessionData.sessionId,
        questionsCount: sessionData.questionsCount,
        resultsLength: sessionData.results.length
      })

      sessionData.results.forEach((result, index) => {
        console.log(`  Question ${index + 1}: ${result.question} (Score: ${result.score})`)
      })
    } catch (err) {
      console.error('❌ 儲存學習歷史失敗:', err)
    }

    return sessionData.sessionId
  }

  const finalizeLesson = async (results: StepResult[]) => {
    console.log('🔔 ========== finalizeLesson 被調用 ==========')
    console.log('  📊 參數:', {
      resultsLength: results.length,
      resultsPreview: results.slice(0, 2).map(r => ({ stepId: r.stepId, score: r.score }))
    })
    console.log('  📊 當前狀態:', {
      hasLesson: !!lesson,
      lessonId: lesson?.lesson_id,
      lessonStepsLength: lesson?.steps?.length,
      hasGeneratedReportRef: hasGeneratedReportRef.current,
      currentStepResultsLength: stepResults.length,
      currentShowReport: showReport
    })

    // 檢查 1: lesson 是否存在
    if (!lesson) {
      console.error('❌ 無法生成報表：lesson 不存在')
      console.error('  → 這不應該發生，請檢查 lesson 狀態')
      return
    }

    // 檢查 2: results 是否有數據
    if (results.length === 0) {
      console.warn('⚠️ 無法生成報表：沒有任何作答記錄')
      console.warn('  → 返回 dashboard')
      router.push('/dashboard')
      return
    }

    // 檢查 3: 是否已經生成過報表
    if (hasGeneratedReportRef.current) {
      console.warn('⚠️ 報表已生成，跳過重複生成')
      console.warn('  → 這是正常的，避免重複調用')
      console.warn('  → 當前 showReport:', showReport)
      return
    }

    // ⭐ 新增：檢查並等待所有背景評分完成
    const pendingResults = results.filter(r => r.score === -1)
    if (pendingResults.length > 0) {
      console.log('⏳ 檢測到背景評分尚未完成，等待中...')
      console.log('  待評分題目:', pendingResults.map(r => r.stepId))
      console.log('  待評分數量:', pendingResults.length)

      try {
        // 收集所有待完成的評分 Promise
        const pendingPromises = pendingResults
          .map(r => pendingScoresRef.current.get(r.stepId))
          .filter((p): p is Promise<StepResult> => p !== undefined)

        console.log('  等待 Promise 數量:', pendingPromises.length)

        if (pendingPromises.length > 0) {
          console.log('  ⏳ 開始等待所有評分完成...')
          await Promise.all(pendingPromises)
          console.log('  ✅ 所有背景評分已完成!')

          // 清理已完成的 Promise
          pendingResults.forEach(r => {
            pendingScoresRef.current.delete(r.stepId)
          })
        }
      } catch (error) {
        console.error('  ❌ 等待背景評分時發生錯誤:', error)
        // 繼續執行，使用當前可用的結果
      }
    } else {
      console.log('✅ 所有評分已完成，無需等待')
    }

    try {
      console.log('✅ 所有檢查通過，開始儲存課程...')
      hasGeneratedReportRef.current = true

      // 步驟 1: 生成簡易報表（用於儲存）
      console.log('  📝 步驟 1/3: 調用 generateSimpleReport')
      const simpleReport = generateSimpleReport(results)
      console.log('  ✅ 報表生成成功:', {
        totalScore: simpleReport.overview.total_score,
        radarData: simpleReport.overview.radar,
        questionsCount: simpleReport.per_question.length
      })

      // 步驟 2: 保存歷史記錄
      console.log('  📝 步驟 2/3: 保存歷史記錄')
      const sessionId = saveToHistory(simpleReport, results, reportSessionIdRef.current)
      if (sessionId) {
        reportSessionIdRef.current = sessionId
        console.log('  ✅ 歷史記錄已保存，sessionId:', sessionId)
      }

      // 步驟 3: 顯示完成慶祝畫面
      console.log('  📝 步驟 3/3: 顯示完成慶祝畫面 🎉')
      setShowCompletionCelebration(true)
      setCountdown(60)
      console.log('  ✅ 慶祝畫面已啟動!')

      // 🎵 播放完成音效
      sounds.achievement()

      // 🏆 步驟 4: 檢查並解鎖成就
      console.log('  📝 步驟 4: 檢查成就解鎖')
      trackLessonComplete(simpleReport.overview.total_score)
      const newAchievements = checkAndUnlockAchievements()
      if (newAchievements.length > 0) {
        console.log('  🏆 解鎖新成就:', newAchievements.map(a => a.name))
        // 顯示第一個解鎖的成就
        setUnlockedAchievement(newAchievements[0])
        sounds.achievement()
      }

      console.log('🎉 ========== finalizeLesson 執行完成 ==========')

    } catch (error) {
      console.error('❌ ========== finalizeLesson 執行失敗 ==========')
      console.error('  錯誤詳情:', error)
      console.error('  錯誤堆疊:', error instanceof Error ? error.stack : '無堆疊')

      // 重置標記，允許重試
      hasGeneratedReportRef.current = false
      console.log('  🔄 已重置 hasGeneratedReportRef，允許重試')

      // 用戶提示
      alert('報表生成失敗，請重新整理頁面或聯繫支援。\n\n錯誤: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  useEffect(() => {
    // 簡化日誌，只在關鍵時刻打印
    if (!lesson || hasGeneratedReportRef.current || !lesson.steps || lesson.steps.length === 0) {
      return
    }

    const shouldFinalize = stepResults.length >= lesson.steps.length && stepResults.length > 0

    if (shouldFinalize) {
      console.log('🔄 ========== useEffect 檢測到課程完成 ==========')
      console.log('  📊 狀態:', {
        stepResultsLength: stepResults.length,
        lessonStepsLength: lesson.steps.length
      })
      console.log('  ✅ 調用 finalizeLesson (from useEffect)')

      const resultsToUse = stepResults.slice(0, lesson.steps.length)
      finalizeLesson(resultsToUse)
    }
  }, [lesson, stepResults])



  // 手動播放按鈕
  const handleManualPlay = () => {
    const currentStep = lesson?.steps[currentStepIndex]
    if (currentStep) {
      const ttsText = currentStep.tts_text || currentStep.teacher
      playTTS(ttsText)
      setCurrentSubtitle(currentStep.teacher)
      setNeedsManualPlay(false)
      setIsRetrying(false)
    }
  }

  const handleCreateDeck = () => {
    const clean = newDeckName.trim()
    if (!clean) return
    registerFlashcardDeck(clean)
    const decks = getFlashcardDecks()
    setAvailableDecks(decks)
    setSelectedDeck(clean)
    setNewDeckName('')
    setIsDeckInputOpen(false)
  }

  const handleSaveFlashcard = () => {
    setShowDeckSelector(true)
    setFlashcardStatus('idle')
  }

  const confirmSaveFlashcard = async () => {
    if (!lesson) return
    const targetStep = lesson.steps[currentStepIndex]
    if (!targetStep) return

    setFlashcardStatus('saving')
    try {
      addOrUpdateFlashcard({
        questionId: targetStep.id,
        lessonId: lesson.lesson_id || lessonId,
        prompt: targetStep.teacher,
        expectedAnswer: targetStep.english_hint ||
          (Array.isArray(targetStep.expected_answer)
            ? String(targetStep.expected_answer[0])
            : String(targetStep.expected_answer)),
        pinyin: Array.isArray(targetStep.pinyin) ? targetStep.pinyin[0] : targetStep.pinyin,
        custom: true,
        deckName: selectedDeck || 'General'
      })
      if (selectedDeck && !availableDecks.includes(selectedDeck)) {
        registerFlashcardDeck(selectedDeck)
        setAvailableDecks(getFlashcardDecks())
      }
      setFlashcardStatus('saved')
      setShowDeckSelector(false)
      setIsDeckInputOpen(false)
    } catch (error) {
      console.error('Manual flashcard save failed:', error)
      setFlashcardStatus('error')
    } finally {
      if (flashcardStatusTimeout.current) {
        window.clearTimeout(flashcardStatusTimeout.current)
      }
      flashcardStatusTimeout.current = window.setTimeout(
        () => setFlashcardStatus('idle'),
        2200
      )
    }
  }

  const cancelSaveFlashcard = () => {
    setShowDeckSelector(false)
    setIsDeckInputOpen(false)
    setNewDeckName('')
    setFlashcardStatus('idle')
  }

  const handleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // 計算總分
  const calculateAverageScore = () => {
    if (stepResults.length === 0) return 0
    const total = stepResults.reduce((sum, result) => sum + result.score, 0)
    return Math.round(total / stepResults.length)
  }

  // 🛠️ 調試工具：將狀態暴露到 window 供檢查
  if (typeof window !== 'undefined') {
    (window as any).__debugLessonState = {
      showReport,
      hasLesson: !!lesson,
      lessonId: lesson?.lesson_id,
      loading,
      error: !!error,
      stepResultsLength: stepResults.length,
      hasFullReport: !!fullReport,
      hasGeneratedReport: hasGeneratedReportRef.current,
      checkStatus: () => {
        console.log('📊 當前狀態檢查:', {
          showReport,
          hasLesson: !!lesson,
          loading,
          stepResults: stepResults.length,
          hasFullReport: !!fullReport,
          條件: `showReport=${showReport} && lesson=${!!lesson} = ${showReport && !!lesson}`
        })
      }
    }
  }

  // 🎉 完成慶祝畫面
  if (showCompletionCelebration && lesson) {
    console.log('🎉 ========== 渲染完成慶祝畫面 ==========')

    const avgScore = calculateAverageScore()

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full text-center">
          {/* 主要慶祝訊息 */}
          <div className="bg-white rounded-3xl shadow-2xl p-12 mb-8 transform hover:scale-105 transition-transform duration-300">
            <div className="text-8xl mb-6 animate-bounce">🎉</div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
              Congratulations on Completing the Lesson!
            </h1>
            <h2 className="text-3xl font-semibold text-gray-700 mb-6">
              {lesson.title}
            </h2>

            {/* 平均分數顯示 */}
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {avgScore}
              </div>
              <div className="text-xl text-gray-600">
                Average Score
              </div>
            </div>

            {/* 鼓勵訊息 */}
            <div className="space-y-4 text-lg text-gray-700">
              <p className="font-semibold text-2xl text-purple-600">
                Excellent work! You did great!
              </p>
              <p>
                You have successfully completed all practice questions
              </p>
              <p className="text-gray-600">
                Keep up this learning enthusiasm and you'll improve even faster!
              </p>
            </div>
          </div>

          {/* 倒數計時和按鈕 */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-gray-600 mb-4">
              <div className="text-sm mb-2">Automatically returning to course list in</div>
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {countdown}
              </div>
              <div className="text-sm">seconds</div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Return to Course List Now
            </button>

            <button
              onClick={() => router.push('/history')}
              className="w-full mt-3 px-8 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 rounded-xl font-medium text-base transition-all"
            >
              View Learning History
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 報表頁面
  if (showReport && lesson) {
    console.log('✅ ========== 渲染報表頁面 ==========')
    console.log('  📊 報表詳情:', {
      showReport,
      lessonId: lesson.lesson_id,
      lessonTitle: lesson.title,
      fullReportExists: !!fullReport,
      fullReportScore: fullReport?.overview?.total_score,
      stepResultsCount: stepResults.length,
      hasRadarData: !!fullReport?.overview?.radar
    })
    console.log('  ✅ 條件滿足: showReport && lesson = true')
    
    const avgScore = fullReport?.overview.total_score || calculateAverageScore()
    
    // 構建報表數據
    const lessonReport: LessonReport = {
      lessonId: lesson.lesson_id,
      lessonTitle: lesson.title,
      completedAt: new Date().toISOString(),
      totalScore: avgScore,
      results: stepResults
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🎉 Course Completion Report
            </h1>
            <h2 className="text-xl text-gray-600">{lesson.title}</h2>
          </div>

          {/* 總體評分和雷達圖 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* 左側：總分 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white flex flex-col justify-center">
              <div className="text-center">
                <p className="text-lg mb-2">Overall Average Score</p>
                <p className="text-6xl font-bold">{avgScore}</p>
                <p className="text-sm mt-2">
                  {avgScore >= 90 ? 'Excellent!' : avgScore >= 75 ? 'Good!' : 'Keep practicing!'}
                </p>
              </div>
            </div>

            {/* 右側：五向雷達圖 */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Performance Radar</h3>
              {fullReport ? (
                <div className="h-48 sm:h-56 md:h-64">
                  <Radar
                    data={{
                      labels: ['Pronunciation', 'Fluency', 'Accuracy', 'Comprehension', 'Confidence'],
                      datasets: [{
                        label: 'Scores',
                        data: [
                          fullReport.overview.radar.pronunciation,
                          fullReport.overview.radar.fluency,
                          fullReport.overview.radar.accuracy,
                          fullReport.overview.radar.comprehension,
                          fullReport.overview.radar.confidence
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
                <p className="text-gray-500 text-center py-20">Generating detailed analysis...</p>
              )}
            </div>
          </div>

          {/* 使用統一報表組件 */}
          <LessonReportDisplay
            report={lessonReport}
            showTranscript={false}
            showHeader={false}
            showRetry={true}  // 🆕 啟用 Retry 按鈕
          />

          {/* 按鈕區域 - 改用 Grid 佈局 */}
          <div className="space-y-3">
            {/* 主要操作按鈕 - 2列排列 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowReport(false)
                  setCurrentStepIndex(0)
                  setStepResults([])
                  setAttempts(0)
                  setFullReport(null)
                  setNeedsManualPlay(false)
                  hasGeneratedReportRef.current = false
                  reportSessionIdRef.current = null
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
              >
                Retry Lesson
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
              >
                View History
              </button>
            </div>

            {/* 返回按鈕 - 單獨一行居中 */}
            <div className="text-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-xl text-gray-700 animate-pulse">Loading lesson...</div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-xl text-red-500">{error || 'Lesson not found'}</div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
        >
          Back to Courses
        </button>
      </div>
    )
  }

  const currentStep = lesson.steps[currentStepIndex]
  const progress = ((currentStepIndex + 1) / lesson.steps.length) * 100


  // Feedback page removed - auto-advance to next question instead

  // 🎯 問題頁面渲染
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10" /> {/* Spacer for centering */}
          <h1 className="text-2xl font-bold text-center flex-1">{lesson.title}</h1>
          {/* 📚 幫助按鈕 - 重新顯示教程 */}
          <button
            onClick={() => setShowTutorial(true)}
            className="w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors"
            title="Show tutorial"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <div
          className="w-full bg-gray-200 rounded-full h-2.5"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Lesson progress: ${Math.round(progress)}%`}
        >
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div
          className="text-center text-sm text-gray-600 mt-2"
          aria-live="polite"
          aria-atomic="true"
        >
          Question {currentStepIndex + 1} / {lesson.steps.length}
        </div>
      </div>

      <div className="mb-6 relative">
        {/* 講師圖片 - 可點擊切換 */}
        <button
          onClick={() => setShowInterviewerSelector(true)}
          className="group relative w-full max-w-xs sm:max-w-sm md:w-80 h-auto aspect-square rounded-2xl overflow-hidden shadow-2xl transition-all hover:shadow-3xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400 mx-auto"
          title="Click to change interviewer"
        >
          <Image
            src={getInterviewerImagePath(currentInterviewer)}
            alt="Interviewer"
            fill
            className="object-cover"
            priority
          />

          {/* 懸停提示 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>

          {/* 角落切換圖標 */}
          <div className="absolute top-3 right-3 bg-white/90 rounded-full p-2 shadow-md opacity-70 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </button>
      </div>

      {/* 🎥 視頻播放器（當有 video_url 時顯示） */}
      {currentStep?.video_url && (
        <div className="w-full mb-6 flex items-center justify-center max-w-4xl mx-auto">
          <div className="relative w-full aspect-video rounded-2xl shadow-lg bg-black overflow-hidden">
            <video
              key={currentStep.video_url}
              ref={videoRef}
              src={currentStep.video_url}
              preload="metadata"
              playsInline
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload noremoteplayback"
              onTimeUpdate={handleVideoTimeUpdate}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onEnded={() => {
                setIsVideoPlaying(false)
              }}
              onError={(e) => {
                console.error('Video load error:', e)
                setNeedsManualPlay(true)
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                display: 'block'
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* 字幕顯示區 (移到影片外面) */}
      {currentStep?.captions && currentStep.captions.length > 0 && currentCaption && (
        <div className="w-full max-w-2xl mb-4 p-4 bg-white rounded-xl shadow-md border border-gray-200">
          <p className="text-center text-base text-gray-800">
            {currentCaption}
          </p>
        </div>
      )}

      <div className={`w-full max-w-2xl mb-6 p-6 rounded-xl shadow-lg transition-all duration-300 ${
        isRetrying ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-white border-2 border-transparent'
      }`}>
        <p className="text-center text-lg font-medium text-gray-800">{currentSubtitle}</p>
      </div>

      {currentStep && (
        <div className="w-full max-w-2xl mb-6 p-6 bg-white rounded-xl shadow-lg space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-semibold text-sm min-w-[80px] sm:min-w-[100px]">Pinyin:</span>
              <span className="text-gray-700 flex-1">
                {currentStep.pinyin || currentStep.pinyin_examples?.join(', ') || 'Free response'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const answer = Array.isArray(currentStep.expected_answer)
                    ? currentStep.expected_answer[0]
                    : currentStep.expected_answer
                  if (answer) playTTS(answer)
                }}
                className="flex-shrink-0 p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all touch-manipulation"
                title="Play Chinese pronunciation"
              >
                <Volume2 size={18} />
              </button>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-600 font-semibold text-sm min-w-[80px] sm:min-w-[100px]">English:</span>
              <span className="text-gray-700 flex-1">{currentStep.english_hint}</span>
              <button
                type="button"
                onClick={() => {
                  if (currentStep.english_hint) playTTS(currentStep.english_hint)
                }}
                className="flex-shrink-0 p-2 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 transition-all touch-manipulation"
                title="Play English hint"
              >
                <Volume2 size={18} />
              </button>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <label className="text-sm font-semibold text-slate-600">Save to Deck</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedDeck}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {(availableDecks.length ? availableDecks : ['General']).map((deck) => (
                  <option key={deck} value={deck}>
                    {deck}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsDeckInputOpen((prev) => !prev)}
                className="text-sm text-blue-600 font-semibold hover:underline"
              >
                {isDeckInputOpen ? 'Close' : 'New Deck'}
              </button>
            </div>
            {isDeckInputOpen && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Deck name"
                />
                <AppButton
                  className="max-w-none w-auto px-4"
                  onClick={handleCreateDeck}
                >
                  Save Deck
                </AppButton>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep && (
        <div className="w-full max-w-2xl mb-6">
          {!showDeckSelector ? (
            <>
              <AppButton
                icon={BookmarkPlus}
                onClick={handleSaveFlashcard}
                disabled={flashcardStatus === 'saving'}
                className="max-w-none w-full"
              >
                Save to Flashcards
              </AppButton>
              {flashcardStatus === 'saved' && (
                <p className="text-center text-sm text-green-600 mt-2">
                  Added to &quot;{selectedDeck || 'General'}&quot; deck.
                </p>
              )}
              {flashcardStatus === 'error' && (
                <p className="text-center text-sm text-red-500 mt-2">
                  Failed to save. Please try again.
                </p>
              )}
            </>
          ) : (
            <>
              {/* 確認和取消按鈕 */}
              <div className="flex gap-3">
                <AppButton
                  icon={BookmarkPlus}
                  onClick={confirmSaveFlashcard}
                  disabled={flashcardStatus === 'saving'}
                  className="max-w-none flex-1"
                >
                  {flashcardStatus === 'saving' ? 'Saving...' : 'Confirm Save'}
                </AppButton>
                <button
                  type="button"
                  onClick={cancelSaveFlashcard}
                  className="flex-1 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
              {flashcardStatus === 'error' && (
                <p className="text-center text-sm text-red-500 mt-2">
                  Failed to save. Please try again.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* 🆕 音節反饋面板 - 顯示在錄音按鈕位置 */}
      {showSyllableFeedback ? (
        <div className="w-full max-w-2xl">
          <SyllableFeedbackPanel
            syllables={currentSyllables}
            overallScore={currentFeedbackScore}
            onPlayTTS={(text) => playTTS(text)}
            onRetry={handleSyllableFeedbackRetry}
            onNext={handleSyllableFeedbackNext}
            showToneCurve={true}
            compact={false}
          />
        </div>
      ) : (
        <>
          <button
            onClick={handleRecording}
            className={`w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all shadow-lg transform hover:scale-110 touch-manipulation ${
              isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' :
              'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            <div className={`rounded-full ${isRecording ? 'w-5 h-5 sm:w-6 sm:h-6 bg-white' : 'w-8 h-8 sm:w-10 sm:h-10 bg-white'}`}></div>
          </button>

          <p className="mt-4 text-gray-600 font-medium text-center">
            {isRecording ? 'Recording...' : 'Click to start recording'}
          </p>
        </>
      )}

      {isRetrying && (
        <div className="mt-4 text-center max-w-md">
          <p className="text-yellow-700 font-bold text-lg animate-bounce mb-2">Try Again!</p>
          <p className="text-gray-600 text-sm">Listen carefully and practice the pronunciation before recording.</p>
        </div>
      )}

      {/* 導航按鈕組 - Previous / Back to Dashboard / Finish / Next */}
      <div className="mt-6 flex flex-col items-center justify-center gap-3">
        {/* 上排：主要導航按鈕 */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentStepIndex === 0}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow flex items-center gap-2 ${
              currentStepIndex === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title="Previous Question"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
          >
            Back to Dashboard
          </button>

          <button
            onClick={handleManualNextQuestion}
            disabled={currentStepIndex === lesson.steps.length - 1}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow flex items-center gap-2 ${
              currentStepIndex === lesson.steps.length - 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title="Next Question"
          >
            Next
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 下排：結束課程按鈕（只在有作答時顯示）*/}
        {stepResults.length > 0 && (
          <button
            onClick={handleFinishLesson}
            className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-lg flex items-center gap-2"
            title="結束課程並查看成績"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Finish Lesson & View Results ({stepResults.length}/{lesson.steps.length})
          </button>
        )}
      </div>

      {/* 👤 講師選擇器 */}
      {showInterviewerSelector && (
        <InterviewerSelector
          currentInterviewer={currentInterviewer}
          onSelect={handleSelectInterviewer}
          onClose={() => setShowInterviewerSelector(false)}
        />
      )}

      {/* 📚 入門教程 */}
      {showTutorial && (
        <LessonTutorial onComplete={() => setShowTutorial(false)} />
      )}

      {/* 🏆 成就通知 */}
      {unlockedAchievement && (
        <AchievementToast
          achievement={unlockedAchievement}
          onClose={() => setUnlockedAchievement(null)}
        />
      )}
    </div>
  )
}



