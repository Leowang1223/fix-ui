import express from 'express'
import { authenticateUser, AuthRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = express.Router()

// ============================================
// 每日目標 API (Daily Goals)
// ============================================

// GET /api/user/daily-goals - 獲取用戶每日目標設定與進度
router.get('/daily-goals', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const today = new Date().toISOString().split('T')[0]

    // 獲取目標設定
    const { data: goals, error: goalsError } = await supabase
      .from('user_daily_goals')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 獲取今日進度
    const { data: progress, error: progressError } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    // 計算連續學習天數
    const streak = await calculateStreak(userId)

    // 預設目標值
    const defaultGoals = {
      lessons_goal: 3,
      minutes_goal: 30,
      questions_goal: 10,
      conversations_goal: 1
    }

    res.json({
      goals: goals || defaultGoals,
      progress: progress || {
        date: today,
        lessons_completed: 0,
        minutes_studied: 0,
        questions_answered: 0,
        conversations_completed: 0
      },
      streak
    })
  } catch (error: any) {
    console.error('Error fetching daily goals:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch daily goals'
    })
  }
})

// PUT /api/user/daily-goals - 更新每日目標設定
router.put('/daily-goals', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { lessonsGoal, minutesGoal, questionsGoal, conversationsGoal } = req.body

    const { data, error } = await supabase
      .from('user_daily_goals')
      .upsert({
        user_id: userId,
        lessons_goal: lessonsGoal || 3,
        minutes_goal: minutesGoal || 30,
        questions_goal: questionsGoal || 10,
        conversations_goal: conversationsGoal || 1,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, goals: data })
  } catch (error: any) {
    console.error('Error updating daily goals:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to update daily goals'
    })
  }
})

// POST /api/user/daily-goals/progress - 更新每日進度
router.post('/daily-goals/progress', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const today = new Date().toISOString().split('T')[0]
    const { type, amount = 1 } = req.body

    // 獲取當前進度
    const { data: existing } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    const currentProgress = existing || {
      user_id: userId,
      date: today,
      lessons_completed: 0,
      minutes_studied: 0,
      questions_answered: 0,
      conversations_completed: 0
    }

    // 根據類型更新對應欄位
    switch (type) {
      case 'lesson':
        currentProgress.lessons_completed += amount
        break
      case 'minutes':
        currentProgress.minutes_studied += amount
        break
      case 'question':
        currentProgress.questions_answered += amount
        break
      case 'conversation':
        currentProgress.conversations_completed += amount
        break
      default:
        return res.status(400).json({
          code: 'INVALID_TYPE',
          message: 'Invalid progress type. Use: lesson, minutes, question, or conversation'
        })
    }

    const { data, error } = await supabase
      .from('daily_progress')
      .upsert(currentProgress, {
        onConflict: 'user_id,date'
      })
      .select()
      .single()

    if (error) throw error

    // 檢查是否達成目標
    const { data: goals } = await supabase
      .from('user_daily_goals')
      .select('*')
      .eq('user_id', userId)
      .single()

    const isGoalMet = checkGoalCompletion(data, goals)

    res.json({
      success: true,
      progress: data,
      goalCompleted: isGoalMet
    })
  } catch (error: any) {
    console.error('Error updating daily progress:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to update daily progress'
    })
  }
})

// ============================================
// 學習路徑 API (Learning Path)
// ============================================

// GET /api/user/learning-path - 獲取學習路徑與里程碑
router.get('/learning-path', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    // 獲取用戶里程碑進度
    const { data: milestones, error } = await supabase
      .from('user_milestones')
      .select('*')
      .eq('user_id', userId)
      .order('milestone_order', { ascending: true })

    if (error) throw error

    // 如果沒有里程碑，初始化預設里程碑
    if (!milestones || milestones.length === 0) {
      const defaultMilestones = await initializeMilestones(userId)
      return res.json({ milestones: defaultMilestones })
    }

    res.json({ milestones })
  } catch (error: any) {
    console.error('Error fetching learning path:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch learning path'
    })
  }
})

