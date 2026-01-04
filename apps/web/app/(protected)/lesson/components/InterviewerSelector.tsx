'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Interviewer {
  id: string
  name: string
  imagePath: string
  voice: {
    lang: string
    gender: 'male' | 'female'
    pitch: number
    rate: number
    preferredVoiceName?: string
  }
}

// 所有可用的講師（含語音配置）
const INTERVIEWERS: Interviewer[] = [
  {
    id: 'bob',
    name: 'Bob',
    imagePath: '/interviewers/Bob.png',
    voice: {
      lang: 'zh-TW',
      gender: 'male',
      pitch: 0.75,
      rate: 0.95,
      preferredVoiceName: 'Microsoft Yun-Jhe Online (Natural) - Chinese (Taiwan)',
    },
  },
  {
    id: 'cendy',
    name: 'Cendy',
    imagePath: '/interviewers/Cendy.png',
    voice: {
      lang: 'zh-TW',
      gender: 'female',
      pitch: 1.35,
      rate: 1.05,
      preferredVoiceName: 'Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)',
    },
  },
  {
    id: 'elmily',
    name: 'Emily',
    imagePath: '/interviewers/elmily.png',
    voice: {
      lang: 'zh-TW',
      gender: 'female',
      pitch: 1.25,
      rate: 1.1,
      preferredVoiceName: 'Microsoft HsiaoYu Online (Natural) - Chinese (Taiwan)',
    },
  },
  {
    id: 'john',
    name: 'John',
    imagePath: '/interviewers/John.png',
    voice: {
      lang: 'zh-TW',
      gender: 'male',
      pitch: 0.7,
      rate: 0.9,
      preferredVoiceName: 'Microsoft Yun-Chuan Online (Natural) - Chinese (Taiwan)',
    },
  },
  {
    id: 'mande',
    name: 'Amanda',
    imagePath: '/interviewers/Mande.png',
    voice: {
      lang: 'zh-CN',
      gender: 'female',
      pitch: 1.3,
      rate: 1.05,
      preferredVoiceName: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)',
    },
  },
  {
    id: 'nina',
    name: 'Nina',
    imagePath: '/interviewers/Nina.png',
    voice: {
      lang: 'zh-CN',
      gender: 'female',
      pitch: 1.2,
      rate: 1.15,
      preferredVoiceName: 'Microsoft Xiaoyi Online (Natural) - Chinese (Mainland)',
    },
  },
  {
    id: 'man',
    name: 'Professional Man',
    imagePath: '/interviewers/man.png',
    voice: {
      lang: 'zh-TW',
      gender: 'male',
      pitch: 0.8,
      rate: 0.95,
      preferredVoiceName: 'Microsoft Yun-Jhe Online (Natural) - Chinese (Taiwan)',
    },
  },
  {
    id: 'jan',
    name: 'Jan',
    imagePath: '/interviewers/jan.png',
    voice: {
      lang: 'zh-TW',
      gender: 'female',
      pitch: 1.15,
      rate: 1.0,
      preferredVoiceName: 'Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)',
    },
  },
]

interface InterviewerSelectorProps {
  currentInterviewer: string
  onSelect: (interviewerId: string) => void
  onClose: () => void
}

export function InterviewerSelector({
  currentInterviewer,
  onSelect,
  onClose,
}: InterviewerSelectorProps) {
  const [selectedId, setSelectedId] = useState(currentInterviewer)

  const handleSelect = (id: string) => {
    setSelectedId(id)
    onSelect(id)
    // 延遲關閉，讓用戶看到選擇效果
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 sm:mx-0 rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-6 lg:p-8 shadow-2xl">
        {/* 標題 */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            Choose Your Interviewer
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 講師網格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {INTERVIEWERS.map((interviewer) => {
            const isSelected = selectedId === interviewer.id

            return (
              <button
                key={interviewer.id}
                onClick={() => handleSelect(interviewer.id)}
                className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* 圖片容器 */}
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 overflow-hidden rounded-xl mx-auto">
                  <Image
                    src={interviewer.imagePath}
                    alt={interviewer.name}
                    fill
                    className="object-cover"
                  />
                  {/* 選中標記 */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                      <div className="rounded-full bg-blue-500 p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* 名字 */}
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    isSelected ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {interviewer.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* 提示文字 */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Click on an interviewer to select them
        </p>
      </div>
    </div>
  )
}

// 工具函數：獲取講師圖片路徑
export function getInterviewerImagePath(interviewerId: string): string {
  const interviewer = INTERVIEWERS.find((i) => i.id === interviewerId)
  return interviewer?.imagePath || INTERVIEWERS[0].imagePath
}

// 工具函數：獲取講師名字
export function getInterviewerName(interviewerId: string): string {
  const interviewer = INTERVIEWERS.find((i) => i.id === interviewerId)
  return interviewer?.name || INTERVIEWERS[0].name
}

// 工具函數：獲取講師語音配置
export function getInterviewerVoice(interviewerId: string) {
  const interviewer = INTERVIEWERS.find((i) => i.id === interviewerId)
  return interviewer?.voice || INTERVIEWERS[0].voice
}

// 默認講師
export const DEFAULT_INTERVIEWER = 'jan'

// 導出講師列表（供調試用）
export { INTERVIEWERS }
