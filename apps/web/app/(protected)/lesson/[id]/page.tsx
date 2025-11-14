'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Radar } from 'react-chartjs-2'
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
import { BookmarkPlus } from 'lucide-react'

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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasAutoplayedForStep = useRef<string>('') // �O���w�۰ʼ��񪺨B�J
  const flashcardStatusTimeout = useRef<number | null>(null)

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
        if (!response.ok) throw new Error('課程載入失敗')
        const data = await response.json()

        console.log('📚 課程數據載入:', {
          lesson_id: data.lesson_id,
          chapter_id: data.chapter_id,
          title: data.title,
          steps_count: data.steps?.length || 0
        })

        // 檢查課程數據是否有效
        if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
          throw new Error('課程沒有題目')
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

    // 獲取語音引擎
    const voices = window.speechSynthesis.getVoices()
    
    // 選擇英文語音
    const englishVoice = voices.find(voice => 
      voice.lang === 'en-US' && 
      (voice.name.includes('Google') || 
       voice.name.includes('Microsoft') ||
       voice.name.includes('Natural'))
    ) || voices.find(voice => voice.lang.startsWith('en'))
    
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

    // 🔧 按順序播放每個段落，使用正確的語音引擎
    let currentUtterance: SpeechSynthesisUtterance | null = null
    
    segments.forEach((segment, index) => {
      const utterance = new SpeechSynthesisUtterance(segment.text)
      
      if (segment.isChinese) {
        // 中文段落
        if (chineseVoice) utterance.voice = chineseVoice
        utterance.lang = 'zh-TW'
        utterance.rate = 0.85
        utterance.pitch = 1.05
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

  // 🎯 反饋頁面 - 下一題
  const handleNextQuestion = () => {
    if (!lesson || !currentFeedback) return
    
    const currentStep = lesson.steps[currentStepIndex]
    const { score, detailedScores, fullResult } = currentFeedback
    
    // 保存結果
    const newResult: StepResult = {
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
    
    const allResults = [...stepResults, newResult]
    setStepResults(allResults)
    
    // 重置狀態
    setSessionState('question')
    setCurrentAudioBlob(null)
    setCurrentFeedback(null)
    setIsRetrying(false)
    setNeedsManualPlay(false)
    setIsPlayingUserAudio(false)
    setIsPlayingCorrectAudio(false)
    
    // 停止任何正在播放的音頻
    window.speechSynthesis.cancel()
    
    // 前進到下一題或顯示報表
    if (currentStepIndex < lesson.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
      setAttempts(0)
    } else {
      // 課程完成
      console.log('✅ Course completed! Total results:', allResults.length)
      generateFullReport(allResults)
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
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')
        
        const currentStep = lesson.steps[currentStepIndex]
        const expectedAnswers = Array.isArray(currentStep.expected_answer) 
          ? currentStep.expected_answer 
          : [currentStep.expected_answer]
        
        formData.append('expectedAnswer', JSON.stringify(expectedAnswers))
        formData.append('questionId', currentStep.id.toString())
        formData.append('lessonId', lessonId)

        console.log('📝 評分請求資訊:')
        console.log('  - 題目 ID:', currentStep.id)
        console.log('  - 課程 ID:', lessonId)
        console.log('  - 預期答案:', expectedAnswers)
        console.log('  - 音頻大小:', audioBlob.size, 'bytes')

        // 🔧 調用新的 /api/score 端點
        console.log('📡 發送評分請求到:', `${API_BASE}/api/score`)
        const response = await fetch(`${API_BASE}/api/score`, {
          method: 'POST',
          body: formData
        })

        console.log('📨 回應狀態:', response.status, response.statusText)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ 評分失敗回應:', errorData)
          throw new Error(`評分失敗: ${response.status} - ${errorData.message || ''}`)
        }
        
        const result = await response.json()
        console.log('評分結果 (完整):', JSON.stringify(result, null, 2))
        
        // 統一變數：只使用 userTranscript 作為單一數據源
        const rawTranscript = result.transcript || ''
        let userTranscript = rawTranscript
          .replace(/\[模糊\]/g, '')        // 移除 [模糊] 標記
          .replace(/\[unclear\]/gi, '')    // 移除 [unclear] 標記
          .replace(/\[inaudible\]/gi, '')  // 移除 [inaudible] 標記
          .replace(/\[.*?\]/g, '')         // 移除所有其他 [...] 標記
          .trim()
        
        console.log('原始轉錄:', rawTranscript)
        console.log('清理後轉錄:', userTranscript)
        
        // 檢查 1：轉錄結果長度
        if (!userTranscript || userTranscript.length < 1) {
          console.error('轉錄結果為空或太短')
          setRecordingError('Speech recognition failed: No valid speech detected. Please speak clearly and try again.')
          setIsRetrying(false)
          setNeedsManualPlay(false)
          return
        }
        
        // 檢查 2：問題相似度（嚴格門檻 + 信心度）
        const qSim = calculateSimilarity(currentStep.teacher, userTranscript)
        const wordConfidences = result.word_confidence || []
        const lowConfidenceCount = wordConfidences.filter((wc: any) => wc.confidence < 0.6).length
        const lowConfidence = wordConfidences.length > 0 
          ? (lowConfidenceCount / wordConfidences.length) > 0.7
          : false
        
        console.log('🔍 問題文字:', currentStep.teacher)
        console.log('📝 轉錄文字:', userTranscript)
        console.log('📊 問題相似度:', (qSim * 100).toFixed(1) + '%')
        console.log('⚠️ 低信心度比例:', lowConfidence)
        
        // 只在幾乎完全相同且信心度低時才拒絕
        if (qSim >= 0.98 && (lowConfidence || wordConfidences.length === 0)) {
          console.error('可能誤讀題面')
          setRecordingError('Speech recognition anomaly: The system may have confused your answer with the question. Please try recording again.')
          setIsRetrying(false)
          setNeedsManualPlay(false)
          return
        }
        
        console.log('✅ 轉錄結果驗證通過')
        
        const backendScore = result.overall_score || result.total_score || result.score || 0
        const detailedScores = result.scores || result.detailed_scores || null
        const rawSuggestions = result.suggestions
        const suggestionArray = Array.isArray(rawSuggestions) ? rawSuggestions.filter(Boolean) : undefined
        const suggestionObject =
          !Array.isArray(rawSuggestions) && rawSuggestions && typeof rawSuggestions === 'object'
            ? (rawSuggestions as Record<string, string>)
            : undefined
        const normalizedSuggestions: Suggestions | undefined =
          suggestionObject || (suggestionArray && suggestionArray.length ? suggestionArray : undefined)
        const detailedSuggestionList =
          Array.isArray(result.detailedSuggestions)
            ? result.detailedSuggestions.filter(Boolean)
            : Array.isArray(result.detailed_suggestions)
              ? result.detailed_suggestions.filter(Boolean)
              : undefined
        const mispronouncedEntries = normalizeMispronouncedEntries(result.mispronounced)

        console.log('\n' + '='.repeat(60))
        console.log('🎯 開始評分流程')
        console.log('='.repeat(60))
        console.log('後端總分:', backendScore)
        console.log('原始轉錄 (顯示用):', rawTranscript)
        console.log('清理轉錄 (比對用):', userTranscript)
        console.log('預期答案列表:', expectedAnswers)
        console.log('='.repeat(60))

        // 🔧 使用模組化評分系統
        let bestMatch = { 
          score: { textSim: 0, phonemeSim: 0, toneAcc: 0, combinedScore: 0 } as ThreeDimensionalScore,
          slotCheck: { valid: false, errors: [] as string[], mismatchPositions: [] as number[] },
          judgement: null as ScoreJudgement | null,
          expectedAnswer: '', 
          errors: [] as CharacterError[], 
          correctionFeedback: '',
          detailedAnalysis: undefined as DetailedCharacterAnalysis | undefined
        }
        
        for (const expected of expectedAnswers) {
          console.log(`\n${'▼'.repeat(30)}`)
          console.log(`📋 比對答案: "${expected}"`)
          console.log('▼'.repeat(30))
          
          // 🔧 Step 1: 三維評分計算
          const score = calculateThreeDimensionalScore(expected, userTranscript)
          
          // 🔧 Step 2: 槽位檢查
          const slotCheck = checkKeySlots(expected, userTranscript)
          
          // 🔧 Step 3: 判定是否通過
          const judgement = judgeScore(score, slotCheck, expected, backendScore)
          
          // 🔧 Step 4: 輸出詳細日誌
          logScoringDetails(expected, userTranscript, score, slotCheck, judgement)
          
          // 🔧 Step 5: 錯誤分析（用於 UI 顯示）
          const errors = analyzeErrors(expected, userTranscript)
          const correctionFeedback = generateCorrectionFeedback(errors, expected, userTranscript)
          const detailedAnalysis = generateDetailedFeedback(expected, userTranscript)
          
          // 選擇綜合得分最高的答案
          if (score.combinedScore > bestMatch.score.combinedScore) {
            bestMatch = { 
              score,
              slotCheck,
              judgement,
              expectedAnswer: expected, 
              errors, 
              correctionFeedback, 
              detailedAnalysis
            }
          }
        }

        console.log('\n' + '★'.repeat(60))
        console.log('🏆 最終結果')
        console.log('★'.repeat(60))
        console.log('最佳匹配答案:', bestMatch.expectedAnswer)
        console.log('文字相似度:', (bestMatch.score.textSim * 100).toFixed(1) + '%')
        console.log('拼音相似度:', (bestMatch.score.phonemeSim * 100).toFixed(1) + '%')
        console.log('聲調準確度:', (bestMatch.score.toneAcc * 100).toFixed(1) + '%')
        console.log('槽位檢查:', bestMatch.slotCheck.valid ? '✅ 通過' : '❌ 失敗')
        console.log('最終判定:', bestMatch.judgement?.passed ? '✅ PASSED' : '❌ FAILED')
        console.log('最終分數:', bestMatch.judgement?.finalScore || 0)
        console.log('★'.repeat(60) + '\n')

        // 🔧 使用判定結果
        const passed = bestMatch.judgement?.passed || false
        const finalScore = bestMatch.judgement?.finalScore || 0

        // 🎯 切換到反饋頁面狀態
        console.log('\n📝 準備設置反饋數據...')
        console.log('  - 詳細分析:', bestMatch.detailedAnalysis ? '✅ 存在' : '❌ 缺失')
        console.log('  - 槽位檢查:', bestMatch.slotCheck.valid ? '✅ 通過' : '❌ 失敗')
        
        setCurrentAudioBlob(audioBlob)
        setCurrentFeedback({
          score: finalScore,
          similarity: bestMatch.score.textSim,
          phonemeSimilarity: bestMatch.score.phonemeSim,
          toneAccuracy: bestMatch.score.toneAcc,
          detailedScores: detailedScores || {
            pronunciation: Math.round(bestMatch.score.phonemeSim * 100),
            fluency: Math.round(bestMatch.score.textSim * 100),
            accuracy: Math.round(bestMatch.score.textSim * 100),
            comprehension: finalScore,
            confidence: finalScore
          },
          transcript: rawTranscript,  // 🔧 顯示原始轉錄，不是清理後的
          expectedAnswer: currentStep.expected_answer,
          bestMatchAnswer: bestMatch.expectedAnswer,
          errors: bestMatch.errors,
          correctionFeedback: bestMatch.correctionFeedback,
          detailedAnalysis: bestMatch.detailedAnalysis,
          slotErrors: bestMatch.slotCheck.errors,  // 🔧 新增：槽位錯誤
          slotMismatchPositions: bestMatch.slotCheck.mismatchPositions,  // 🔧 新增：錯誤位置
          suggestions: normalizedSuggestions,
          detailedSuggestions: detailedSuggestionList,
          overallPractice: result.overallPractice || '',
          mispronounced: mispronouncedEntries,
          passed,
          fullResult: result
        })
        
        console.log('✅ 反饋數據已設置')
        
        // 🔧 重要：保存當前題目的評分結果到 stepResults
        const currentStepResult: StepResult = {
          stepId: currentStep.id,
          question: currentStep.teacher,
          score: finalScore,
          attempts: attempts + 1,
          passed,
          detailedScores: detailedScores || {
            pronunciation: Math.round(bestMatch.score.phonemeSim * 100),
            fluency: Math.round(bestMatch.score.textSim * 100),
            accuracy: Math.round(bestMatch.score.textSim * 100),
            comprehension: finalScore,
            confidence: finalScore
          },
          suggestions: normalizedSuggestions,
          detailedSuggestions: detailedSuggestionList,
          overallPractice: result.overallPractice || '',
          mispronounced: mispronouncedEntries,
          feedback: result.feedback || '',
          transcript: rawTranscript,
          expectedAnswer: bestMatch.expectedAnswer,  // 🆕 正確答案
          errors: bestMatch.errors,  // 🆕 錯誤字列表
          correctionFeedback: bestMatch.correctionFeedback,  // 🆕 糾正建議
          apiResponse: result
        }
        
        console.log('💾 保存評分結果:', {
          stepId: currentStepResult.stepId,
          score: currentStepResult.score,
          passed: currentStepResult.passed,
          errorsCount: bestMatch.errors?.length || 0  // 🆕 記錄錯誤數量
        })
        
        // 添加到結果列表
        setStepResults(prev => [...prev, currentStepResult])

        // 🆕 失敗題目加入單字卡（去重）
        try {
          if (!passed) {
            addOrUpdateFlashcard({
              questionId: currentStep.id,
              lessonId: lessonId,
              prompt: currentStep.teacher,
              expectedAnswer: String(currentStep.expected_answer[0] || currentStep.expected_answer),
              pinyin: Array.isArray(currentStep.pinyin) ? currentStep.pinyin[0] : currentStep.pinyin,
              userLastAnswer: rawTranscript,
              errors: bestMatch.errors || [],
              deckName: 'Course Mistakes'
            })
            registerFlashcardDeck('Course Mistakes')
          }
        } catch (e) {
          console.warn('Add to flashcards failed:', e)
        }
        
        // 🔧 修改：評分後直接進入下一題，不顯示單題反饋
        console.log('📝 評分完成，準備進入下一題...')
        console.log('當前題目索引:', currentStepIndex)
        console.log('總題目數:', lesson.steps.length)
        console.log('是否有下一題:', currentStepIndex < lesson.steps.length - 1)

        // 檢查是否還有下一題
        if (currentStepIndex < lesson.steps.length - 1) {
          // 有下一題：短暫延遲後進入下一題
          console.log(`  → 進入下一題 (${currentStepIndex + 1}/${lesson.steps.length})`)
          setTimeout(() => {
            console.log('⏰ 延遲結束，開始切換到下一題...')
            setCurrentStepIndex(prev => {
              console.log('  更新索引: 從', prev, '到', prev + 1)
              return prev + 1
            })
            setSessionState('question')
            setIsRecording(false)
            setIsRetrying(false)
            setAttempts(0)
            setNeedsManualPlay(false)
            setCurrentCaption('')

            // 設置新題目的字幕
            const nextStep = lesson.steps[currentStepIndex + 1]
            if (nextStep) {
              console.log('  設置新字幕:', nextStep.teacher)
              setCurrentSubtitle(nextStep.teacher)
            } else {
              console.warn('  ⚠️ 找不到下一題數據!')
            }
          }, 800)
        } else {
          // 沒有下一題：顯示最終報表
          console.log('  → 所有題目完成，顯示最終報表')
          console.log('  → stepResults 總數:', stepResults.length + 1) // +1 因為這是最後一題剛加入的
          
          // 🔧 生成最終報表數據
          setTimeout(() => {
            // 計算所有題目的平均分數（包括剛剛完成的這一題）
            const allResults = [...stepResults, currentStepResult]
            console.log('📊 生成最終報表，題目數量:', allResults.length)
            
            // 計算五維平均分數
            let totalPronunciation = 0
            let totalFluency = 0
            let totalAccuracy = 0
            let totalComprehension = 0
            let totalConfidence = 0
            let totalScore = 0
            
            allResults.forEach((result, index) => {
              console.log(`  題目 ${index + 1}:`, {
                score: result.score,
                detailedScores: result.detailedScores
              })
              
              if (result.detailedScores) {
                totalPronunciation += result.detailedScores.pronunciation
                totalFluency += result.detailedScores.fluency
                totalAccuracy += result.detailedScores.accuracy
                totalComprehension += result.detailedScores.comprehension
                totalConfidence += result.detailedScores.confidence
              }
              totalScore += result.score
            })
            
            const count = allResults.length
            const report: FullReport = {
              overview: {
                total_score: Math.round(totalScore / count),
                radar: {
                  pronunciation: Math.round(totalPronunciation / count),
                  fluency: Math.round(totalFluency / count),
                  accuracy: Math.round(totalAccuracy / count),
                  comprehension: Math.round(totalComprehension / count),
                  confidence: Math.round(totalConfidence / count)
                }
              },
              per_question: allResults.map(result => ({
                scores: {
                  pronunciation: result.detailedScores?.pronunciation || 0,
                  fluency: result.detailedScores?.fluency || 0,
                  accuracy: result.detailedScores?.accuracy || 0,
                  comprehension: result.detailedScores?.comprehension || 0,
                  confidence: result.detailedScores?.confidence || 0,
                  total: result.score
                },
                advice: result.overallPractice || ''
              })),
              recommendations: [
                'Continue practicing pronunciation',
                'Focus on tone accuracy',
                'Practice speaking more fluently'
              ]
            }
            
            console.log('✅ 最終報表已生成:', report)
            // 🔧 立即保存到學習歷史（確保歷史頁可看到）
            try {
              saveToHistory(report, allResults)
            } catch (e) {
              console.warn('保存學習歷史時發生警告:', e)
            }
            setFullReport(report)
            setShowReport(true)
          }, 800)
        }
        
      } catch (err) {
        console.error('❌ 評分錯誤:', err)
        const errorMessage = err instanceof Error ? err.message : '未知錯誤'
        alert(`評分失敗：${errorMessage}\n\n請確認：\n1. 後端服務器是否運行在 8082 端口\n2. 麥克風權限是否正常\n3. 錄音時間是否足夠`)
        setIsRetrying(false)
        setNeedsManualPlay(false)
      }

      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
    }
  }

  // 🔧 已移除 handleScore 函數，邏輯轉移到 handleNextQuestion 和即時反饋彈窗

  // 生成完整報表（調用 analysis-core 邏輯）
  const generateFullReport = async (finalResults?: typeof stepResults) => {
    if (!lesson) return

    // 🔧 使用傳入的結果或當前狀態的結果
    const resultsToUse = finalResults || stepResults
    console.log('📊 Generating report for', resultsToUse.length, 'questions')

    try {
      const sessionId = `lesson-${lessonId}-${Date.now()}`
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

      if (!response.ok) throw new Error('報表生成失敗')
      
      const report = await response.json()
      setFullReport(report)
      
      // 🔧 儲存到 localStorage，使用實際的結果
      saveToHistory(report, resultsToUse)
      
      setShowReport(true)
    } catch (err) {
      console.error('報表生成錯誤:', err)
      // 使用簡易報表（手動計算雷達圖數據）
      const simpleReport = generateSimpleReport(resultsToUse)
      setFullReport(simpleReport)
      saveToHistory(simpleReport, resultsToUse)
      setShowReport(true)
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
  const saveToHistory = (report: any, resultsToUse?: typeof stepResults) => {
    if (!lesson) return

    // 🔧 使用傳入的結果或當前狀態的結果
    const results = resultsToUse || stepResults
    console.log('💾 Saving to history:', results.length, 'questions')

    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0)
    const sessionData = {
      sessionId: `lesson-${lessonId}-${Date.now()}`,
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
        // 🔧 新增：儲存 suggestions 和 overallPractice
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
      history.push(sessionData)
      localStorage.setItem('lessonHistory', JSON.stringify(history))
      
      console.log('✅ 已保存到學習歷史:', {
        sessionId: sessionData.sessionId,
        questionsCount: sessionData.questionsCount,
        resultsLength: sessionData.results.length
      })
      
      // Debug: 列出每個問題
      sessionData.results.forEach((result, index) => {
        console.log(`  Question ${index + 1}: ${result.question} (Score: ${result.score})`)
      })
    } catch (err) {
      console.error('❌ 儲存學習歷史失敗:', err)
    }
  }

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
        expectedAnswer: Array.isArray(targetStep.expected_answer)
          ? String(targetStep.expected_answer[0])
          : String(targetStep.expected_answer),
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

  // 報表頁面
  if (showReport && lesson) {
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
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
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
                <div className="h-64">
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
        <div className="text-xl text-gray-700 animate-pulse">載入課程中...</div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-xl text-red-500">{error || '課程不存在'}</div>
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

  // 🎯 反饋頁面渲染
  if (sessionState === 'feedback' && currentFeedback) {
    const expectedAnswer = Array.isArray(currentFeedback.expectedAnswer)
      ? currentFeedback.expectedAnswer[0]
      : currentFeedback.expectedAnswer

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        {/* 進度條 */}
        <div className="w-full max-w-4xl mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">{lesson.title}</h1>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">
            Question {currentStepIndex + 1} / {lesson.steps.length} - Feedback
          </div>
        </div>

        {/* 反饋內容 */}
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8">
          {/* 標題 */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white mb-6">
            <h2 className="text-3xl font-bold text-center">
              Your Performance
            </h2>
          </div>

          {/* 分數顯示 */}
          <div className="mb-8 text-center">
            <div className="text-6xl font-bold text-gray-800 mb-2">
              {Math.round(currentFeedback.score)}
            </div>
            
            {/* 相似度顯示 */}
            {currentFeedback.similarity !== undefined && (
              <div className="text-lg text-gray-600 mb-2">
                Similarity: {(currentFeedback.similarity * 100).toFixed(1)}%
              </div>
            )}
            
            <div className="text-xl text-gray-600 mb-4">
              {currentFeedback.score >= 90 ? 'Excellent!' :
               currentFeedback.score >= 75 ? 'Great!' :
               currentFeedback.score >= 60 ? 'Good!' :
               'Keep Practicing!'}
            </div>
            <div className={`inline-block px-6 py-2 rounded-full text-white font-bold ${
              currentFeedback.passed ? 'bg-green-500' : 'bg-yellow-500'
            }`}>
              {currentFeedback.passed ? 'Passed' : 'Try Again'}
            </div>
          </div>

          {/* 正確答案 */}
          <div className="mb-6 p-6 bg-green-50 rounded-xl border-2 border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3">Correct Answer:</h3>
            <div className="space-y-2">
              <p className="text-2xl text-gray-800 font-medium">
                {currentFeedback.bestMatchAnswer || expectedAnswer}
              </p>
              {currentStep?.pinyin && (
                <p className="text-lg text-green-600">{currentStep.pinyin}</p>
              )}
            </div>
          </div>

          {/* 你的回答 */}
          {currentFeedback.transcript && (
            <div className="mb-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h3 className="text-lg font-bold text-blue-800 mb-3">Your Answer:</h3>
              <p className="text-xl text-gray-800">{currentFeedback.transcript}</p>
            </div>
          )}

          {/* 🔧 槽位錯誤警告（最優先顯示） */}
          {currentFeedback.slotErrors && currentFeedback.slotErrors.length > 0 && (
            <div className="mb-6 p-6 bg-red-100 rounded-xl border-4 border-red-400">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">🚨</span>
                <div>
                  <h3 className="text-xl font-bold text-red-900 mb-2">Critical Error: Key Word Position Mismatch</h3>
                  <p className="text-red-800 font-medium">
                    You used the wrong pronoun or key word. Please check the differences carefully:
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg space-y-2">
                {currentFeedback.slotErrors.map((error, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-red-900">
                    <span className="text-xl">❌</span>
                    <span className="font-mono text-sm">{error}</span>
                  </div>
                ))}
              </div>
              
              {currentFeedback.slotMismatchPositions && currentFeedback.slotMismatchPositions.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded border-2 border-yellow-300">
                  <p className="text-sm text-yellow-900">
                    <strong>Error Position(s):</strong> Character {currentFeedback.slotMismatchPositions.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 🆕 詳細逐字分析 */}
          {currentFeedback.detailedAnalysis && (
            <div className="mb-6 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
              <h3 className="text-lg font-bold text-purple-800 mb-4">Character-by-Character Analysis:</h3>
              
              {/* 總體評價 */}
              <div className="mb-4 p-4 bg-white rounded-lg">
                <p className="text-gray-700">{currentFeedback.detailedAnalysis.overallFeedback}</p>
              </div>
              
              {/* 逐字比對 */}
              <div className="p-4 bg-white rounded-lg font-mono text-sm">
                <pre className="whitespace-pre-wrap leading-relaxed text-gray-800">
                  {currentFeedback.detailedAnalysis.characterByCharacterAnalysis}
                </pre>
              </div>
            </div>
          )}

          {/* 錯誤分析 - 英文糾正 (向後兼容) */}
          {!currentFeedback.detailedAnalysis && currentFeedback.correctionFeedback && (
            <div className="mb-6 p-6 bg-red-50 rounded-xl border-2 border-red-200">
              <h3 className="text-lg font-bold text-red-800 mb-3">Pronunciation Analysis:</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {currentFeedback.correctionFeedback}
              </pre>
            </div>
          )}

          {/* 詳細評分 */}
          {currentFeedback.detailedScores && (
            <div className="mb-6 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Detailed Scores:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(currentFeedback.detailedScores).map(([key, value]) => {
                  const score = typeof value === 'number' ? value : 0
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-medium text-gray-700 capitalize">{key}:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 90 ? 'bg-green-500' :
                              score >= 75 ? 'bg-blue-500' :
                              score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-800 min-w-[3rem] text-right">{score}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 建議 */}
          {currentFeedback.suggestions && Object.keys(currentFeedback.suggestions).length > 0 && (
            <div className="mb-6 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
              <h3 className="text-lg font-bold text-purple-800 mb-4">Suggestions:</h3>
              <div className="space-y-3">
                {Object.entries(currentFeedback.suggestions).map(([key, value]) => {
                  const suggestion = typeof value === 'string' ? value : ''
                  return suggestion ? (
                    <div key={key} className="flex gap-3">
                      <span className="font-semibold text-purple-600 capitalize min-w-[140px]">{key}:</span>
                      <span className="text-gray-700">{suggestion}</span>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* 整體練習方法 */}
          {currentFeedback.overallPractice && (
            <div className="mb-8 p-6 bg-yellow-50 rounded-xl border-2 border-yellow-200">
              <h3 className="text-lg font-bold text-yellow-800 mb-3">Practice Method:</h3>
              <p className="text-gray-700 leading-relaxed">{currentFeedback.overallPractice}</p>
            </div>
          )}

          {/* 音頻播放按鈕 */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-lg">🎧</span>
              Audio Playback:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 播放自己的錄音 */}
              <button
                onClick={playUserRecording}
                disabled={!currentAudioBlob || isPlayingUserAudio}
                className={`py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isPlayingUserAudio
                    ? 'bg-blue-400 cursor-wait text-white'
                    : currentAudioBlob
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                }`}
              >
                <span className="text-lg">🔊</span>
                <span>{isPlayingUserAudio ? 'Playing...' : 'My Recording'}</span>
              </button>

              {/* 播放正確答案 TTS */}
              <button
                onClick={playCorrectAnswer}
                disabled={isPlayingCorrectAudio}
                className={`py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isPlayingCorrectAudio
                    ? 'bg-blue-400 cursor-wait text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                <span className="text-lg">🔊</span>
                <span>{isPlayingCorrectAudio ? 'Playing...' : 'Correct Answer'}</span>
              </button>
            </div>
          </div>

          {/* 操作按鈕區 */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 重新錄音 */}
              <button
                onClick={handleRetryRecording}
                className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
              >
                Retry Recording
              </button>

              {/* 下一題 */}
              <button
                onClick={handleNextQuestion}
                className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
              >
                {currentStepIndex < lesson.steps.length - 1 ? 'Next Question' : 'Finish Lesson'}
              </button>
            </div>

            {/* 返回課程列表 */}
            <div className="text-center pt-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 🎯 問題頁面渲染
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-2xl mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">{lesson.title}</h1>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-center text-sm text-gray-600 mt-2">
          Question {currentStepIndex + 1} / {lesson.steps.length}
        </div>
      </div>

      <div className="mb-6 relative">
        <div className="w-80 h-80 relative rounded-2xl overflow-hidden shadow-2xl">
          <Image src="/interviewers/woman.png" alt="Teacher" fill className="object-cover" priority />
        </div>
      </div>

      {/* 🎥 視頻播放器（當有 video_url 時顯示） */}
      {currentStep?.video_url && (
        <div 
          className="w-full mb-6 flex items-center justify-center"
          style={{ 
            maxWidth: '900px',
            height: '66vh',
            maxHeight: '500px'
          }}
        >
          <div 
            className="relative rounded-2xl shadow-lg"
            style={{ 
              width: '100%',
              height: '100%',
              background: '#000',
              overflow: 'hidden'
            }}
          >
            <video
              key={currentStep.video_url}
              ref={videoRef}
              src={currentStep.video_url}
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
              <span className="text-blue-600 font-semibold text-sm min-w-[100px]">Pinyin:</span>
              <span className="text-gray-700 flex-1">
                {currentStep.pinyin || currentStep.pinyin_examples?.join(', ') || 'Free response'}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-600 font-semibold text-sm min-w-[100px]">English:</span>
              <span className="text-gray-700 flex-1">{currentStep.english_hint}</span>
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

      <button
        onClick={handleRecording}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg transform hover:scale-110 ${
          isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 
          'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        <div className={`rounded-full ${isRecording ? 'w-6 h-6 bg-white' : 'w-10 h-10 bg-white'}`}></div>
      </button>

      <p className="mt-4 text-gray-600 font-medium text-center">
        {isRecording ? 'Recording...' : 'Click to start recording'}
      </p>

      {isRetrying && (
        <div className="mt-4 text-center max-w-md">
          <p className="text-yellow-700 font-bold text-lg animate-bounce mb-2">Try Again!</p>
          <p className="text-gray-600 text-sm">Listen carefully and practice the pronunciation before recording.</p>
        </div>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
      >
        Back to Courses
      </button>
    </div>
  )
}



