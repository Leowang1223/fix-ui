'use client'

import { useState, useEffect } from 'react'
import { apiGetScenarios, type Scenario } from '@/lib/api'

interface ScenarioSelectorProps {
  onSelect: (scenarioId: string) => void
  onClose: () => void
}

export default function ScenarioSelector({ onSelect, onClose }: ScenarioSelectorProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'A0-A1' | 'A2-B1' | 'B2+'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadScenarios()
  }, [])

  async function loadScenarios() {
    try {
      setLoading(true)
      const { scenarios: data } = await apiGetScenarios()
      setScenarios(data)
    } catch (error) {
      console.error('Failed to load scenarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredScenarios = scenarios.filter(s => {
    if (selectedDifficulty !== 'all' && s.difficulty !== selectedDifficulty) return false
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false
    return true
  })

  const categories = ['all', ...Array.from(new Set(scenarios.map(s => s.category)))]
  const difficulties: Array<'all' | 'A0-A1' | 'A2-B1' | 'B2+'> = ['all', 'A0-A1', 'A2-B1', 'B2+']

  const difficultyColors = {
    'A0-A1': 'bg-green-100 text-green-800 border-green-300',
    'A2-B1': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'B2+': 'bg-red-100 text-red-800 border-red-300'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Select Scenario</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center">Difficulty:</span>
              {difficulties.map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    selectedDifficulty === diff
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {diff === 'all' ? 'All' : diff}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center">Category:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded text-sm font-medium transition capitalize ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredScenarios.map(scenario => (
                <div
                  key={scenario.scenario_id}
                  onClick={() => onSelect(scenario.scenario_id)}
                  className="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer hover:border-blue-500"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold">{scenario.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${difficultyColors[scenario.difficulty]}`}>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                  <div className="text-xs text-gray-500 mb-2">
                    Objective: {scenario.objective}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">{scenario.checkpoints.length} checkpoints</span>
                    <span className="bg-gray-100 px-2 py-1 rounded capitalize">{scenario.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
