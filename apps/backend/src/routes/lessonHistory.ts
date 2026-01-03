import express from 'express'
import { authenticateUser, AuthRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = express.Router()

// GET /api/lesson-history - Get all lesson history for authenticated user
router.get('/', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('lesson_history')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('completed_at', { ascending: false })

    if (error) throw error

    res.json({ history: data || [] })
  } catch (error: any) {
    console.error('Error fetching lesson history:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch lesson history'
    })
  }
})

// GET /api/lesson-history/:sessionId - Get specific lesson by session ID
router.get('/:sessionId', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params

    const { data, error } = await supabase
      .from('lesson_history')
      .select('*')
      .eq('user_id', req.user!.id)
      .eq('session_id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Lesson history not found'
        })
      }
      throw error
    }

    res.json(data)
  } catch (error: any) {
    console.error('Error fetching lesson:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch lesson'
    })
  }
})

// POST /api/lesson-history - Create or update lesson history
router.post('/', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const lessonData = {
      user_id: req.user!.id,
      session_id: req.body.sessionId,
      lesson_id: req.body.lessonId,
      lesson_title: req.body.lessonTitle,
      completed_at: req.body.completedAt || new Date().toISOString(),
      total_score: req.body.totalScore,
      questions_count: req.body.questionsCount,
      total_attempts: req.body.totalAttempts || 0,
      pronunciation_score: req.body.pronunciationScore,
      fluency_score: req.body.fluencyScore,
      accuracy_score: req.body.accuracyScore,
      comprehension_score: req.body.comprehensionScore,
      confidence_score: req.body.confidenceScore,
      results: req.body.results
    }

    const { data, error } = await supabase
      .from('lesson_history')
      .upsert(lessonData, {
        onConflict: 'user_id,session_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (error: any) {
    console.error('Error saving lesson history:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to save lesson history'
    })
  }
})

// DELETE /api/lesson-history/:sessionId - Delete specific lesson history
router.delete('/:sessionId', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params

    const { error } = await supabase
      .from('lesson_history')
      .delete()
      .eq('user_id', req.user!.id)
      .eq('session_id', sessionId)

    if (error) throw error

    res.json({ success: true, message: 'Lesson history deleted' })
  } catch (error: any) {
    console.error('Error deleting lesson history:', error)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to delete lesson history'
    })
  }
})

export default router
