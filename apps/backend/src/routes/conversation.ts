import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { conversationStore, ScenarioCheckpoint, VocabularyItem } from '../utils/conversationStore'
import { getLocaleFromRequest, getFeedbackLanguagePrompt } from '../utils/i18n'
import { authenticateUser, AuthRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// ============================================================================
// 輔助函數：文本正規化（移除空白、標點）
// ============================================================================
const normalizeText = (text: string): string => {
  return text.replace(/[，。！？、\s]/g, '').toLowerCase()
}

// ============================================================================
// 禮貌用語檢測系統
// ============================================================================

/**
 * 禮貌信號接口
 */
interface PoliteSignal {
  type: 'acknowledgment' | 'thanks' | 'confirmation'
  confidence: 'high' | 'medium'
  shouldTransition: boolean
  matchedPattern: string
}

/**
 * 禮貌用語模式庫（嚴格模式）
 * 只包含明確的禮貌用語，避免誤判
 */
const POLITE_PATTERNS = {
  // 高信號強度 - 明確想結束當前話題
  acknowledgment: ['麻煩了', '辛苦了', '拜託了', '好的謝謝', '好謝謝'],
  thanks: ['謝謝', '謝了', '多謝', '感謝'],
  confirmation_strong: ['可以了', '就這樣', '沒問題了', '這樣就好']
}

/**
 * 檢測用戶輸入中的禮貌用語信號（嚴格模式）
 *
 * @param transcript 用戶說的話
 * @param context 對話上下文
 * @returns 禮貌信號對象，如果沒有檢測到則返回 null
 */
function detectPoliteSignal(
  transcript: string,
  context: {
    lastCheckpointJustCompleted?: boolean
    conversationTurns: number
    lastAiMessageType?: 'question' | 'statement' | 'confirmation'
  }
): PoliteSignal | null {
  const normalized = normalizeText(transcript)

  // 檢測禮貌用語類型
  let type: PoliteSignal['type'] | null = null
  let matchedPattern = ''

  // 優先檢測高信號模式
  for (const pattern of POLITE_PATTERNS.acknowledgment) {
    if (normalized.includes(normalizeText(pattern))) {
      type = 'acknowledgment'
      matchedPattern = pattern
      break
    }
  }

  if (!type) {
    for (const pattern of POLITE_PATTERNS.thanks) {
      if (normalized.includes(normalizeText(pattern))) {
        type = 'thanks'
        matchedPattern = pattern
        break
      }
    }
  }

  if (!type) {
    for (const pattern of POLITE_PATTERNS.confirmation_strong) {
      if (normalized.includes(normalizeText(pattern))) {
        type = 'confirmation'
        matchedPattern = pattern
        break
      }
    }
  }

  // 沒有檢測到任何禮貌用語
  if (!type) return null

  // 根據上下文調整信號強度
  let confidence: 'high' | 'medium' = 'high'

  // 特殊處理：檢測「繼續說話」的信號（降級為不轉換）
  const continuationKeywords = ['等等', '還要', '再', '另外', '對了', '那', '還有']
  const hasContinuation = continuationKeywords.some(kw => normalized.includes(normalizeText(kw)))

  if (hasContinuation && transcript.length > 5) {
    // 用戶想繼續說話，不應該轉換
    console.log('⚠️ Detected continuation keyword, signal ignored')
    return null
  }

  // 決定是否應該轉換話題（嚴格模式：高信號一定轉換）
  const shouldTransition = confidence === 'high'

  console.log(`🔔 Polite signal detected: type=${type}, confidence=${confidence}, pattern="${matchedPattern}", shouldTransition=${shouldTransition}`)

  return { type, confidence, shouldTransition, matchedPattern }
}

// ============================================================================
// 輔助函數：從課程 JSON 中隨機提取 3-5 個詞彙
// ============================================================================
function extractVocabularyFromLesson(lessonId: string): VocabularyItem[] {
  try {
    // 解析課程 ID（如 C1-L01 → chapter-01/lesson-01.json）
    const match = lessonId.match(/^C(\d+)-L(\d+)$/)
    if (!match) {
      console.warn(`⚠️ Invalid lesson ID format: ${lessonId}`)
      return []
    }

    const chapterNum = match[1].padStart(2, '0')
    const lessonNum = match[2].padStart(2, '0')
    const lessonsDir = path.join(__dirname, '../../src/plugins/chinese-lessons')
    const lessonPath = path.join(lessonsDir, `chapter-${chapterNum}`, `lesson-${lessonNum}.json`)

    if (!fs.existsSync(lessonPath)) {
      console.warn(`⚠️ Lesson file not found: ${lessonPath}`)
      return []
    }

    const lessonData = JSON.parse(fs.readFileSync(lessonPath, 'utf-8'))
    const allSteps = lessonData.steps || []

    if (allSteps.length === 0) {
      return []
    }

    // 隨機選擇 3-5 個 steps
    const sampleSize = Math.min(Math.floor(Math.random() * 3) + 3, allSteps.length) // 3-5 或最多所有
    const shuffled = [...allSteps].sort(() => Math.random() - 0.5)
    const selectedSteps = shuffled.slice(0, sampleSize)

    // 提取詞彙
    const vocabulary: VocabularyItem[] = selectedSteps.map((step: any) => {
      const word = Array.isArray(step.expected_answer)
        ? step.expected_answer[0]
        : step.expected_answer
      return {
        word: word || '',
        pinyin: step.pinyin || '',
        english: step.english_hint || '',
        lessonId: lessonId
      }
    }).filter((v: VocabularyItem) => v.word) // 過濾空詞彙

    console.log(`📚 Extracted ${vocabulary.length} vocabulary items from ${lessonId}`)
    return vocabulary
  } catch (error) {
    console.error(`❌ Error extracting vocabulary from ${lessonId}:`, error)
    return []
  }
}

// ============================================================================
// 輔助函數：根據模式載入課程詞彙（最多 5 個課程）
// ============================================================================
function loadReviewVocabulary(
  mode: 'all' | 'selected',
  completedLessons?: string[],
  selectedChapters?: string[]
): { lessons: string[], vocabulary: VocabularyItem[] } {
  let lessons: string[] = []

  if (mode === 'all' && completedLessons && completedLessons.length > 0) {
    // 從已完成課程中隨機選 5 個
    const shuffled = [...completedLessons].sort(() => Math.random() - 0.5)
    lessons = shuffled.slice(0, Math.min(5, shuffled.length))
    console.log(`📖 'all' mode: Selected ${lessons.length} random lessons from ${completedLessons.length} completed`)
  } else if (mode === 'selected' && selectedChapters && selectedChapters.length > 0) {
    // 優先使用已完成課程
    if (completedLessons && completedLessons.length > 0) {
      // 80% 已完成課程
      const shuffled = [...completedLessons].sort(() => Math.random() - 0.5)
      const completedCount = Math.min(4, shuffled.length)  // 最多 4 個已完成課程
      lessons = shuffled.slice(0, completedCount)

      // 20% 新課程（從選定章節中）
      if (lessons.length < 5) {
        const lessonsDir = path.join(__dirname, '../../src/plugins/chinese-lessons')
        const allLessonsInChapters: string[] = []

        for (const chapterId of selectedChapters) {
          const chapterNum = chapterId.replace('C', '').padStart(2, '0')
          const chapterDir = path.join(lessonsDir, `chapter-${chapterNum}`)

          if (fs.existsSync(chapterDir)) {
            const files = fs.readdirSync(chapterDir).filter(f => f.endsWith('.json'))
            for (const file of files) {
              const match = file.match(/lesson-(\d+)\.json/)
              if (match) {
                const lessonNum = match[1]
                const lessonId = `${chapterId}-L${lessonNum}`
                // 只加入未完成的課程
                if (!completedLessons.includes(lessonId)) {
                  allLessonsInChapters.push(lessonId)
                }
              }
            }
          }
        }

        // 從未完成課程中隨機選 1 個
        const shuffledNew = [...allLessonsInChapters].sort(() => Math.random() - 0.5)
        const newCount = Math.min(5 - lessons.length, 1)  // 最多 1 個新課程
        lessons = [...lessons, ...shuffledNew.slice(0, newCount)]
      }

      console.log(`📖 'selected' mode: Selected ${lessons.length} lessons (${completedCount} completed + ${lessons.length - completedCount} new) from chapters ${selectedChapters.join(', ')}`)
    }
    // 降級處理：如果沒有已完成課程，使用舊邏輯
    else {
      const lessonsDir = path.join(__dirname, '../../src/plugins/chinese-lessons')
      const allLessonsInChapters: string[] = []

      for (const chapterId of selectedChapters) {
        const chapterNum = chapterId.replace('C', '').padStart(2, '0')
        const chapterDir = path.join(lessonsDir, `chapter-${chapterNum}`)

        if (fs.existsSync(chapterDir)) {
          const files = fs.readdirSync(chapterDir).filter(f => f.endsWith('.json'))
          for (const file of files) {
            const match = file.match(/lesson-(\d+)\.json/)
            if (match) {
              const lessonNum = match[1]
              allLessonsInChapters.push(`${chapterId}-L${lessonNum}`)
            }
          }
        }
      }

      const shuffled = [...allLessonsInChapters].sort(() => Math.random() - 0.5)
      lessons = shuffled.slice(0, Math.min(5, shuffled.length))
      console.log(`📖 'selected' mode (no completed): Selected ${lessons.length} random lessons from chapters ${selectedChapters.join(', ')}`)
    }
  }

  // 從每個課程提取詞彙
  const allVocabulary: VocabularyItem[] = []
  for (const lessonId of lessons) {
    const vocabFromLesson = extractVocabularyFromLesson(lessonId)
    allVocabulary.push(...vocabFromLesson)
  }

  console.log(`✅ Total vocabulary extracted: ${allVocabulary.length} items from ${lessons.length} lessons`)
  return { lessons, vocabulary: allVocabulary }
}

// ============================================================================
// 輔助函數：使用 Gemini 生成建議回覆
// ============================================================================
async function generateSuggestions(
  model: any,
  context: {
    mode: string
    conversationHistory: Array<{ role: string; text: string }>
    aiLastMessage: string | null  // 允許 null (當用戶先說話時)
    scenarioInfo?: {
      objective: string
      nextCheckpoint?: { description: string; keywords: string[] }
      userRole?: string
    }
    reviewVocabulary?: VocabularyItem[]  // 複習模式詞彙
  }
): Promise<Array<{ chinese: string; pinyin: string; english: string; type: string }>> {
  console.log('🔧 generateSuggestions called')
  console.log('   Context mode:', context.mode)
  console.log('   AI last message:', context.aiLastMessage)
  console.log('   Review vocabulary count:', context.reviewVocabulary?.length || 0)

  const historyText = context.conversationHistory
    .slice(-4) // 最近 4 輪對話
    .map(turn => `${turn.role === 'user' ? 'User' : 'AI'}: ${turn.text}`)
    .join('\n')

  let contextPrompt = `You are helping a language learner practice Traditional Chinese (Taiwan, 繁體中文) conversation.

IMPORTANT GUIDELINES:
- Use Traditional Chinese (Taiwan, 繁體中文) exclusively
- Use Taiwan-specific vocabulary (e.g., 捷運 not 地鐵, 計程車 not 出租車, 服務生 not 服務員)
- Use natural Taiwan conversational style and expressions
- Consider Taiwan cultural context and politeness norms

Conversation history:
${historyText}

${context.aiLastMessage ? `AI just said: ${context.aiLastMessage}\n` : 'The user needs to start the conversation.\n'}

CRITICAL REQUIREMENT - ANSWER THE QUESTION:
- ALL suggestions MUST directly respond to what the AI just said
- If AI asked a question, suggestions MUST answer that specific question
- Do NOT give irrelevant responses (e.g., if AI asks "what fruit?", don't suggest "I want water")
- Stay on topic with the AI's message`

  if (context.mode === 'scenario' && context.scenarioInfo) {
    contextPrompt += `
Scenario objective: ${context.scenarioInfo.objective}
User role: ${context.scenarioInfo.userRole || 'student'}

ROLE CONTEXT:
- You are suggesting responses for the user playing: ${context.scenarioInfo.userRole || 'student'}
- Suggestions should match this role's perspective and typical language patterns
`
    if (context.scenarioInfo.nextCheckpoint) {
      contextPrompt += `
Next checkpoint: ${context.scenarioInfo.nextCheckpoint.description}
Keywords relevant to this checkpoint: ${context.scenarioInfo.nextCheckpoint.keywords.slice(0, 8).join(', ')}

CHECKPOINT GUIDANCE:
- Suggestions should naturally progress toward completing this checkpoint
- Use vocabulary from the checkpoint keywords where appropriate
`
    }
  } else if ((context.mode === 'all' || context.mode === 'selected') && context.reviewVocabulary) {
    // 複習模式：提供詞彙資訊給 prompt
    const vocabList = context.reviewVocabulary
      .slice(0, 10) // 最多列出 10 個詞彙
      .map(v => `${v.word} (${v.pinyin})`)
      .join(', ')

    contextPrompt += `
REVIEW MODE - CRITICAL RULES FOR NATURAL SUGGESTIONS:

🚫 **STRICTLY FORBIDDEN - META-CONVERSATION** (絕對禁止元對話):
❌ "復習「XX」" (Don't talk about reviewing)
❌ "今天要學新的" (Don't talk about learning)
❌ "想學別的" (Don't talk about studying)
❌ "準備好了嗎" (Don't talk about readiness)
❌ ANY reference to "學習", "復習", "練習", "開始" in the context of lessons

✅ **WHAT TO DO INSTEAD** (正確做法):
This is a NATURAL CONVERSATION, not a classroom.
User should respond as if chatting with a friend, NOT discussing the learning process.

**第一優先：直接自然回答 AI 的話**
- 如果 AI 說「你好！今天怎麼樣？」→ 建議「不錯！」「還好」「有點累」
- 如果 AI 問「吃早餐了嗎？」→ 建議「吃了」「還沒吃」「我吃了麵包」
- 如果 AI 問「最近做什麼？」→ 建議「在家休息」「去公園走走」「看電視」
- 如果 AI 問「週末要去哪裡？」→ 建議「去看電影」「在家」「還沒決定」

**第二優先：自然使用複習詞彙**
- 可用詞彙: ${vocabList}
- 在自然回答的同時，使用 1 個詞彙（不要強迫）
- 例如：AI 問「最近吃什麼？」，詞彙「麵條」→「我吃麵條」

**CORRECT Examples** (自然對話):
AI says: "你好！今天過得怎麼樣？"
Available words: 學校, 朋友, 累

✅ "還不錯！" (natural greeting response - simple)
✅ "有點累" (natural + uses vocabulary naturally)
✅ "去學校了" (natural + uses vocabulary)
❌ "復習「學校」" (META-TALK - FORBIDDEN!)
❌ "今天要學新的" (META-TALK - FORBIDDEN!)

AI says: "吃早餐了嗎？"
Available words: 早餐, 麵包, 牛奶

✅ "吃了！" (natural simple answer)
✅ "我吃了麵包" (natural + vocabulary)
✅ "還沒吃" (natural alternative)
❌ "復習「早餐」" (META-TALK - FORBIDDEN!)
❌ "想學別的" (META-TALK - FORBIDDEN!)

**CRITICAL RULE**:
- Suggestions = what user would say in REAL LIFE conversation
- NOT what they would say in a classroom setting
- Act like friends chatting, not teacher-student
`
  }

  contextPrompt += `
Generate 3 natural response suggestions for the user to say next in Traditional Chinese (Taiwan).

CRITICAL REQUIREMENTS FOR ALL MODES:
- Keep it SHORT: 5-15 characters per suggestion
- Keep it NATURAL: Sound like real everyday conversation - use daily spoken language
- Keep it SIMPLE: Use only 1-2 vocabulary words per suggestion
- Keep it REALISTIC: Avoid strange or forced statements
- Use NATURAL DAILY LANGUAGE: Say "要去" not "你想去" (too formal)

SUGGESTION TYPES:
- Type "safe": Simple, direct response
  * 1 short sentence, 5-10 characters
  * Natural everyday expression
  * Easy for beginners

- Type "advanced": Slightly more detailed
  * 1-2 short sentences, 10-15 characters
  * Natural but more complete response

- Type "alternative": Different natural response
  * Same difficulty as "safe"
  * Different phrasing or approach
  * Still natural and realistic

QUALITY REQUIREMENTS:
- Each suggestion MUST sound like something people actually say in daily life
- Pinyin must use correct tone marks (ā á ǎ à, ē é ě è, ī í ǐ ì, ō ó ǒ ò, ū ú ǔ ù, ǖ ǘ ǚ ǜ)
- English translations must be accurate and natural
- Suggestions must be 5-15 characters in length (SHORT!)

EXAMPLE OUTPUT (for review mode, AI asked "你吃早餐了嗎？"):
[
  {
    "chinese": "吃了",
    "pinyin": "chī le",
    "english": "Yes, I did",
    "type": "safe"
  },
  {
    "chinese": "我吃了麵包",
    "pinyin": "wǒ chī le miàn bāo",
    "english": "I ate bread",
    "type": "advanced"
  },
  {
    "chinese": "還沒吃",
    "pinyin": "hái méi chī",
    "english": "Not yet",
    "type": "alternative"
  }
]

EXAMPLE OUTPUT (for review mode, AI asked "你想吃什麼水果？"):
[
  {
    "chinese": "我想吃蘋果",
    "pinyin": "wǒ xiǎng chī píng guǒ",
    "english": "I want to eat apples",
    "type": "safe"
  },
  {
    "chinese": "香蕉好吃",
    "pinyin": "xiāng jiāo hǎo chī",
    "english": "Bananas are delicious",
    "type": "advanced"
  },
  {
    "chinese": "我不想吃水果",
    "pinyin": "wǒ bù xiǎng chī shuǐ guǒ",
    "english": "I don't want to eat fruit",
    "type": "alternative"
  }
]

WRONG EXAMPLE (DO NOT DO THIS - AI asked "你想吃什麼水果？"):
[
  {
    "chinese": "我想喝水",  ❌ WRONG - AI asked about fruit, not drinks!
    "type": "safe"
  },
  {
    "chinese": "我今天很累",  ❌ WRONG - Completely off-topic!
    "type": "advanced"
  }
]

EXAMPLE OUTPUT (for asking directions scenario):
[
  {
    "chinese": "請問，捷運站怎麼走？",
    "pinyin": "qǐng wèn, jié yùn zhàn zěn me zǒu?",
    "english": "Excuse me, how do I get to the MRT station?",
    "type": "safe"
  },
  {
    "chinese": "不好意思，我想去台北 101",
    "pinyin": "bù hǎo yì sī, wǒ xiǎng qù tái běi yī líng yī",
    "english": "Excuse me, I want to go to Taipei 101",
    "type": "advanced"
  },
  {
    "chinese": "這附近有捷運站嗎？",
    "pinyin": "zhè fù jìn yǒu jié yùn zhàn ma?",
    "english": "Is there an MRT station nearby?",
    "type": "alternative"
  }
]

Return JSON array format with exactly 3 suggestions:
[
  {
    "chinese": "...",
    "pinyin": "...",
    "english": "...",
    "type": "safe"
  },
  {
    "chinese": "...",
    "pinyin": "...",
    "english": "...",
    "type": "advanced"
  },
  {
    "chinese": "...",
    "pinyin": "...",
    "english": "...",
    "type": "alternative"
  }
]`

  console.log('🌐 Calling Gemini API for suggestions...')
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    console.log('📡 Gemini API response received, length:', responseText.length)

    const suggestions = JSON.parse(responseText)
    console.log('✅ Parsed suggestions successfully:', suggestions.length)
    console.log('   First suggestion:', suggestions[0]?.chinese)

    return suggestions.slice(0, 3) // 確保只返回 3 個
  } catch (error) {
    console.error('❌ Error in generateSuggestions Gemini call:', error)
    throw error // 重新拋出錯誤，讓調用者處理
  }
}

