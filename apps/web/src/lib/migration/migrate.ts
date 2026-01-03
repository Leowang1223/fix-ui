import { createClient } from '@/lib/supabase/client'

export async function migrateUserData() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('⚠️ No user logged in, skipping migration')
    return
  }

  console.log('🔄 Starting data migration for:', user.email)

  try {
    await migrateLessonHistory(supabase, user.id)
    await migrateConversationHistory(supabase, user.id)
    await migrateFlashcards(supabase, user.id)
    console.log('✅ Migration completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

async function migrateLessonHistory(supabase: any, userId: string) {
  const lessonHistory = localStorage.getItem('lessonHistory')
  if (!lessonHistory) {
    console.log('📚 No lesson history to migrate')
    return
  }

  console.log('📚 Migrating lesson history...')
  const history = JSON.parse(lessonHistory)
  let migratedCount = 0

  for (const entry of history) {
    try {
      const { error } = await supabase.from('lesson_history').upsert({
        user_id: userId,
        session_id: entry.sessionId,
        lesson_id: entry.lessonId,
        lesson_title: entry.lessonTitle,
        completed_at: entry.completedAt,
        total_score: entry.totalScore,
        questions_count: entry.questionsCount,
        total_attempts: entry.totalAttempts || 0,
        pronunciation_score: entry.radar?.pronunciation,
        fluency_score: entry.radar?.fluency,
        accuracy_score: entry.radar?.accuracy,
        comprehension_score: entry.radar?.comprehension,
        confidence_score: entry.radar?.confidence,
        results: entry.results
      }, { onConflict: 'user_id,session_id' })

      if (error) {
        console.warn('Failed to migrate lesson entry:', error)
      } else {
        migratedCount++
      }
    } catch (error) {
      console.warn('Error migrating lesson entry:', error)
    }
  }

  console.log(`✅ Migrated ${migratedCount} lesson history entries`)
  localStorage.removeItem('lessonHistory')
}

async function migrateConversationHistory(supabase: any, userId: string) {
  const conversationHistory = localStorage.getItem('conversationHistory')
  if (!conversationHistory) {
    console.log('💬 No conversation history to migrate')
    return
  }

  console.log('💬 Migrating conversation history...')
  const conversations = JSON.parse(conversationHistory)
  let migratedCount = 0

  for (const conv of conversations) {
    try {
      const { error } = await supabase.from('conversation_sessions').upsert({
        user_id: userId,
        session_id: conv.sessionId,
        type: conv.type || 'conversation',
        mode: conv.settings?.mode,
        completed_at: conv.completedAt,
        messages_count: conv.messages || 0,
        report_id: conv.reportId,
        settings: conv.settings,
        conversation_data: conv.conversationData,
        scenario_id: conv.scenarioId,
        user_role: conv.userRole,
        ai_role: conv.aiRole,
        checkpoints: conv.checkpoints,
        reviewed_lessons: conv.reviewedLessons,
        vocabulary_items: conv.vocabularyItems
      }, { onConflict: 'session_id' })

      if (error) {
        console.warn('Failed to migrate conversation:', error)
      } else {
        migratedCount++
      }
    } catch (error) {
      console.warn('Error migrating conversation:', error)
    }
  }

  console.log(`✅ Migrated ${migratedCount} conversation sessions`)
  localStorage.removeItem('conversationHistory')
}

async function migrateFlashcards(supabase: any, userId: string) {
  const flashcardsV2 = localStorage.getItem('flashcards_v2')
  if (!flashcardsV2) {
    console.log('🃏 No flashcards to migrate')
    return
  }

  console.log('🃏 Migrating flashcards...')
  const cards = JSON.parse(flashcardsV2)
  let migratedCount = 0

  for (const card of cards) {
    try {
      const { error } = await supabase.from('flashcards').insert({
        user_id: userId,
        front: card.front,
        pinyin: card.pinyin,
        back: card.back,
        deck_name: card.deckName,
        metadata: card.metadata,
        created_at: card.createdAt
      })

      if (error) {
        // Skip duplicate entries
        if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
          console.warn('Failed to migrate flashcard:', error)
        }
      } else {
        migratedCount++
      }
    } catch (error) {
      console.warn('Error migrating flashcard:', error)
    }
  }

  console.log(`✅ Migrated ${migratedCount} flashcards`)
  localStorage.removeItem('flashcards_v2')
  localStorage.removeItem('flashcard_decks_v1')
}
