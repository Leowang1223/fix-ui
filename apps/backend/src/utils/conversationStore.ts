// Conversation Session Store - In-memory storage for active conversations

export interface ScenarioCheckpoint {
  id: number
  description: string
  chineseDescription: string
  completed: boolean
  completedAt?: Date
  keywords?: string[]
  weight: number
}

export interface ConversationTurn {
  role: 'user' | 'ai'
  text: string
  timestamp: Date
}

export interface VocabularyItem {
  word: string          // 中文詞彙
  pinyin: string        // 拼音
  english: string       // 英文翻譯
  lessonId: string      // 來源課程
}

export interface ConversationSession {
  sessionId: string
  mode: 'selected' | 'all' | 'free' | 'scenario'
  topics?: string[]
  scenarioId?: string
  userRole?: string
  aiRole?: string
  checkpoints?: ScenarioCheckpoint[]
  conversationHistory: ConversationTurn[]
  reviewVocabulary?: VocabularyItem[]     // 複習詞彙清單
  reviewedLessons?: string[]               // 複習的課程 IDs
  createdAt: Date
  lastActivity: Date

  // 新增：對話狀態追蹤
  currentTopicState?: {
    lastCheckpointCompleted: number | null   // 最後完成的 checkpoint ID
    turnsOnCurrentTopic: number               // 在當前子話題已進行幾輪
    lastAiMessageType: 'question' | 'statement' | 'confirmation'  // AI 上次消息類型
    shouldTransition: boolean                 // 標記：下次回覆應該轉換話題
  }
}

class ConversationStore {
  private sessions = new Map<string, ConversationSession>()

  createSession(data: Partial<ConversationSession>): ConversationSession {
    const sessionId = data.sessionId || this.generateSessionId()

    const session: ConversationSession = {
      sessionId,
      mode: data.mode || 'free',
      topics: data.topics || [],
      scenarioId: data.scenarioId,
      userRole: data.userRole,
      aiRole: data.aiRole,
      checkpoints: data.checkpoints || [],
      conversationHistory: data.conversationHistory || [],
      createdAt: data.createdAt || new Date(),
      lastActivity: new Date(),

      // 初始化對話狀態
      currentTopicState: {
        lastCheckpointCompleted: null,
        turnsOnCurrentTopic: 0,
        lastAiMessageType: 'question',
        shouldTransition: false
      }
    }

    this.sessions.set(sessionId, session)
    console.log(`✅ Created session: ${sessionId}`)
    return session
  }

  getSession(sessionId: string): ConversationSession | null {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = new Date()
    }
    return session || null
  }

  updateSession(sessionId: string, updates: Partial<ConversationSession>): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      Object.assign(session, updates)
      session.lastActivity = new Date()
      console.log(`✅ Updated session: ${sessionId}`)
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    console.log(`✅ Deleted session: ${sessionId}`)
  }

  // 清理超過 24 小時的舊會話
  cleanup(): void {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < oneDayAgo) {
        this.sessions.delete(sessionId)
        console.log(`🧹 Cleaned up old session: ${sessionId}`)
      }
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  // 獲取當前會話總數（用於監控）
  getSessionCount(): number {
    return this.sessions.size
  }
}

// 創建單例實例
export const conversationStore = new ConversationStore()

// 每小時清理一次舊會話
setInterval(() => {
  conversationStore.cleanup()
}, 60 * 60 * 1000)
