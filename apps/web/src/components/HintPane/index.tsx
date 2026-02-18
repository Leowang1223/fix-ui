'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMediaSession } from '@/lib/media/MediaSessionProvider'
import { useInterviewFlow } from '@/lib/useInterviewFlow'

const mockHints = [
  { id: 1, type: 'tip' as const, title: '使用 STAR 方法', content: '對於行為面試問題，使用情境、任務、行動和結果的結構來組織你的答案。', priority: 'high' as const },
  { id: 2, type: 'timing' as const, title: '保持答案簡潔', content: '每個答案控制在 1-2 分鐘內。練習計時你的回答。', priority: 'medium' as const },
  { id: 3, type: 'example' as const, title: '展示可量化的結果', content: '描述你的成就時，包含具體的數字和指標。', priority: 'high' as const },
  { id: 4, type: 'tip' as const, title: '提出後續問題', content: '通過提出關於職位和公司的深思熟慮的問題來表現你的興趣。', priority: 'low' as const },
]

export type HintPaneProps = { flow: ReturnType<typeof useInterviewFlow> }

export default function HintPane({ flow }: HintPaneProps) {
  const t = useTranslations('hintPane')
  const { stream, ensureStream, videoEnabled } = useMediaSession()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isHintOpen, setIsHintOpen] = useState(false)

  useEffect(() => {
    (async () => {
      const s = stream ?? (await ensureStream().catch(() => undefined))
      if (!s || !videoRef.current) return
      if (videoRef.current.srcObject !== s) {
        videoRef.current.srcObject = s
        videoRef.current.muted = true
        ;(videoRef.current as any).playsInline = true
        try { await videoRef.current.play() } catch {}
      }
    })()
  }, [stream, ensureStream])

  // 獲取當前題目的提示內容
  const getCurrentHints = () => {
    const idx = flow.currentIndex
    const item = idx >= 0 && idx < flow.questions.length ? flow.questions[idx] : null
    const hints = item?.answer_hint as string[] | undefined
    const adv = item?.advice as string[] | undefined
    return { hints, adv }
  }

  const { hints, adv } = getCurrentHints()
  const hasHints = (hints && hints.length > 0) || (adv && adv.length > 0)

  return (
    <div className="h-full flex flex-col relative">
      {/* 燈泡和提示卡片 - 作為一個獨立的浮動層 */}
      <div className="absolute top-4 left-4 z-20">
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => setIsHintOpen(!isHintOpen)}
            className={`p-2 rounded-full transition-all duration-200 ${
              isHintOpen 
                ? 'bg-yellow-100 text-yellow-600 shadow-lg' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
            }`}
            disabled={!hasHints}
            title={hasHints ? (isHintOpen ? t('hideHints') : t('showHints')) : t('noHints')}
            aria-label={hasHints ? (isHintOpen ? t('hideHints') : t('showHints')) : t('noHints')}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
            </svg>
          </button>
          <span className="mt-1 text-xs text-gray-500 font-semibold">{t('showHints')}</span>

          {isHintOpen && (
            <div
              className="absolute left-0 top-full mt-2 z-10 w-72 max-w-[75vw] bg-yellow-50 border border-yellow-200 shadow-lg rounded-md p-3 transition-all duration-200 ease-out origin-top-left"
              role="dialog"
              aria-label={t('hintCard')}
            >
              {hasHints ? (
                <div className="space-y-2">
                  {hints && hints.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('answerHints')}</h3>
                      <ul className="list-disc ml-5 space-y-1 text-gray-700">
                        {hints.map((h, i) => (<li key={i}>{h}</li>))}
                      </ul>
                    </div>
                  )}
                  {adv && adv.length > 0 && (
                     <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('advice')}</h3>
                      <ul className="list-disc ml-5 space-y-1 text-gray-700">
                        {adv.map((a, i) => (<li key={i}>{a}</li>))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">{t('noHints')}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 視訊預覽區塊 - 固定在下方，不再受燈泡影響 */}
      <div className="px-4 pb-6 mt-auto">
        <div className="relative w-full pb-[56.25%] rounded-md overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover bg-black"
            autoPlay
            muted
            playsInline
            style={{ opacity: videoEnabled ? 1 : 0 }}
          />
        </div>
      </div>
    </div>
  )
}
