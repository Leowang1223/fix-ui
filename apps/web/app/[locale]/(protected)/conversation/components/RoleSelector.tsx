'use client'

import { type Scenario } from '@/lib/api'

interface RoleSelectorProps {
  scenario: Scenario
  onSelect: (roleId: string) => void
  onBack: () => void
}

export default function RoleSelector({ scenario, onSelect, onBack }: RoleSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-2xl font-bold mb-1">Select Your Role</h2>
          <p className="text-sm text-gray-600">
            Scenario: {scenario.title}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenario.roles.map(role => (
              <div
                key={role.id}
                onClick={() => onSelect(role.id)}
                className="border-2 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition cursor-pointer bg-gradient-to-br from-white to-gray-50"
              >
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{role.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{role.chineseName}</p>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {role.systemPrompt.split('。')[0]}。
                </p>
              </div>
            ))}
          </div>

          {/* Objective Display */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-1">Task Objective</h4>
            <p className="text-sm text-blue-800">{scenario.objective}</p>
          </div>

          {/* Checkpoints Preview */}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Checkpoints</h4>
            <div className="space-y-1">
              {scenario.checkpoints.map((cp, idx) => (
                <div key={cp.id} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <span>{cp.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            ← Back
          </button>
          <div className="text-sm text-gray-500">
            Select a role to start conversation
          </div>
        </div>
      </div>
    </div>
  )
}