// ============================================================================
// POST /api/conversation/start - 初始化對話會話
// ============================================================================
router.post('/start', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { topicMode, scenarioId, userRole, interviewerId } = req.body
    const userId = req.user!.id

    console.log('🎬 Starting conversation:', { topicMode, scenarioId, userRole, userId })

    // 初始化 Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    const genAI = new GoogleGenerativeAI(apiKey!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // 如果是 scenario 模式，加載 scenario 數據
    let scenario: any = null
    let checkpoints: ScenarioCheckpoint[] = []
    let aiRole: any = null
    let firstMessage: { chinese: string; english: string } | null = null
    let suggestions: any[] = []

    if (topicMode === 'scenario' && scenarioId) {
      // 加載 scenario JSON
      const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')
      const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))

      for (const file of files) {
        const content = fs.readFileSync(path.join(scenariosDir, file), 'utf-8')
        const scen = JSON.parse(content)
        if (scen.scenario_id === scenarioId) {
          scenario = scen
          break
        }
      }

      if (!scenario) {
        return res.status(404).json({
          code: 'SCENARIO_NOT_FOUND',
          message: `Scenario ${scenarioId} not found`
        })
      }

      // 初始化 checkpoints
      checkpoints = scenario.checkpoints.map((cp: any) => ({
        id: cp.id,
        description: cp.description,
        chineseDescription: cp.chineseDescription,
        keywords: cp.keywords || [],
        weight: cp.weight,
        completed: false
      }))

      // 確定 AI 角色（與用戶角色相反）
      aiRole = scenario.roles.find((r: any) => r.id !== userRole)
      if (!aiRole) {
        aiRole = scenario.roles[0] // 如果找不到，使用第一個角色
      }

      // 判斷誰應該先說話
      const firstSpeaker = scenario.firstSpeaker || 'ai' // 向後兼容：默認 AI 先說話
      const shouldAiSpeakFirst = firstSpeaker === 'ai'

      console.log(`🎙️ First speaker: ${firstSpeaker}`)

      // 只有當 AI 先說話時才生成首條消息
      if (shouldAiSpeakFirst) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        if (apiKey) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

            const prompt = `${aiRole.systemPrompt}

IMPORTANT: You MUST use Traditional Chinese (Taiwan, 繁體中文) with Taiwan-specific vocabulary.

Scenario: ${scenario.title}
Objective: ${scenario.objective}

You are starting a conversation. Give a natural greeting in Traditional Chinese (1-2 sentences) that sets up the scenario.

Return in JSON format:
{
  "chinese": "greeting in Traditional Chinese (繁體中文)",
  "english": "English translation"
}`

            const result = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: 'application/json'
              }
            })

            const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
            const parsed = JSON.parse(responseText)
            // Handle both array and object formats
            firstMessage = Array.isArray(parsed) ? parsed[0] : parsed
            console.log('✅ Generated AI first message:', firstMessage)
          } catch (error) {
            console.warn('⚠️ Failed to generate first message with Gemini:', error)
            // Use default greeting as fallback
            firstMessage = { chinese: '你好！', english: 'Hello!' }
          }
        } else {
          firstMessage = { chinese: '你好！', english: 'Hello!' }
        }
      } else {
        // 用戶先說話 - 不生成 AI 消息
        firstMessage = null
        console.log('👤 User will speak first')
      }

      // 獲取建議 - 優先使用 Gemini 動態生成
      const nextCheckpoint = checkpoints.find((cp: ScenarioCheckpoint) => !cp.completed)

      try {
        suggestions = await generateSuggestions(model, {
          mode: topicMode,
          conversationHistory: [],
          aiLastMessage: firstMessage?.chinese || null,
          scenarioInfo: {
            objective: scenario.objective,
            nextCheckpoint: nextCheckpoint ? {
              description: nextCheckpoint.description,
              keywords: nextCheckpoint.keywords || []
            } : undefined,
            userRole: userRole
          }
        })
      } catch (error) {
        console.warn('⚠️ Gemini 失敗，使用靜態建議')

        // Fallback 1: 使用 scenario JSON 中的靜態建議
        const roleSuggestions = scenario.suggestions?.byRole?.[userRole] || []

        // 優先使用符合下一個檢查點的建議
        if (nextCheckpoint && roleSuggestions.length > 0) {
          const checkpointSuggestions = roleSuggestions.filter(
            (s: any) => s.checkpointId === nextCheckpoint.id
          )
          suggestions = checkpointSuggestions.length > 0
            ? checkpointSuggestions.slice(0, 3)
            : roleSuggestions.slice(0, 3)
        } else {
          suggestions = roleSuggestions.slice(0, 3)
        }

        // Fallback 2: 通用建議 (最後手段)
        if (suggestions.length === 0) {
          suggestions = [
            { chinese: '好的', pinyin: 'hǎo de', english: 'Okay', type: 'safe' },
            { chinese: '我明白了', pinyin: 'wǒ míng bai le', english: 'I understand', type: 'safe' },
            { chinese: '謝謝', pinyin: 'xiè xie', english: 'Thank you', type: 'safe' }
          ]
        }
      }
    } else if (topicMode === 'all' || topicMode === 'selected') {
      // 複習模式：載入課程詞彙並生成自然對話
      const { completedLessons, selectedChapters } = req.body

      // 載入課程詞彙（最多 5 個課程）
      const reviewData = loadReviewVocabulary(topicMode, completedLessons, selectedChapters)

      if (reviewData.lessons.length === 0 || reviewData.vocabulary.length === 0) {
        return res.status(400).json({
          code: 'NO_LESSONS_TO_REVIEW',
          message: '沒有可複習的課程或詞彙'
        })
      }

      // 生成 AI 首條訊息（說明將開始複習對話）
      const vocabList = reviewData.vocabulary
        .map(v => `- ${v.word} (${v.pinyin}) - ${v.english}`)
        .join('\n')

      const prompt = `你是一位友善的中文老師，正在與學生開始自然對話。

**開場白要求**:
1. 長度：不超過 30 字，1-2 句
2. 風格：像朋友聊天，不像老師上課
3. 詞彙：只用 1-2 個複習詞彙
4. 禁止：不要問「你好嗎？」「怎麼樣？」「準備好了嗎？」「可以嗎？」

**台灣日常口語正確例子**:
✓ "早安！你今天怎麼樣？" (簡短、自然寒暄)
✓ "你好！最近在忙什麼？" (開放式問題)
✓ "嗨！今天要做什麼？" (日常聊天)
✓ "今天要來我家玩嗎？" (自然邀請)
✓ "週末去哪裡玩？" (輕鬆問候)

**台灣口語錯誤例子** (絕對避免):
✗ "你好嗎？今天要去你家嗎？" (突兀組合、不自然)
✗ "我們今天要複習詞彙，準備好了嗎？" (像上課，不像聊天)
✗ "你想去哪裡？" (太正式，應該說「要去哪裡？」)

**複習詞彙清單** (只用 1-2 個):
${vocabList}

返回 JSON：{"chinese": "...", "english": "..."}`

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,  // 降低以提高台灣口語的一致性
            responseMimeType: 'application/json'
          }
        })

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        const parsed = JSON.parse(responseText)
        firstMessage = Array.isArray(parsed) ? parsed[0] : parsed
        console.log('✅ Generated review opening:', firstMessage)
      } catch (error) {
        console.warn('⚠️ Failed to generate review opening with Gemini:', error)
        // 使用自然開場白（避免機械式的「準備好了嗎？」）
        const naturalOpenings = [
          { chinese: '早安！最近過得怎麼樣？', english: 'Good morning! How have you been recently?' },
          { chinese: '你好呀！今天要做什麼？', english: 'Hello! What are you doing today?' },
          { chinese: '嗨！最近有什麼有趣的事嗎？', english: 'Hi! Any interesting things recently?' },
          { chinese: '你好啊！這週過得如何？', english: 'Hi! How was your week?' },
          { chinese: '今天過得好嗎？', english: 'How was your day?' }
        ]
        const randomIndex = Math.floor(Math.random() * naturalOpenings.length)
        firstMessage = naturalOpenings[randomIndex]
        console.log('📝 Using natural fallback opening:', firstMessage.chinese)
      }

      // 生成初始建議回覆
      try {
        suggestions = await generateSuggestions(model, {
          mode: topicMode,
          conversationHistory: [],
          aiLastMessage: firstMessage?.chinese || null,
          reviewVocabulary: reviewData.vocabulary
        })
      } catch (error) {
        console.warn('⚠️ Failed to generate suggestions for review mode')
        // Natural fallback responses (避免元對話，使用自然日常回應)
        suggestions = [
          { chinese: '還不錯！', pinyin: 'hái bù cuò!', english: "Pretty good!", type: 'safe' },
          { chinese: '有點累', pinyin: 'yǒu diǎn lèi', english: "A bit tired", type: 'safe' },
          { chinese: '還好啊', pinyin: 'hái hǎo a', english: "Not bad", type: 'safe' }
        ]
      }

      // 保存複習資料到 session（稍後在 createSession 時使用）
      checkpoints = [] // 複習模式不使用 checkpoints
      aiRole = { id: 'teacher', name: '中文老師' }

      // 將複習資料傳遞給 session（下面會用）
      // 使用臨時變數，稍後在 createSession 時加入
      const reviewVocabulary = reviewData.vocabulary
      const reviewedLessons = reviewData.lessons

      // 創建會話
      const conversationHistory: Array<{ role: 'user' | 'ai'; text: string; timestamp: Date }> = []

      if (firstMessage) {
        conversationHistory.push({
          role: 'ai' as const,
          text: firstMessage.chinese,
          timestamp: new Date()
        })
      }

      const session = conversationStore.createSession({
        mode: topicMode,
        checkpoints: [],
        conversationHistory,
        reviewVocabulary,  // 新增
        reviewedLessons     // 新增
      })

      // Persist to Supabase
      await supabase.from('conversation_sessions').insert({
        user_id: userId,
        session_id: session.sessionId,
        type: 'conversation',
        mode: topicMode,
        completed_at: new Date().toISOString(),
        messages_count: conversationHistory.length,
        settings: req.body,
        conversation_data: { history: conversationHistory },
        reviewed_lessons: reviewedLessons,
        vocabulary_items: reviewVocabulary
      })

      return res.json({
        sessionId: session.sessionId,
        reviewMode: {
          lessons: reviewedLessons,
          vocabularyCount: reviewVocabulary.length
        },
        firstMessage,
        suggestions
      })
    } else {
      // Free talk 模式：AI 總是先說話
      firstMessage = { chinese: '你好！', english: 'Hello!' }

      try {
        suggestions = await generateSuggestions(model, {
          mode: topicMode,
          conversationHistory: [],
          aiLastMessage: firstMessage.chinese
        })
      } catch (error) {
        console.warn('⚠️ Failed to generate suggestions')
        suggestions = []
      }
    }

    // 創建會話
    const conversationHistory: Array<{ role: 'user' | 'ai'; text: string; timestamp: Date }> = []

    // 條件式添加 AI 的第一條消息
    if (firstMessage) {
      conversationHistory.push({
        role: 'ai' as const,
        text: firstMessage.chinese,
        timestamp: new Date()
      })
    }

    const session = conversationStore.createSession({
      mode: topicMode,
      scenarioId,
      userRole,
      aiRole: aiRole?.id,
      checkpoints,
      conversationHistory
    })

    // Persist to Supabase
    await supabase.from('conversation_sessions').insert({
      user_id: userId,
      session_id: session.sessionId,
      type: 'conversation',
      mode: topicMode,
      completed_at: new Date().toISOString(),
      messages_count: conversationHistory.length,
      settings: req.body,
      conversation_data: { history: conversationHistory },
      scenario_id: scenarioId,
      user_role: userRole,
      ai_role: aiRole?.id,
      checkpoints: checkpoints
    })

    res.json({
      sessionId: session.sessionId,
      scenario: scenario ? {
        scenarioId: scenario.scenario_id,
        title: scenario.title,
        objective: scenario.objective,
        userRole: userRole,
        aiRole: aiRole.name,
        checkpoints: checkpoints,
        firstSpeaker: scenario.firstSpeaker || 'ai'
      } : undefined,
      firstMessage,
      suggestions
    })

  } catch (error) {
    console.error('❌ Error starting conversation:', error)
    res.status(500).json({
      code: 'START_CONVERSATION_ERROR',
      message: 'Failed to start conversation'
    })
  }
})

