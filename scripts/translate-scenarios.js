/**
 * Translate scenario JSON files to Vietnamese, Thai, and Indonesian
 *
 * Usage:
 *   node scripts/translate-scenarios.js              # Run translation
 *   node scripts/translate-scenarios.js --dry-run    # Preview only
 *
 * Requires GEMINI_API_KEY or ANTHROPIC_API_KEY in apps/backend/.env
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

const { GoogleGenerativeAI } = require('@google/generative-ai')

const SCENARIOS_DIR = path.join(__dirname, '..', 'apps', 'backend', 'src', 'plugins', 'scenarios')

const LOCALES = {
  vi: 'Vietnamese (Tiếng Việt)',
  th: 'Thai (ภาษาไทย)',
  id: 'Indonesian (Bahasa Indonesia)',
}

const DRY_RUN = process.argv.includes('--dry-run')

async function translateBatch(model, strings, targetLang) {
  const prompt = `Translate the following English strings to ${targetLang}.
These are used in a Chinese language learning app for Southeast Asian learners.

RULES:
- Keep translations natural and conversational
- For scenario titles and descriptions, keep them concise and clear
- For objective statements, keep them action-oriented
- For checkpoint descriptions, keep them short (2-5 words)
- Return ONLY a JSON array of translated strings in the same order, no other text

Input strings:
${JSON.stringify(strings, null, 2)}

Return a JSON array of ${strings.length} translated strings:`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
  })
  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error(`No JSON array found in response: ${responseText.substring(0, 100)}`)

  const translated = JSON.parse(jsonMatch[0])
  if (translated.length !== strings.length) {
    throw new Error(`Expected ${strings.length} translations, got ${translated.length}`)
  }
  return translated
}

async function translateScenario(model, scenarioPath) {
  const content = fs.readFileSync(scenarioPath, 'utf-8')
  const scenario = JSON.parse(content)

  // Check if already translated
  if (scenario.titles?.vi && scenario.titles?.th && scenario.titles?.id) {
    console.log(`  ⏭️  Already translated, skipping`)
    return false
  }

  // Collect strings to translate
  const title = scenario.title || ''
  const description = scenario.description || ''
  const objective = scenario.objective || ''
  const checkpointDescs = (scenario.checkpoints || []).map(c => c.description || '')

  // Also translate role names for display
  const roleNames = (scenario.roles || []).map(r => r.name || '')

  const allStrings = [title, description, objective, ...checkpointDescs, ...roleNames]
  const checkpointCount = checkpointDescs.length
  const roleCount = roleNames.length

  if (DRY_RUN) {
    console.log(`  📋 Would translate ${allStrings.length} strings`)
    console.log(`     Title: "${title}"`)
    console.log(`     ${checkpointCount} checkpoints, ${roleCount} roles`)
    return false
  }

  let successCount = 0
  for (const [locale, langName] of Object.entries(LOCALES)) {
    if (scenario.titles?.[locale]) {
      console.log(`    ⏭️  ${locale} already done`)
      successCount++
      continue
    }

    console.log(`    🌐 Translating to ${locale}...`)
    try {
      const translated = await translateBatch(model, allStrings, langName)

      // Split results
      const [tTitle, tDesc, tObjective, ...rest] = translated
      const tCheckpoints = rest.slice(0, checkpointCount)
      const tRoles = rest.slice(checkpointCount)

      // Apply titles/descriptions/objectives
      if (!scenario.titles) scenario.titles = {}
      if (!scenario.descriptions) scenario.descriptions = {}
      if (!scenario.objectives) scenario.objectives = {}

      scenario.titles[locale] = tTitle
      scenario.descriptions[locale] = tDesc
      scenario.objectives[locale] = tObjective

      // Apply checkpoint descriptions
      for (let i = 0; i < scenario.checkpoints.length; i++) {
        if (!scenario.checkpoints[i].descriptions) scenario.checkpoints[i].descriptions = {}
        scenario.checkpoints[i].descriptions[locale] = tCheckpoints[i] || checkpointDescs[i]
      }

      // Apply role names
      for (let i = 0; i < scenario.roles.length; i++) {
        if (!scenario.roles[i].names) scenario.roles[i].names = {}
        scenario.roles[i].names[locale] = tRoles[i] || roleNames[i]
      }

      successCount++
      console.log(`    ✅ ${locale} done`)
    } catch (error) {
      console.log(`    ❌ Failed for ${locale}: ${error.message}`)
    }

    await new Promise(r => setTimeout(r, 500))
  }

  if (successCount > 0) {
    fs.writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2) + '\n', 'utf-8')
    return successCount === Object.keys(LOCALES).length
  }
  console.log(`  ⚠️  No translations succeeded`)
  return false
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (!geminiKey || geminiKey.includes('placeholder')) {
    console.error('❌ No GEMINI_API_KEY found in apps/backend/.env')
    process.exit(1)
  }

  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '🚀 TRANSLATION MODE (Gemini 2.5 Flash)')
  console.log(`📂 Scenarios dir: ${SCENARIOS_DIR}`)

  const files = fs.readdirSync(SCENARIOS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()

  let totalTranslated = 0
  let totalSkipped = 0

  for (const file of files) {
    const scenarioPath = path.join(SCENARIOS_DIR, file)
    console.log(`\n📄 ${file}`)
    try {
      const translated = await translateScenario(model, scenarioPath)
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

  console.log(`\n📊 Summary: ${totalTranslated} translated, ${totalSkipped} skipped`)
}

main().catch(console.error)
