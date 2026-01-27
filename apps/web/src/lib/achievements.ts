/**
 * 成就徽章系統
 */

export interface Achievement {
  id: string
  name: string
  nameZh: string
  description: string
  descriptionZh: string
  emoji: string
  icon: string // Lucide icon name
  condition: string // 解鎖條件描述
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: string // ISO date string
}

// 成就定義
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-recording',
    name: 'First Words',
    nameZh: '初次開口',
    description: 'Complete your first recording',
    descriptionZh: '完成第一次錄音',
    emoji: '🎤',
    icon: 'Mic',
    condition: '完成 1 次錄音',
    rarity: 'common',
  },
  {
    id: 'perfect-score',
    name: 'Perfect Pronunciation',
    nameZh: '完美發音',
    description: 'Get a perfect 100 score',
    descriptionZh: '獲得 100 分滿分',
    emoji: '⭐',
    icon: 'Star',
    condition: '獲得 100 分',
    rarity: 'epic',
  },
  {
    id: 'high-score-90',
    name: 'Excellent Speaker',
    nameZh: '優秀發音',
    description: 'Score 90 or above',
    descriptionZh: '獲得 90 分以上',
    emoji: '🌟',
    icon: 'Award',
    condition: '獲得 90 分以上',
    rarity: 'rare',
  },
  {
    id: 'streak-3',
    name: 'Getting Started',
    nameZh: '持續學習',
    description: 'Practice for 3 days in a row',
    descriptionZh: '連續 3 天練習',
    emoji: '🔥',
    icon: 'Flame',
    condition: '連續 3 天練習',
    rarity: 'common',
  },
  {
    id: 'streak-7',
    name: 'Weekly Warrior',
    nameZh: '一週達人',
    description: 'Practice for 7 days in a row',
    descriptionZh: '連續 7 天練習',
    emoji: '💪',
    icon: 'Zap',
    condition: '連續 7 天練習',
    rarity: 'rare',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    nameZh: '月度大師',
    description: 'Practice for 30 days in a row',
    descriptionZh: '連續 30 天練習',
    emoji: '👑',
    icon: 'Crown',
    condition: '連續 30 天練習',
    rarity: 'legendary',
  },
  {
    id: 'lesson-complete-1',
    name: 'Lesson Learner',
    nameZh: '課程學徒',
    description: 'Complete your first lesson',
    descriptionZh: '完成第一個課程',
    emoji: '📚',
    icon: 'BookOpen',
    condition: '完成 1 個課程',
    rarity: 'common',
  },
  {
    id: 'lesson-complete-5',
    name: 'Dedicated Student',
    nameZh: '勤奮學生',
    description: 'Complete 5 lessons',
    descriptionZh: '完成 5 個課程',
    emoji: '📖',
    icon: 'GraduationCap',
    condition: '完成 5 個課程',
    rarity: 'rare',
  },
  {
    id: 'lesson-complete-10',
    name: 'Course Champion',
    nameZh: '課程冠軍',
    description: 'Complete all 10 lessons',
    descriptionZh: '完成全部 10 個課程',
    emoji: '🏆',
    icon: 'Trophy',
    condition: '完成 10 個課程',
    rarity: 'legendary',
  },
  {
    id: 'sentences-50',
    name: 'Talkative',
    nameZh: '話匣子',
    description: 'Practice 50 sentences',
    descriptionZh: '練習 50 個句子',
    emoji: '💬',
    icon: 'MessageSquare',
    condition: '練習 50 個句子',
    rarity: 'common',
  },
  {
    id: 'sentences-100',
    name: 'Chatterbox',
    nameZh: '百句達人',
    description: 'Practice 100 sentences',
    descriptionZh: '練習 100 個句子',
    emoji: '🗣️',
    icon: 'MessageCircle',
    condition: '練習 100 個句子',
    rarity: 'rare',
  },
  {
    id: 'retry-improvement',
    name: 'Never Give Up',
    nameZh: '永不放棄',
    description: 'Improve score after retrying',
    descriptionZh: '重試後分數提升',
    emoji: '📈',
    icon: 'TrendingUp',
    condition: '重試後分數提升',
    rarity: 'common',
  },
  {
    id: 'conversation-1',
    name: 'Conversation Starter',
    nameZh: '對話新手',
    description: 'Complete your first AI conversation',
    descriptionZh: '完成第一次 AI 對話',
    emoji: '🤖',
    icon: 'Bot',
    condition: '完成 1 次 AI 對話',
    rarity: 'common',
  },
]

// LocalStorage keys
const STORAGE_KEY = 'achievements_unlocked'
const STATS_KEY = 'achievements_stats'

export interface AchievementStats {
  totalRecordings: number
  highestScore: number
  currentStreak: number
  lastPracticeDate: string | null
  lessonsCompleted: number
  sentencesPracticed: number
  conversationsCompleted: number
  retryImprovements: number
}

// 獲取預設統計
function getDefaultStats(): AchievementStats {
  return {
    totalRecordings: 0,
    highestScore: 0,
    currentStreak: 0,
    lastPracticeDate: null,
    lessonsCompleted: 0,
    sentencesPracticed: 0,
    conversationsCompleted: 0,
    retryImprovements: 0,
  }
}