// ============================================================================
// POST /api/conversation/message - 處理用戶消息
// ============================================================================
router.post('/message', authenticateUser, upload.single('audio'), async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body
    const audioFile = req.file
    const userId = req.user!.id

    console.log('💬 Processing message for session:', sessionId)

    // 加載會話
    const session = conversationStore.getSession(sessionId)
    if (!session) {
      return res.status(404).json({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found'
      })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

    if (!apiKey || !audioFile) {
      return res.status(400).json({
        code: 'MISSING_DATA',
        message: 'Audio or API key missing'
      })
    }

    // 1. 語音轉文字 (STT)
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const audioBase64 = audioFile.buffer.toString('base64')

    let transcript = ''
    try {
      const sttPrompt = `You are a precise speech-to-text transcription tool. Transcribe EXACTLY what you hear in this audio.

ABSOLUTE RULES - MUST FOLLOW:
1. Transcribe ONLY the actual sounds you hear - do NOT guess, complete, or invent content
2. Output ONLY Traditional Chinese text (繁體中文) - no punctuation, no formatting, no extra text
3. If the audio is unclear, silent, or too noisy to understand, return EXACTLY: [UNCLEAR]
4. Do NOT add words that are not clearly spoken in the audio
5. Do NOT try to make the sentence "make sense" - just transcribe literally what you hear
6. Short utterances are fine - if user only says 3 words, output only those 3 words

WHAT TO DO:
- Hear "老闆我要一份蛋餅" → Output: "老闆我要一份蛋餅"
- Hear only "蛋餅" → Output: "蛋餅" (NOT a full sentence)
- Hear nothing clear → Output: "[UNCLEAR]"

WHAT NOT TO DO:
❌ Do NOT complete partial sentences
❌ Do NOT guess based on "what makes sense"
❌ Do NOT add context or words the speaker didn't say
❌ Do NOT generate random Chinese text if audio is unclear

Return the exact transcription only.`

      const sttResult = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: sttPrompt },
            {
              inlineData: {
                mimeType: 'audio/webm',
                data: audioBase64
              }
            }
          ]
        }],
        generationConfig: { temperature: 0.1 }  // 降低 temperature 以減少創意發揮
      })

      transcript = sttResult.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      console.log('📝 Transcript:', transcript)

      // 檢測幻覺指標：如果轉錄結果過長或包含可疑模式，記錄警告
      if (transcript.length > 50) {
        console.warn('⚠️ Unusually long transcript detected - potential hallucination:', transcript)
      }
      if (transcript.includes('然後') && transcript.includes('就') && transcript.length > 20) {
        console.warn('⚠️ Suspicious narrative pattern detected - potential hallucination:', transcript)
      }

      // 處理 [UNCLEAR] 回應
      if (transcript === '[UNCLEAR]' || transcript.includes('[UNCLEAR]')) {
        console.warn('⚠️ Audio was unclear, could not transcribe')
        return res.status(400).json({
          code: 'UNCLEAR_AUDIO',
          message: '音訊不清楚，請再試一次。Audio was unclear, please try again.'
        })
      }
    } catch (error) {
      console.error('❌ STT Error:', error)
      return res.status(503).json({
        code: 'STT_ERROR',
        message: 'Speech recognition failed. Please try again.'
      })
    }

    // 2. 檢測檢查點（僅限 scenario 模式）
    let scenarioProgress: any = undefined
    if (session.mode === 'scenario' && session.checkpoints) {
      const normalizedTranscript = normalizeText(transcript)
      console.log(`🔍 Checkpoint detection START - Normalized transcript: "${normalizedTranscript}"`)
      console.log(`   Checkpoints status before:`, session.checkpoints.map(cp => ({ id: cp.id, completed: cp.completed, desc: cp.description })))

      for (const checkpoint of session.checkpoints) {
        console.log(`   Checking checkpoint ${checkpoint.id}: ${checkpoint.description} (completed: ${checkpoint.completed})`)

        if (!checkpoint.completed && checkpoint.keywords) {
          // 先按長度排序關鍵詞（長的優先，避免誤匹配短詞）
          const sortedKeywords = [...checkpoint.keywords].sort((a, b) => b.length - a.length)
          console.log(`     Keywords to check:`, sortedKeywords.slice(0, 10))

          // 檢查關鍵詞匹配（支援部分匹配）
          const matchedKeyword = sortedKeywords.find(kw => {
            const normalizedKeyword = normalizeText(kw)
            // 跳過單字元的寬泛關鍵詞（如「要」、「來」、「點」）
            if (normalizedKeyword.length === 1) {
              // 單字元詞必須是完整詞彙（前後有邊界）或重複出現
              const kwCount = (normalizedTranscript.match(new RegExp(normalizedKeyword, 'g')) || []).length
              const shouldMatch = kwCount >= 1 && normalizedTranscript.split(normalizedKeyword).length <= 2
              if (shouldMatch) console.log(`     Single-char keyword "${kw}" matched (count: ${kwCount})`)
              return shouldMatch
            }
            const matches = normalizedTranscript.includes(normalizedKeyword)
            if (matches) console.log(`     Keyword "${kw}" matched!`)
            return matches
          })

          if (matchedKeyword) {
            checkpoint.completed = true
            checkpoint.completedAt = new Date()
            console.log(`✅ Checkpoint ${checkpoint.id} completed: ${checkpoint.description}`)
            console.log(`   Matched keyword "${matchedKeyword}" in: "${transcript}"`)
            console.log(`   BREAKING LOOP - should not check more checkpoints`)
            break  // 一次只完成一個 checkpoint
          } else {
            console.log(`     No match for checkpoint ${checkpoint.id}`)
          }
        } else if (checkpoint.completed) {
          console.log(`     Skipping checkpoint ${checkpoint.id} - already completed`)
        }
      }

      console.log(`🔍 Checkpoint detection END`)
      console.log(`   Checkpoints status after:`, session.checkpoints.map(cp => ({ id: cp.id, completed: cp.completed, desc: cp.description })))

      const allCompleted = session.checkpoints.every(cp => cp.completed)
      scenarioProgress = {
        checkpoints: session.checkpoints,
        allCheckpointsCompleted: allCompleted
      }
    }

    // ========== 禮貌信號檢測與狀態更新 ==========

    console.log(`🔍 Checking for polite signals in: "${transcript}"`)

    // 初始化 currentTopicState（如果不存在）
    if (!session.currentTopicState) {
      session.currentTopicState = {
        lastCheckpointCompleted: null,
        turnsOnCurrentTopic: 0,
        lastAiMessageType: 'question',
        shouldTransition: false
      }
    }

    // 檢查是否剛完成 checkpoint（在最近 10 秒內）
    const lastCheckpointJustCompleted = session.checkpoints?.some(cp =>
      cp.completed &&
      cp.completedAt &&
      (new Date().getTime() - cp.completedAt.getTime()) < 10000
    )

    // 檢測禮貌信號
    const politeSignal = detectPoliteSignal(transcript, {
      lastCheckpointJustCompleted,
      conversationTurns: session.currentTopicState.turnsOnCurrentTopic,
      lastAiMessageType: session.currentTopicState.lastAiMessageType
    })

    // 如果檢測到應該轉換的信號，標記狀態
    if (politeSignal?.shouldTransition) {
      session.currentTopicState.shouldTransition = true
      console.log('✅ Topic transition triggered by polite signal:', politeSignal.matchedPattern)
    }

    // 更新最後完成的 checkpoint ID
    if (scenarioProgress) {
      const justCompleted = session.checkpoints?.find(cp =>
        cp.completed &&
        (!session.currentTopicState?.lastCheckpointCompleted ||
         cp.id > session.currentTopicState.lastCheckpointCompleted)
      )

      if (justCompleted) {
        session.currentTopicState.lastCheckpointCompleted = justCompleted.id
        session.currentTopicState.turnsOnCurrentTopic = 0  // 重置話題輪數
        console.log(`📍 Updated last completed checkpoint: ${justCompleted.id}`)
      }
    }

    // 增加當前話題輪數計數
    session.currentTopicState.turnsOnCurrentTopic++
    console.log(`📊 Current topic turns: ${session.currentTopicState.turnsOnCurrentTopic}`)

    // ========== 禮貌信號檢測結束 ==========

    // 3. 生成 AI 回覆
    const conversationHistory = session.conversationHistory
      .slice(-10) // 只取最近 10 輪對話
      .map(turn => `${turn.role === 'user' ? 'User' : 'AI'}: ${turn.text}`)
      .join('\n')

    let systemPrompt = 'You are a helpful Chinese conversation partner.'
    let scenario: any = null
    if (session.mode === 'scenario' && session.scenarioId) {
      // 加載 scenario 以獲取 AI 角色的 systemPrompt
      const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')
      const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const content = fs.readFileSync(path.join(scenariosDir, file), 'utf-8')
        const scenarioData = JSON.parse(content)
        if (scenarioData.scenario_id === session.scenarioId) {
          scenario = scenarioData
          const aiRole = scenario.roles.find((r: any) => r.id === session.aiRole)
          if (aiRole) {
            systemPrompt = aiRole.systemPrompt
          }

          // 檢查是否所有檢查點已完成
          if (scenarioProgress?.allCheckpointsCompleted) {
            systemPrompt += '\n\nAll checkpoints have been completed. Politely wrap up the conversation and thank the user.'
          }
          break
        }
      }
    }

    let reply: { chinese: string; english: string } = { chinese: '好的。', english: 'Okay.' }

    try {
      // 找出下一個未完成的 checkpoint
      const nextCheckpoint = session.checkpoints?.find(cp => !cp.completed)
      const completedCheckpoints = session.checkpoints?.filter(cp => cp.completed) || []

      // 構建複習模式上下文
      let reviewContext = ''
      if ((session.mode === 'all' || session.mode === 'selected') && session.reviewVocabulary) {
        const vocabList = session.reviewVocabulary
          .map(v => `${v.word} (${v.pinyin}) - ${v.english}`)
          .join('\n')

        reviewContext = `
REVIEW MODE CONTEXT:
You are helping the student review vocabulary through natural conversation.

Vocabulary to review:
${vocabList}

CONVERSATION STYLE REQUIREMENTS:
1. **Keep it SHORT** - Your response should be 1-2 sentences max (不超過 30 字)
2. **Use only 1-2 vocabulary words** - Don't cram too many words into one response
3. **Use NATURAL DAILY LANGUAGE** - Say "要去嗎？" NOT "你想去嗎？" (too formal)
4. **Actively use vocabulary in YOUR responses** - Don't ask "你知道XX怎麼說嗎？"
5. **DIRECTLY respond to the conversation** - Do NOT ask for opinions or consent (禁止問「怎麼樣？」「好嗎？」「可以嗎？」「你想...嗎？」)
6. **Sound natural** - Like chatting with a friend, not teaching a lesson

Natural Daily Language Examples:
✅ Say "今天要去學校嗎？" (natural daily talk)
❌ Don't say "你想去學校嗎？" (too formal, unnatural)
✅ Say "吃早餐了嗎？" (natural)
❌ Don't say "你想吃早餐嗎？" (unnatural)
✅ Say "今天吃什麼？" (natural)
❌ Don't say "你今天想吃什麼？" (too formal)

Wrong Examples:
❌ "今天我們要複習一下之前學過的顏色、數字，還有一些交通工具喔！欸，說到顏色，你今天穿的紅色上衣真好看！" (太長，詞彙太多)
❌ "你想去學校嗎？" (不自然，太正式)
❌ "你知道早安怎麼說嗎？" (testing the student)
❌ "我們繼續複習，好嗎？" (asking for consent)
❌ "接下來，怎麼樣？" (seeking agreement)

Correct Examples:
✅ "早安！吃早餐了嗎？" (短、自然日常用語)
✅ "謝謝！今天要做什麼？" (簡短、自然)
✅ "今天要去學校嗎？" (自然日常問法)
✅ "我今天搭公車來的。" (分享+自然示範詞彙)

CRITICAL:
- Use natural daily spoken language (說「要去嗎」不說「你想去嗎」)
- Keep responses under 30 characters
- Use only 1-2 vocabulary words per response
- Respond naturally to what the student just said
`
        systemPrompt = '你是一位親切友善的中文老師，正在與學生進行自然的複習對話。'
      }

      // 構建 checkpoint 上下文
      let checkpointContext = ''
      if (session.mode === 'scenario' && nextCheckpoint) {
        checkpointContext = `

Current Progress:
- Completed checkpoints: ${completedCheckpoints.map(cp => cp.description).join(', ') || 'None yet'}
- Next checkpoint to guide user toward: "${nextCheckpoint.description}"
- Relevant keywords for this checkpoint: ${nextCheckpoint.keywords?.slice(0, 5).join(', ')}

IMPORTANT: Naturally guide the conversation toward completing the next checkpoint. Reference what the user just said and ask follow-up questions related to the next checkpoint.`
      }

      // 構建角色職責上下文
      let roleContext = ''
      if (session.mode === 'scenario' && scenario) {
        const aiRole = scenario.roles.find((r: any) => r.id === session.aiRole)

        // 針對 asking-directions 場景的特殊指導
        if (scenario.scenario_id === 'asking-directions-01' && aiRole?.id === 'local') {
          roleContext = `

ROLE CONTEXT - YOU ARE A LOCAL RESIDENT:
- Your job is to GIVE DIRECTIONS to the tourist, not to test their vocabulary
- When the user asks "怎麼走" (how to get there), immediately provide clear directional instructions
- Use directional words (左轉, 右轉, 直走) in YOUR response to guide them
- Example: "從這裡直走 100 米，看到 7-11 左轉，再走 5 分鐘就到了"
- Do NOT ask "你知道左轉是什麼意思嗎？" - they are asking YOU for help, not the other way around
- Do NOT repeatedly confirm if they understand directional words - just give the directions naturally`
        }

        // 針對 doctor-appointment 場景的特殊指導
        if (scenario.scenario_id === 'doctor-appointment-01' && aiRole?.id === 'doctor') {
          roleContext = `

ROLE CONTEXT - YOU ARE A DOCTOR:
- Your job is to DIAGNOSE and EXPLAIN treatment to the patient, not to test their medical vocabulary
- When patient describes symptoms, ask follow-up questions, then provide diagnosis
- Use medical terms in YOUR explanations naturally: "這是感冒，我開處方給你"
- Do NOT ask "你知道診斷是什麼意思嗎？" - they need you to provide diagnosis, not explain terminology
- Be professional but approachable, reassure the patient`
        }

        // 針對 taxi-ride 場景的特殊指導
        if (scenario.scenario_id === 'taxi-ride-01' && aiRole?.id === 'driver') {
          roleContext = `

ROLE CONTEXT - YOU ARE A TAXI DRIVER:
- Your job is to drive the passenger safely to their destination
- Ask for destination, suggest route if needed, drive, then handle payment
- You don't need to explain every turn (左轉, 右轉) to the passenger unless they specifically ask
- Do NOT test passenger's understanding of directional words
- Example: "好的，去台北車站。走高速公路比較快，可以嗎？" then naturally drive
- Be friendly and professional, chat casually if passenger wants`
        }

        // 針對 hotel-checkin 場景的特殊指導
        if (scenario.scenario_id === 'hotel-checkin-01' && aiRole?.id === 'receptionist') {
          roleContext = `

ROLE CONTEXT - YOU ARE A HOTEL RECEPTIONIST:
- Your job is to check in the guest smoothly and provide room information
- After verifying reservation and ID, explain room details naturally: room number, floor, wifi password, breakfast time
- Example: "您的房間是 505，在 5 樓。早餐是 7 點到 10 點，wifi 密碼在房卡後面。"
- Do NOT ask "你知道設施是什麼意思嗎？" - just provide the information they need
- Be professional, welcoming, and helpful`
        }

        // 針對服務場景的改進指導
        if (['restaurant-ordering-01', 'breakfast-shop-01', 'bubble-tea-01', 'convenience-store-01'].includes(scenario.scenario_id)) {
          const completedCheckpointIds = (session.checkpoints || [])
            .filter((cp: any) => cp.completed)
            .map((cp: any) => cp.id)

          let paymentGuidance = ''

          // 根據不同場景檢查是否到了結帳時機
          const isBubbleTea = scenario.scenario_id === 'bubble-tea-01'
          const isBreakfastShop = scenario.scenario_id === 'breakfast-shop-01'
          const isRestaurant = scenario.scenario_id === 'restaurant-ordering-01'

          // Bubble Tea: 完成點餐(1)、甜度(2)、冰量(3)，尚未結帳(4)
          const bubbleTeaReadyForPayment = isBubbleTea &&
            completedCheckpointIds.includes(1) &&
            completedCheckpointIds.includes(2) &&
            completedCheckpointIds.includes(3) &&
            !completedCheckpointIds.includes(4)

          // Breakfast Shop: 完成點主食(1)、配料(2)、飲料(3)，尚未結帳(4)
          const breakfastReadyForPayment = isBreakfastShop &&
            completedCheckpointIds.includes(1) &&
            completedCheckpointIds.includes(2) &&
            completedCheckpointIds.includes(3) &&
            !completedCheckpointIds.includes(4)

          // Restaurant: 完成點餐(3)、飲料(4)，尚未結帳(5)
          const restaurantReadyForPayment = isRestaurant &&
            completedCheckpointIds.includes(3) &&
            completedCheckpointIds.includes(4) &&
            !completedCheckpointIds.includes(5)

          if (bubbleTeaReadyForPayment) {
            paymentGuidance = `

🛒 PAYMENT TIME - YOU MUST ANNOUNCE THE PRICE NOW:
The customer has completed ordering (drink, sweetness, ice level).
YOU MUST NOW:
1. Confirm the order briefly: "好的，珍珠奶茶微糖去冰"
2. ANNOUNCE THE PRICE: "總共 XX 元" or "一共 XX 元"
3. Ask about payment method: "要現金還是刷卡？" or "怎麼付？"

Example response: "好的！珍珠奶茶微糖去冰，一共65元。現金還是刷卡？"

DO NOT just say "好的，請稍等" without announcing the price!`
          } else if (breakfastReadyForPayment) {
            paymentGuidance = `

🛒 PAYMENT TIME - YOU MUST ANNOUNCE THE PRICE NOW:
The customer has completed ordering (main item, fillings, drinks).
YOU MUST NOW:
1. Confirm the order briefly: "好的，蛋餅加蛋、熱豆漿微糖"
2. ANNOUNCE THE PRICE: "總共 XX 元" or "一共 XX 元"

Example response: "好！蛋餅加蛋、熱豆漿微糖，總共55元！"

DO NOT just say "好的，稍等" without announcing the price!`
          } else if (restaurantReadyForPayment) {
            paymentGuidance = `

🛒 AWAITING CUSTOMER PAYMENT REQUEST:
The customer has ordered food and drinks.
When they say "買單" or "結帳", respond with:
1. ANNOUNCE THE PRICE: "好的，總共 XX 元"
2. Handle payment naturally

Example response: "好的！總共280元，現金還是刷卡？"`
          }

          roleContext = `

ROLE CONTEXT - YOU ARE SERVICE STAFF:

CRITICAL RULES:
1. **Recognize polite closure signals**:
   When customer says "麻煩了" "謝謝" after you confirm something:
   - DO NOT repeat the order details
   - DO NOT continue discussing the same topic
   - Give brief acknowledgment (3-8 characters): "好的！" or "收到！"
   - IMMEDIATELY move to next topic

2. **Natural service flow**:
   Customer: "微糖。"
   You: "好的，微糖！" ← brief confirmation (5 characters)
   Customer: "麻煩了。" ← CLOSURE SIGNAL
   You: "收到！冰量呢？" ← ✅ CORRECT: moved to next topic (10 characters)

3. **FORBIDDEN examples**:
   ❌ Customer: "麻煩了"
      You: "不客氣！那我再幫你確認一下，你要的是微糖珍珠奶茶..."
   ❌ Customer: "謝謝"
      You: "別客氣！你的珍奶微糖去冰馬上準備..."

4. **Keep responses SHORT after polite signal**:
   - Brief acknowledgment: 5-15 characters maximum
   - Move forward efficiently
${paymentGuidance}

Taiwanese service is friendly but efficient. After polite signal, MOVE FORWARD.`
        }
      }

      // ========== 話題轉換指示生成 ==========

      let transitionGuidance = ''

      if (session.currentTopicState?.shouldTransition) {
        const allCompleted = session.checkpoints?.every(cp => cp.completed) || false
        const nextCheckpoint = session.checkpoints?.find(cp => !cp.completed)

        console.log(`🎯 Generating transition guidance - allCompleted: ${allCompleted}, nextCheckpoint: ${nextCheckpoint?.description}`)

        if (allCompleted) {
          // 所有 checkpoints 完成 → 簡短確認 + 結束
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - POLITE CLOSURE DETECTED 🎯 🎯 🎯

User said "${transcript}" - polite acknowledgment to close.

ALL tasks complete. You MUST:
1. Very brief acknowledgment (5-10 characters): "好的，馬上就好！" or "收到！請稍候。"
2. DO NOT ask any more questions
3. DO NOT repeat any previous information

KEEP IT SHORT (< 10 characters). END CONVERSATION.`

        } else if (nextCheckpoint) {
          // 有下一個 checkpoint → 簡短確認 + 轉新話題
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - TOPIC TRANSITION REQUIRED 🎯 🎯 🎯

User said "${transcript}" - polite signal to finish current sub-topic.

DO NOT continue current topic. You MUST:
1. Brief acknowledgment (3-5 characters): "好！" or "收到！"
2. IMMEDIATELY ask about next checkpoint: "${nextCheckpoint.description}"
3. Total response: 10-20 characters MAXIMUM

✅ CORRECT examples:
- "好！還要別的嗎？" (8 characters)
- "收到！內用外帶？" (8 characters)

❌ FORBIDDEN:
- Repeating previous information
- Continuing same topic

BE BRIEF. TRANSITION NOW.`

        } else if (session.mode === 'all' || session.mode === 'selected') {
          // 複習模式：總是轉換新話題
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - REVIEW MODE TOPIC CHANGE 🎯 🎯 🎯

User said "${transcript}" - polite acknowledgment.

REVIEW MODE: You MUST transition to a NEW topic.

1. Very brief acknowledgment (3-5 characters): "好！" or "收到！"
2. Start a NEW topic immediately using different vocabulary
3. Total response: 15-25 characters

✅ CORRECT:
- "好！那你最近去哪裡玩？" (natural topic change)
- "收到！你今天要做什麼？" (new topic)

❌ FORBIDDEN:
- Continuing same topic
- Asking follow-up about what was just discussed

CHANGE TOPIC NOW.`

        } else {
          // 其他情況：簡短確認
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - BRIEF ACKNOWLEDGMENT REQUIRED 🎯 🎯 🎯

User said "${transcript}" - polite acknowledgment.

Respond with VERY brief acknowledgment (3-8 characters):
- "好的！" or "收到！" or "沒問題！"

KEEP IT EXTREMELY SHORT (< 8 characters).`
        }

        // 重置轉換標記
        session.currentTopicState.shouldTransition = false
        console.log('📝 Added transition guidance to AI prompt')
      }

      // ========== 話題轉換指示生成結束 ==========

      const aiPrompt = `${transitionGuidance}${transitionGuidance ? '\n\n' : ''}${systemPrompt}

IMPORTANT: You MUST respond using Traditional Chinese (Taiwan, 繁體中文) with Taiwan-specific vocabulary and expressions.
${roleContext}
${reviewContext}
${checkpointContext}

Conversation history:
${conversationHistory}

User just said: ${transcript}

Respond in Traditional Chinese (1-2 sentences). Be natural and conversational.

Dialogue tips:
- If user mentioned a specific item (e.g., "冰豆漿"), acknowledge it directly: "好的，冰豆漿！"
- Then ask follow-up naturally: "要調整甜度嗎？" or "甜度要怎麼調？"
- Don't say unnatural phrases like "豆漿要甜度嗎？"
- Use Taiwan casual expressions: "要不要...", "需要...", "怎麼樣"

If the user mentioned something related to the next checkpoint, acknowledge it and continue guiding them.

Return in JSON format:
{
  "chinese": "your response in Traditional Chinese (繁體中文)",
  "english": "English translation"
}`

      const aiResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json'
        }
      })

      const replyText = aiResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      let parsedReply = JSON.parse(replyText)

      // 防禦性檢查：如果 Gemini 回傳陣列，取第一個元素
      if (Array.isArray(parsedReply)) {
        console.warn('⚠️ Gemini returned array instead of object, using first element')
        reply = parsedReply[0] || { chinese: '好的。', english: 'Okay.' }
      } else {
        reply = parsedReply
      }

      console.log('🤖 AI Reply:', reply)
    } catch (error) {
      console.error('❌ AI Reply Error:', error)
      // 使用備用回覆，讓對話可以繼續
      reply = { chinese: '我明白了。請繼續。', english: 'I understand. Please continue.' }
      console.log('⚠️ Using fallback reply')
    }

    // ========== 分析並記錄 AI 回覆類型 ==========

    if (session.currentTopicState && reply?.chinese) {
      const replyText = reply.chinese

      // 判斷 AI 回覆的類型
      if (replyText.includes('？') || replyText.includes('?')) {
        session.currentTopicState.lastAiMessageType = 'question'
      } else if (replyText.includes('好的') || replyText.includes('收到') ||
                 replyText.includes('沒問題') || replyText.includes('了解')) {
        session.currentTopicState.lastAiMessageType = 'confirmation'
      } else {
        session.currentTopicState.lastAiMessageType = 'statement'
      }

      console.log(`📊 AI message type: ${session.currentTopicState.lastAiMessageType}, reply: "${replyText}"`)
    }

    // ========== AI 回覆類型分析結束 ==========

    // 4. 更新對話歷史
    session.conversationHistory.push({
      role: 'user',
      text: transcript,
      timestamp: new Date()
    })
    session.conversationHistory.push({
      role: 'ai',
      text: reply.chinese || '好的。',
      timestamp: new Date()
    })

    conversationStore.updateSession(sessionId, session)

    // 5. 生成建議回覆
    let suggestions: any[] = []
    let scenarioData: any = null

    // 重新加載 scenario 以獲取靜態建議
    if (session.mode === 'scenario' && session.scenarioId) {
      const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')
      const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const content = fs.readFileSync(path.join(scenariosDir, file), 'utf-8')
        const scenario = JSON.parse(content)
        if (scenario.scenario_id === session.scenarioId) {
          scenarioData = scenario
          break
        }
      }
    }

    const nextCheckpoint = session.checkpoints?.find((cp: ScenarioCheckpoint) => !cp.completed)

    console.log('💡 Generating suggestions...')
    console.log('   Mode:', session.mode)
    console.log('   AI last message:', reply.chinese || '好的。')
    console.log('   Has review vocabulary:', !!session.reviewVocabulary)

    try {
      suggestions = await generateSuggestions(model, {
        mode: session.mode,
        conversationHistory: session.conversationHistory.slice(-6).map(turn => ({
          role: turn.role,
          text: turn.text
        })),
        aiLastMessage: reply.chinese || '好的。',
        scenarioInfo: session.mode === 'scenario' && scenarioData ? {
          objective: scenarioData.objective || '',
          nextCheckpoint: nextCheckpoint ? {
            description: nextCheckpoint.description,
            keywords: nextCheckpoint.keywords || []
          } : undefined,
          userRole: session.userRole
        } : undefined,
        reviewVocabulary: session.reviewVocabulary  // 複習模式詞彙
      })
      console.log('✅ Suggestions generated successfully:', suggestions.length)
    } catch (error) {
      console.error('❌ Gemini generateSuggestions failed:', error)
      console.warn('⚠️ Using fallback suggestions')

      // Fallback 1: 使用 scenario JSON 中的靜態建議
      if (scenarioData && session.userRole) {
        const roleSuggestions = scenarioData.suggestions?.byRole?.[session.userRole] || []

        // 優先使用符合下一個檢查點的建議
        if (nextCheckpoint && roleSuggestions.length > 0) {
          const checkpointSuggestions = roleSuggestions.filter(
            (s: any) => s.checkpointId === nextCheckpoint.id
          )
          suggestions = checkpointSuggestions.length > 0
            ? checkpointSuggestions.slice(0, 3)
            : roleSuggestions.slice(0, 3)
        } else {
          suggestions = roleSuggestions.slice(0, 3)
        }
      }

      // Fallback 2: 通用建議 (最後手段)
      if (suggestions.length === 0) {
        suggestions = [
          { chinese: '好的', pinyin: 'hǎo de', english: 'Okay', type: 'safe' },
          { chinese: '我明白了', pinyin: 'wǒ míng bai le', english: 'I understand', type: 'safe' },
          { chinese: '謝謝', pinyin: 'xiè xie', english: 'Thank you', type: 'safe' }
        ]
      }
    }

    // 6. 更新 Supabase 會話數據
    console.log('💾 Updating Supabase session...')
    const { data: updateData, error: updateError } = await supabase
      .from('conversation_sessions')
      .update({
        conversation_data: { history: session.conversationHistory },
        messages_count: session.conversationHistory.length,
        checkpoints: session.checkpoints,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('❌ Supabase update failed:', updateError)
      // 不要因為 Supabase 更新失敗就讓整個請求失敗
      // 繼續返回響應
    } else {
      console.log('✅ Supabase session updated successfully')
    }

    // 7. 返回響應
    console.log('✅ Message processed successfully')
    res.json({
      userTranscript: transcript,
      instructorReply: reply,
      scenarioProgress,
      suggestions
    })

  } catch (error) {
    console.error('❌ Error processing message:', error)
    res.status(500).json({
      code: 'MESSAGE_PROCESSING_ERROR',
      message: 'Failed to process message'
    })
  }
})

