import express from 'express'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Helper function to find the lessons directory
function findLessonsDir(): string | null {
  const possiblePaths = [
    path.join(__dirname, '../plugins/chinese-lessons'),  // dist/plugins (production)
    path.join(__dirname, '../../src/plugins/chinese-lessons'),  // src/plugins (fallback)
    path.join(process.cwd(), 'apps/backend/dist/plugins/chinese-lessons'),  // absolute path (Railway)
    path.join(process.cwd(), 'apps/backend/src/plugins/chinese-lessons')  // absolute path fallback
  ]

  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      return tryPath
    }
  }

  return null
}

// 獲取課程列表
router.get('/', (req, res) => {
  try {
    console.log('📂 __dirname:', __dirname)
    console.log('📂 cwd:', process.cwd())

    const lessonsDir = findLessonsDir()

    if (!lessonsDir) {
      console.log('❌ lessonsDir does not exist in any location!')
      return res.json([])
    }

    console.log(`✅ Found lessons at: ${lessonsDir}`)

    const lessons: any[] = []

    // 掃描所有 chapter 子目錄
    const entries = fs.readdirSync(lessonsDir, { withFileTypes: true })

    for (const entry of entries) {
      // 只處理 chapter-XX 格式的目錄
      if (entry.isDirectory() && entry.name.startsWith('chapter-')) {
        const chapterPath = path.join(lessonsDir, entry.name)
        const lessonFiles = fs.readdirSync(chapterPath).filter(f =>
          f.startsWith('lesson-') && f.endsWith('.json')
        )

        // 讀取每個課程文件
        for (const file of lessonFiles) {
          try {
            const filePath = path.join(chapterPath, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const lesson = JSON.parse(content)

            const lessonData = {
              lesson_id: lesson.lesson_id,
              chapterId: lesson.chapter_id,
              lessonNumber: lesson.lesson_number,
              title: lesson.title,
              description: lesson.description || '',
              stepCount: lesson.steps?.length || 0
            }

            if (lessons.length === 0) {
              console.log('🔍 First lesson data:', lessonData)
            }

            lessons.push(lessonData)
          } catch (error) {
            console.error(`Error reading lesson file ${file}:`, error)
          }
        }
      }
    }

    // 按章節和課程編號排序
    lessons.sort((a, b) => {
      // 提取章節編號 (C1 -> 1, C10 -> 10)
      const chapterA = parseInt(a.chapterId?.replace('C', '') || '0')
      const chapterB = parseInt(b.chapterId?.replace('C', '') || '0')

      if (chapterA !== chapterB) {
        return chapterA - chapterB
      }

      return (a.lessonNumber || 0) - (b.lessonNumber || 0)
    })

    console.log(`✅ Loaded ${lessons.length} lessons from ${entries.filter(e => e.isDirectory() && e.name.startsWith('chapter-')).length} chapters`)
    console.log('📤 Sending first 3 lessons:', lessons.slice(0, 3))
    res.json(lessons)
  } catch (error) {
    console.error('Error loading lessons:', error)
    res.status(500).json({ error: 'Failed to load lessons' })
  }
})

// 獲取單個課程
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const lessonsDir = findLessonsDir()

    if (!lessonsDir) {
      return res.status(500).json({ error: 'Lessons directory not found' })
    }

    let lessonPath: string

    // 支援新格式 "C1-L01" 和舊格式 "L1"
    if (id.includes('-')) {
      // 新格式：C1-L01 -> chapter-01/lesson-01.json
      const match = id.match(/^C(\d+)-L(\d+)$/)
      if (match) {
        const chapterNum = match[1].padStart(2, '0')
        const lessonNum = match[2].padStart(2, '0')
        lessonPath = path.join(
          lessonsDir,
          `chapter-${chapterNum}`,
          `lesson-${lessonNum}.json`
        )
      } else {
        return res.status(400).json({ error: 'Invalid lesson ID format' })
      }
    } else {
      // 舊格式：L1 -> L1.json (向後兼容)
      lessonPath = path.join(lessonsDir, `${id}.json`)
    }

    if (!fs.existsSync(lessonPath)) {
      return res.status(404).json({ error: 'Lesson not found' })
    }

    const content = fs.readFileSync(lessonPath, 'utf-8')
    const lesson = JSON.parse(content)

    res.json(lesson)
  } catch (error) {
    console.error('Error loading lesson:', error)
    res.status(500).json({ error: 'Failed to load lesson' })
  }
})

export default router
