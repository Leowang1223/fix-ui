/**
 * Translate lesson JSON files to Vietnamese, Thai, and Indonesian
 *
 * Usage:
 *   node scripts/translate-lessons.js              # Run translation
 *   node scripts/translate-lessons.js --dry-run    # Preview only
 *   node scripts/translate-lessons.js --chapter 1  # Only translate chapter 1
 *
 * Requires ANTHROPIC_API_KEY in environment or apps/backend/.env
 */

const fs = require('fs')
const path = require('path')

// Load .env from backend
const envPath = path.join(__dirname, '..', 'apps', 'backend', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^(\w+)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

const Anthropic = require('@anthropic-ai/sdk')

const LESSONS_DIR = path.join(__dirname, '..', 'apps', 'backend', 'src', 'plugins', 'chinese-lessons')

const LOCALES = {
  vi: 'Vietnamese (Tiếng Việt)',
  th: 'Thai (ภาษาไทย)',
  id: 'Indonesian (Bahasa Indonesia)',
}

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const chapterFilter = args.includes('--chapter') ? args[args.indexOf('--chapter') + 1] : null

async function translateBatch(client, strings, targetLang) {
  const prompt = `Translate the following English strings to ${targetLang}.
These are used in a Chinese language learning app for Southeast Asian learners.

RULES:
- Keep translations natural and conversational
- For vocabulary hints (short words/phrases), keep them concise
- For encouragement messages, keep the encouraging and friendly tone
- For example sentences, translate accurately
- Return ONLY a JSON array of translated strings in the same order, no other text

Input strings:
${JSON.stringify(strings, null, 2)}

Return a JSON array of ${strings.length} translated strings:`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0]?.text || '[]'

  // Extract JSON array from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error(`No JSON array found in response: ${responseText.substring(0, 100)}`)

  const translated = JSON.parse(jsonMatch[0])

  if (translated.length !== strings.length) {
    throw new Error(`Expected ${strings.length} translations, got ${translated.length}`)
  }

  return translated
}

async function translateLesson(client, lessonPath) {
  const content = fs.readFileSync(lessonPath, 'utf-8')
  const lesson = JSON.parse(content)

  if (!lesson.steps || lesson.steps.length === 0) {
    console.log(`  ⏭️  No steps, skipping`)
    return false
  }

  // Check if already translated (all 3 locales present)
  const firstStep = lesson.steps[0]
  if (firstStep.hints?.vi && firstStep.hints?.th && firstStep.hints?.id) {
    console.log(`  ⏭️  Already translated, skipping`)
    return false
  }

  // Collect all strings to translate per field
  const hints = lesson.steps.map(s => s.english_hint || '')
  const encouragements = lesson.steps.map(s => s.encouragement || '')
  const exampleSentences = lesson.steps.map(s => s.example_sentence_en || '')

  // Combine all strings into one batch for efficiency
  const allStrings = [...hints, ...encouragements, ...exampleSentences]
  const stepCount = lesson.steps.length

  if (DRY_RUN) {
    console.log(`  📋 Would translate ${allStrings.length} strings (${stepCount} steps × 3 fields)`)
    console.log(`     Sample: "${hints[0]}" → [vi/th/id]`)
    return false
  }

  // Translate to each locale
  let successCount = 0
  for (const [locale, langName] of Object.entries(LOCALES)) {
    // Skip if this locale is already done
    if (firstStep.hints?.[locale]) {
      console.log(`    ⏭️  ${locale} already done, skipping`)
      successCount++
      continue
    }

    console.log(`    🌐 Translating to ${locale}...`)

    try {
      const translated = await translateBatch(client, allStrings, langName)

      // Split back into 3 groups
      const translatedHints = translated.slice(0, stepCount)
      const translatedEncouragements = translated.slice(stepCount, stepCount * 2)
      const translatedExamples = translated.slice(stepCount * 2)

      // Apply to steps
      for (let i = 0; i < lesson.steps.length; i++) {
        if (!lesson.steps[i].hints) lesson.steps[i].hints = {}
        if (!lesson.steps[i].encouragements) lesson.steps[i].encouragements = {}
        if (!lesson.steps[i].example_sentences) lesson.steps[i].example_sentences = {}

        lesson.steps[i].hints[locale] = translatedHints[i]
        lesson.steps[i].encouragements[locale] = translatedEncouragements[i]
        lesson.steps[i].example_sentences[locale] = translatedExamples[i]
      }
      successCount++
      console.log(`    ✅ ${locale} done`)
    } catch (error) {
      console.log(`    ❌ Failed for ${locale}: ${error.message}`)
      // Continue with other locales
    }

    // Rate limiting: wait 300ms between API calls
    await new Promise(r => setTimeout(r, 300))
  }

  // Only write back if at least one locale succeeded
  if (successCount > 0) {
    fs.writeFileSync(lessonPath, JSON.stringify(lesson, null, 2) + '\n', 'utf-8')
    return successCount === Object.keys(LOCALES).length
  }
  console.log(`  ⚠️  No translations succeeded, file unchanged`)
  return false
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('❌ No ANTHROPIC_API_KEY found. Set it in environment or apps/backend/.env')
    process.exit(1)
  }

  console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '🚀 TRANSLATION MODE (Claude Haiku)')
  console.log(`📂 Lessons dir: ${LESSONS_DIR}`)

  const client = new Anthropic.default({ apiKey })

  // Find all chapter directories
  const chapters = fs.readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('chapter-'))
    .sort((a, b) => a.name.localeCompare(b.name))

  let totalTranslated = 0
  let totalSkipped = 0

  for (const chapter of chapters) {
    const chapterNum = chapter.name.replace('chapter-', '')
    if (chapterFilter && chapterNum !== chapterFilter.padStart(2, '0')) continue

    console.log(`\n📖 Chapter ${chapterNum}`)
    const chapterPath = path.join(LESSONS_DIR, chapter.name)
    const lessonFiles = fs.readdirSync(chapterPath)
      .filter(f => f.startsWith('lesson-') && f.endsWith('.json'))
      .sort()

    for (const file of lessonFiles) {
      const lessonPath = path.join(chapterPath, file)
      console.log(`  📄 ${file}`)

      try {
        const translated = await translateLesson(client, lessonPath)
        if (translated) {
          totalTranslated++
          console.log(`  ✅ Done`)
        } else {
          totalSkipped++
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`)
        totalSkipped++
      }
    }
  }

  console.log(`\n📊 Summary: ${totalTranslated} translated, ${totalSkipped} skipped`)
}

main().catch(console.error)