// 獲取統計數據
export function getStats(): AchievementStats {
  if (typeof window === 'undefined') return getDefaultStats()
  try {
    const stored = localStorage.getItem(STATS_KEY)
    return stored ? { ...getDefaultStats(), ...JSON.parse(stored) } : getDefaultStats()
  } catch {
    return getDefaultStats()
  }
}

// 保存統計數據
export function saveStats(stats: AchievementStats): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

// 獲取已解鎖的成就
export function getUnlockedAchievements(): UnlockedAchievement[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// 保存已解鎖的成就
function saveUnlockedAchievements(achievements: UnlockedAchievement[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements))
}

// 檢查成就是否已解鎖
export function isAchievementUnlocked(achievementId: string): boolean {
  const unlocked = getUnlockedAchievements()
  return unlocked.some(a => a.id === achievementId)
}

// 解鎖成就
export function unlockAchievement(achievementId: string): UnlockedAchievement | null {
  if (isAchievementUnlocked(achievementId)) return null

  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (!achievement) return null

  const unlocked: UnlockedAchievement = {
    ...achievement,
    unlockedAt: new Date().toISOString(),
  }

  const allUnlocked = getUnlockedAchievements()
  allUnlocked.push(unlocked)
  saveUnlockedAchievements(allUnlocked)

  return unlocked
}

// 檢查並解鎖成就（基於統計數據）
export function checkAndUnlockAchievements(stats: AchievementStats): UnlockedAchievement[] {
  const newlyUnlocked: UnlockedAchievement[] = []

  // 第一次錄音
  if (stats.totalRecordings >= 1) {
    const a = unlockAchievement('first-recording')
    if (a) newlyUnlocked.push(a)
  }

  // 滿分
  if (stats.highestScore >= 100) {
    const a = unlockAchievement('perfect-score')
    if (a) newlyUnlocked.push(a)
  }

  // 90分以上
  if (stats.highestScore >= 90) {
    const a = unlockAchievement('high-score-90')
    if (a) newlyUnlocked.push(a)
  }

  // 連續學習
  if (stats.currentStreak >= 3) {
    const a = unlockAchievement('streak-3')
    if (a) newlyUnlocked.push(a)
  }
  if (stats.currentStreak >= 7) {
    const a = unlockAchievement('streak-7')
    if (a) newlyUnlocked.push(a)
  }
  if (stats.currentStreak >= 30) {
    const a = unlockAchievement('streak-30')
    if (a) newlyUnlocked.push(a)
  }

  // 完成課程
  if (stats.lessonsCompleted >= 1) {
    const a = unlockAchievement('lesson-complete-1')
    if (a) newlyUnlocked.push(a)
  }
  if (stats.lessonsCompleted >= 5) {
    const a = unlockAchievement('lesson-complete-5')
    if (a) newlyUnlocked.push(a)
  }
  if (stats.lessonsCompleted >= 10) {
    const a = unlockAchievement('lesson-complete-10')
    if (a) newlyUnlocked.push(a)
  }

  // 練習句子
  if (stats.sentencesPracticed >= 50) {
    const a = unlockAchievement('sentences-50')
    if (a) newlyUnlocked.push(a)
  }
  if (stats.sentencesPracticed >= 100) {
    const a = unlockAchievement('sentences-100')
    if (a) newlyUnlocked.push(a)
  }

  // 重試進步
  if (stats.retryImprovements >= 1) {
    const a = unlockAchievement('retry-improvement')
    if (a) newlyUnlocked.push(a)
  }

  // AI 對話
  if (stats.conversationsCompleted >= 1) {
    const a = unlockAchievement('conversation-1')
    if (a) newlyUnlocked.push(a)
  }

  return newlyUnlocked
}

// 更新錄音統計並檢查成就
export function trackRecording(score: number, previousScore?: number): UnlockedAchievement[] {
  const stats = getStats()
  const today = new Date().toISOString().split('T')[0]

  // 更新統計
  stats.totalRecordings += 1
  stats.sentencesPracticed += 1

  if (score > stats.highestScore) {
    stats.highestScore = score
  }

  // 更新連續學習
  if (stats.lastPracticeDate) {
    const lastDate = new Date(stats.lastPracticeDate)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      stats.currentStreak += 1
    } else if (diffDays > 1) {
      stats.currentStreak = 1
    }
    // diffDays === 0 時保持不變
  } else {
    stats.currentStreak = 1
  }
  stats.lastPracticeDate = today

  // 檢查重試進步
  if (previousScore !== undefined && score > previousScore) {
    stats.retryImprovements += 1
  }

  saveStats(stats)
  return checkAndUnlockAchievements(stats)
}

// 更新課程完成統計
export function trackLessonComplete(): UnlockedAchievement[] {
  const stats = getStats()
  stats.lessonsCompleted += 1
  saveStats(stats)
  return checkAndUnlockAchievements(stats)
}

// 更新對話完成統計
export function trackConversationComplete(): UnlockedAchievement[] {
  const stats = getStats()
  stats.conversationsCompleted += 1
  saveStats(stats)
  return checkAndUnlockAchievements(stats)
}

// 獲取成就進度
export function getAchievementProgress(): { total: number; unlocked: number; percentage: number } {
  const unlocked = getUnlockedAchievements().length
  const total = ACHIEVEMENTS.length
  return {
    total,
    unlocked,
    percentage: Math.round((unlocked / total) * 100),
  }
}

// 重置所有成就（用於測試）
export function resetAchievements(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STATS_KEY)
}
