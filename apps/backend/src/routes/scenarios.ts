import express from 'express'
import fs from 'fs'
import path from 'path'

const router = express.Router()

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

    console.log(`✅ Loaded ${filteredScenarios.length}/${scenarios.length} scenarios`)
    res.json({ scenarios: filteredScenarios })
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
          console.log(`✅ Found scenario: ${scenarioId}`)
          return res.json({ scenario })
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
