import express from 'express'
import fs from 'fs'
import path from 'path'
import { getLocaleFromRequest } from '../utils/i18n'

const router = express.Router()

type SupportedLocale = 'en' | 'zh' | 'vi' | 'th' | 'id'

function applyLocale(scenario: any, locale: SupportedLocale): any {
  if (locale === 'en') return scenario

  const s = { ...scenario }

  if (locale === 'zh') {
    s.title = scenario.chineseTitle || scenario.title
    s.description = scenario.chineseDescription || scenario.description
    s.objective = scenario.chineseObjective || scenario.objective
  } else {
    // vi / th / id — use translated fields if available
    s.title = scenario.titles?.[locale] || scenario.title
    s.description = scenario.descriptions?.[locale] || scenario.description
    s.objective = scenario.objectives?.[locale] || scenario.objective
  }

  if (Array.isArray(scenario.checkpoints)) {
    s.checkpoints = scenario.checkpoints.map((cp: any) => {
      const localisedCp = { ...cp }
      if (locale === 'zh') {
        localisedCp.description = cp.chineseDescription || cp.description
      } else {
        localisedCp.description = cp.descriptions?.[locale] || cp.description
      }
      return localisedCp
    })
  }

  if (Array.isArray(scenario.roles)) {
    s.roles = scenario.roles.map((role: any) => {
      const localisedRole = { ...role }
      if (locale === 'zh') {
        localisedRole.name = role.chineseName || role.name
      } else {
        localisedRole.name = role.names?.[locale] || role.name
      }
      return localisedRole
    })
  }

  // Remove raw multi-locale objects to reduce payload
  delete s.titles
  delete s.descriptions
  delete s.objectives
  delete s.chineseTitle
  delete s.chineseDescription
  delete s.chineseObjective

  return s
}

// 獲取所有場景
router.get('/', (req, res) => {
  try {
    // __dirname in compiled code is dist/routes
    const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')

    if (!fs.existsSync(scenariosDir)) {
      return res.json({ scenarios: [] })
    }

    const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))
    const scenarios: any[] = []

    // 讀取所有場景文件
    for (const file of files) {
      try {
        const filePath = path.join(scenariosDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const scenario = JSON.parse(content)
        scenarios.push(scenario)
      } catch (error) {
        console.error(`Error reading scenario file ${file}:`, error)
      }
    }

    // 過濾：支援難度和類別查詢參數
    let filteredScenarios = scenarios

    const { difficulty, category } = req.query

    if (difficulty && typeof difficulty === 'string') {
      filteredScenarios = filteredScenarios.filter(s => s.difficulty === difficulty)
    }

    if (category && typeof category === 'string') {
      filteredScenarios = filteredScenarios.filter(s => s.category === category)
    }

    const locale = getLocaleFromRequest(req) as SupportedLocale
    const localised = filteredScenarios.map(s => applyLocale(s, locale))

    console.log(`✅ Loaded ${localised.length}/${scenarios.length} scenarios (locale: ${locale})`)
    res.json({ scenarios: localised })
  } catch (error) {
    console.error('Error loading scenarios:', error)
    res.status(500).json({
      code: 'SCENARIOS_LOAD_ERROR',
      message: 'Failed to load scenarios'
    })
  }
})

// 獲取單個場景
router.get('/:scenarioId', (req, res) => {
  try {
    const { scenarioId } = req.params
    const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')

    if (!fs.existsSync(scenariosDir)) {
      return res.status(404).json({
        code: 'SCENARIO_NOT_FOUND',
        message: 'Scenarios directory not found'
      })
    }

    // 搜尋匹配的場景文件
    const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const filePath = path.join(scenariosDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const scenario = JSON.parse(content)

        if (scenario.scenario_id === scenarioId) {
          const locale = getLocaleFromRequest(req) as SupportedLocale
          console.log(`✅ Found scenario: ${scenarioId} (locale: ${locale})`)
          return res.json({ scenario: applyLocale(scenario, locale) })
        }
      } catch (error) {
        console.error(`Error reading scenario file ${file}:`, error)
      }
    }

    // 如果找不到場景
    res.status(404).json({
      code: 'SCENARIO_NOT_FOUND',
      message: `Scenario '${scenarioId}' not found`
    })
  } catch (error) {
    console.error('Error loading scenario:', error)
    res.status(500).json({
      code: 'SCENARIO_LOAD_ERROR',
      message: 'Failed to load scenario'
    })
  }
})

export default router