// POST /api/user/learning-path/milestone - 更新里程碑狀態
router.post('/learning-path/milestone', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { milestoneId, completed, progress } = req.body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (completed !== undefined) {
      updateData.completed = completed
      if (completed) {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (progress !== undefined) {
      updateData.progress = progress
    }

    const { data, error } = await supabase
      .from('user_milestones')
      .update(updateData)
      .eq('user_id', userId)
      .eq('id', milestoneId)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, milestone: data })
  } catch (error: any) {
    console.error('Error updating milestone:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to update milestone'
    })
  }
})

// ============================================
// 課程完成事件 API (Lesson Completion)
// ============================================

// POST /api/user/lesson-complete - 課程完成事件處理
router.post('/lesson-complete', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const {
      lessonId,
      score,
      questionsCount,
      duration // 學習時長（分鐘）
    } = req.body

    const today = new Date().toISOString().split('T')[0]

    // 1. 更新每日進度
    const { data: currentProgress } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    const progress = currentProgress || {
      user_id: userId,
      date: today,
      lessons_completed: 0,
      minutes_studied: 0,
      questions_answered: 0,
      conversations_completed: 0
    }

    progress.lessons_completed += 1
    progress.minutes_studied += (duration || 5)
    progress.questions_answered += (questionsCount || 0)

    await supabase
      .from('daily_progress')
      .upsert(progress, { onConflict: 'user_id,date' })

    // 2. 檢查並更新里程碑
    const milestoneUpdates = await checkAndUpdateMilestones(userId, {
      type: 'lesson',
      lessonId,
      score
    })

    // 3. 檢查成就解鎖
    const achievements = await checkAchievements(userId, {
      type: 'lesson_complete',
      score,
      lessonId
    })

    // 4. 檢查目標完成
    const { data: goals } = await supabase
      .from('user_daily_goals')
      .select('*')
      .eq('user_id', userId)
      .single()

    const goalCompleted = checkGoalCompletion(progress, goals)

    res.json({
      success: true,
      progress,
      milestoneUpdates,
      achievements,
      goalCompleted
    })
  } catch (error: any) {
    console.error('Error processing lesson completion:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to process lesson completion'
    })
  }
})

// ============================================
// 用戶進度彙總 API (Progress Summary)
// ============================================

// GET /api/user/progress - 獲取用戶整體學習進度
router.get('/progress', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    // 獲取最近 30 天的學習數據
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: recentProgress, error: progressError } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true })

    if (progressError) throw progressError

    // 獲取課程歷史統計
    const { data: lessonStats, error: statsError } = await supabase
      .from('lesson_history')
      .select('total_score, completed_at, lesson_id')
      .eq('user_id', userId)

    if (statsError) throw statsError

    // 計算統計數據
    const totalLessons = lessonStats?.length || 0
    const averageScore = totalLessons > 0
      ? Math.round(lessonStats.reduce((sum, l) => sum + (l.total_score || 0), 0) / totalLessons)
      : 0
    const uniqueLessons = new Set(lessonStats?.map(l => l.lesson_id)).size

    // 計算連續學習天數
    const streak = await calculateStreak(userId)

    // 計算本週數據
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const weeklyData = recentProgress?.filter(p => p.date >= weekStartStr) || []
    const weeklyLessons = weeklyData.reduce((sum, p) => sum + (p.lessons_completed || 0), 0)
    const weeklyMinutes = weeklyData.reduce((sum, p) => sum + (p.minutes_studied || 0), 0)

    res.json({
      summary: {
        totalLessons,
        uniqueLessons,
        averageScore,
        streak,
        weeklyLessons,
        weeklyMinutes
      },
      recentProgress: recentProgress || [],
      lessonStats: lessonStats || []
    })
  } catch (error: any) {
    console.error('Error fetching user progress:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch user progress'
    })
  }
})

// GET /api/user/achievements - 獲取用戶成就
router.get('/achievements', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) throw error

    res.json({ achievements: data || [] })
  } catch (error: any) {
    console.error('Error fetching achievements:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch achievements'
    })
  }
})

// ============================================
// 輔助函數
// ============================================