// ============================================================================
// POST /api/conversation/end - 結束對話並生成報告
// ============================================================================
router.post('/end', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body
    const userId = req.user!.id

    console.log('🏁 Ending conversation:', sessionId)

    const session = conversationStore.getSession(sessionId)
    if (!session) {
      return res.status(404).json({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found'
      })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

    // 分析對話
    let analysis: any = {
      totalTurns: Math.floor(session.conversationHistory.length / 2),
      duration: Math.floor((new Date().getTime() - session.createdAt.getTime()) / 1000),
      fluency: 75,
      vocabulary: 75,
      grammar: 75
    }

    if (session.mode === 'scenario' && session.checkpoints) {
      const completedCount = session.checkpoints.filter(cp => cp.completed).length
      analysis.checkpointsCompleted = completedCount
      analysis.checkpointsTotal = session.checkpoints.length
    }

    // 複習模式：記錄已複習的課程
    if ((session.mode === 'all' || session.mode === 'selected') && session.reviewedLessons) {
      analysis.reviewedLessons = session.reviewedLessons
      analysis.reviewType = session.mode === 'all' ? '所有已完成課程' : '選定章節'
      analysis.vocabularyCount = session.reviewVocabulary?.length || 0
    }

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const conversationText = session.conversationHistory
          .map(turn => `${turn.role === 'user' ? 'User' : 'AI'}: ${turn.text}`)
          .join('\n')

        // 為語法修正準備用戶輪次
        const userTurns = session.conversationHistory
          .filter(turn => turn.role === 'user')
          .map((turn, index) => ({ turnIndex: index + 1, text: turn.text }))

        const locale = getLocaleFromRequest(req);
        const feedbackLangInstruction = getFeedbackLanguagePrompt(locale);

        const analysisPrompt = `Analyze this Chinese conversation and provide scores (0-100):

Conversation:
${conversationText}

User turns for grammar analysis:
${userTurns.map(t => `Turn ${t.turnIndex}: "${t.text}"`).join('\n')}

${feedbackLangInstruction}

Provide a JSON analysis with the following structure:
{
  "fluency": score,
  "vocabulary": score,
  "grammar": score,
  "feedback": "detailed feedback in the learner's language",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "vocabularyUsed": ["word1", "word2", "word3"],
  "vocabularyDetails": [
    {
      "chinese": "詞語",
      "pinyin": "cí yǔ",
      "english": "vocabulary"
    }
  ],
  "turnCorrections": [
    {
      "turnIndex": 1,
      "userText": "user's original text",
      "corrections": {
        "grammar": [
          {
            "original": "incorrect phrase",
            "corrected": "correct phrase",
            "explanation": "explanation in the learner's language",
            "explanationZh": "中文說明",
            "type": "word-order|measure-word|tense|particle|vocabulary|other"
          }
        ],
        "pronunciation": [
          {
            "word": "字",
            "pinyin": "correct pinyin",
            "issue": "tone|initial|final|missing|added",
            "description": "issue description in the learner's language",
            "descriptionZh": "中文描述",
            "severity": "minor|moderate|major"
          }
        ],
        "correctedText": "fully corrected sentence",
        "correctedPinyin": "pinyin for corrected sentence",
        "score": 0-100
      }
    }
  ],
  "correctionSummary": {
    "totalTurns": number,
    "turnsWithIssues": number,
    "grammarIssueCount": number,
    "pronunciationIssueCount": number,
    "commonGrammarIssues": ["issue type 1", "issue type 2"],
    "commonPronunciationIssues": ["issue type 1"],
    "overallGrammarScore": 0-100,
    "overallPronunciationScore": 0-100,
    "recommendations": ["recommendation 1", "recommendation 2"]
  }
}

IMPORTANT INSTRUCTIONS:
1. Extract key Chinese vocabulary words/phrases. Focus on meaningful content words, not particles or common words like 我、是、的.
2. For each user turn, analyze grammar and potential pronunciation issues. If a turn is perfect, include it with empty grammar and pronunciation arrays.
3. Grammar types: word-order (詞序), measure-word (量詞), tense (時態), particle (虛詞), vocabulary (詞彙), other
4. Pronunciation severity: minor (輕微), moderate (中等), major (嚴重)
5. The correctionSummary should aggregate data from all turnCorrections.
6. Be thorough but not overly critical - focus on significant issues that affect communication.
7. **IGNORE PUNCTUATION COMPLETELY**: Do NOT flag missing or incorrect punctuation (逗號、句號、問號、驚嘆號) as grammar issues. This is spoken conversation practice, not formal writing. Examples of what NOT to flag:
   - Missing comma after address terms (e.g., "老闆我要..." is perfectly acceptable, do NOT suggest "老闆，我要...")
   - Missing periods at end of sentences
   - Missing question marks
   - Any punctuation-related corrections
   Focus ONLY on actual grammar errors like word order, measure words, tense, and vocabulary usage.`

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0.5,
            responseMimeType: 'application/json'
          }
        })

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        const aiAnalysis = JSON.parse(responseText)

        analysis = { ...analysis, ...aiAnalysis }
        console.log('✅ Generated analysis:', analysis)
      } catch (error) {
        console.warn('⚠️ Failed to generate analysis with Gemini:', error)
      }
    }

    // 生成報告 ID
    const reportId = `report-${sessionId}`

    // 保存報告（可選：保存到文件系統）
    // const reportsDir = path.join(__dirname, '../../dist/logs/reports')
    // fs.mkdirSync(reportsDir, { recursive: true })
    // fs.writeFileSync(
    //   path.join(reportsDir, `${reportId}.json`),
    //   JSON.stringify({ reportId, sessionId, analysis, session }, null, 2)
    // )

    res.json({
      reportId,
      analysis
    })

  } catch (error) {
    console.error('❌ Error ending conversation:', error)
    res.status(500).json({
      code: 'END_CONVERSATION_ERROR',
      message: 'Failed to end conversation'
    })
  }
})

export default router