// 計算連續學習天數
async function calculateStreak(userId: string): Promise<number> {
  try {
    const { data: progress } = await supabase
      .from('daily_progress')
      .select('date')
      .eq('user_id', userId)
      .gt('lessons_completed', 0)
      .order('date', { ascending: false })
      .limit(60) // 最多查詢 60 天

    if (!progress || progress.length === 0) return 0

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 如果今天或昨天沒有學習，連續天數為 0
    if (progress[0].date !== today && progress[0].date !== yesterday) {
      return 0
    }

    let streak = 1
    let currentDate = new Date(progress[0].date)

    for (let i = 1; i < progress.length; i++) {
      const prevDate = new Date(currentDate)
      prevDate.setDate(prevDate.getDate() - 1)
      const prevDateStr = prevDate.toISOString().split('T')[0]

      if (progress[i].date === prevDateStr) {
        streak++
        currentDate = prevDate
      } else {
        break
      }
    }

    return streak
  } catch {
    return 0
  }
}

// 初始化預設里程碑
async function initializeMilestones(userId: string) {
  const defaultMilestones = [
    { milestone_order: 1, title: '開始學習', description: '完成第一堂課', target: 1, type: 'lessons' },
    { milestone_order: 2, title: '初學者', description: '完成 5 堂課', target: 5, type: 'lessons' },
    { milestone_order: 3, title: '持續進步', description: '連續學習 7 天', target: 7, type: 'streak' },
    { milestone_order: 4, title: '發音達人', description: '獲得 90+ 分', target: 90, type: 'score' },
    { milestone_order: 5, title: '對話高手', description: '完成 5 次對話', target: 5, type: 'conversations' },
    { milestone_order: 6, title: '學習達人', description: '完成所有課程', target: 10, type: 'lessons' },
  ]

  const milestones = defaultMilestones.map(m => ({
    user_id: userId,
    ...m,
    progress: 0,
    completed: false,
    created_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('user_milestones')
    .insert(milestones)
    .select()

  if (error) throw error
  return data
}

// 檢查並更新里程碑
async function checkAndUpdateMilestones(
  userId: string,
  event: { type: string; lessonId?: string; score?: number }
): Promise<any[]> {
  const updates: any[] = []

  // 獲取用戶里程碑
  const { data: milestones } = await supabase
    .from('user_milestones')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)

  if (!milestones) return updates

  for (const milestone of milestones) {
    let newProgress = milestone.progress

    switch (milestone.type) {
      case 'lessons':
        if (event.type === 'lesson') {
          newProgress += 1
        }
        break
      case 'score':
        if (event.score && event.score >= milestone.target) {
          newProgress = milestone.target
        }
        break
      case 'streak':
        const streak = await calculateStreak(userId)
        newProgress = streak
        break
      case 'conversations':
        if (event.type === 'conversation') {
          newProgress += 1
        }
        break
    }

    if (newProgress !== milestone.progress) {
      const completed = newProgress >= milestone.target

      await supabase
        .from('user_milestones')
        .update({
          progress: newProgress,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestone.id)

      updates.push({
        milestoneId: milestone.id,
        title: milestone.title,
        progress: newProgress,
        target: milestone.target,
        completed
      })
    }
  }

  return updates
}

// 檢查成就解鎖
async function checkAchievements(
  userId: string,
  event: { type: string; score?: number; lessonId?: string }
): Promise<any[]> {
  const unlockedAchievements: any[] = []

  // 定義成就條件
  const achievementChecks = [
    {
      id: 'first-lesson',
      name: '第一步',
      condition: async () => {
        const { count } = await supabase
          .from('lesson_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        return (count || 0) >= 1
      }
    },
    {
      id: 'perfect-score',
      name: '完美發音',
      condition: async () => event.score && event.score >= 95
    },
    {
      id: 'streak-7',
      name: '七日連續',
      condition: async () => {
        const streak = await calculateStreak(userId)
        return streak >= 7
      }
    }
  ]

  for (const check of achievementChecks) {
    // 檢查是否已解鎖
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', check.id)
      .single()

    if (existing) continue

    // 檢查條件
    const conditionMet = await check.condition()
    if (conditionMet) {
      await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: check.id,
          achievement_name: check.name,
          unlocked_at: new Date().toISOString()
        })

      unlockedAchievements.push({
        id: check.id,
        name: check.name
      })
    }
  }

  return unlockedAchievements
}

// 檢查目標完成
function checkGoalCompletion(progress: any, goals: any): boolean {
  if (!goals) return false

  const lessonsComplete = progress.lessons_completed >= (goals.lessons_goal || 3)
  const minutesComplete = progress.minutes_studied >= (goals.minutes_goal || 30)

  return lessonsComplete || minutesComplete
}

export default router
