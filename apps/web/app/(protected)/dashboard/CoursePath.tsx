"use client"
import { useEffect, useRef, useState } from 'react'

type Lesson = { index: number; title: string; done?: boolean; active?: boolean; percent?: number }

export default function CoursePath({ lessons = [], progress = 0, onStart, onSubmit }: {
  lessons: Lesson[]
  progress?: number
  onStart?: (lesson: Lesson) => void
  onSubmit?: (lesson: Lesson) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [animState, setAnimState] = useState<Record<number, { filling?: boolean; flashed?: boolean }>>({})
  const liveRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (selected != null && onStart) onStart(lessons[selected])
    if (liveRef.current && selected != null) {
      liveRef.current.textContent = `Selected ${lessons[selected].title}`
    }
  }, [selected])

  function handleComplete(idx: number) {
    const lesson = lessons[idx]
    setAnimState(s => ({ ...s, [idx]: { filling: true, flashed: false } }))
    const duration = 1300
    setTimeout(() => {
      setAnimState(s => ({ ...s, [idx]: { ...s[idx], filling: false, flashed: true } }))
      if (onSubmit) onSubmit(lesson)
      if (liveRef.current) liveRef.current.textContent = `${lesson.title} completed`
    }, duration + 150)
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[720px] relative">
        <div className="relative py-8">
          <div className="absolute inset-x-6 top-8 h-3 bg-slate-100 rounded-full" aria-hidden>
            <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${progress}%`, transition: 'width 900ms cubic-bezier(.22,.9,.32,1)' }} />
            <div className="absolute top-0 left-8 h-full w-6 opacity-70 transform rotate-45 animate-course-arrow">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <rect x="0" y="0" width="24" height="24" fill="white" opacity="0.12" />
              </svg>
            </div>
            <div className="absolute top-0 left-28 h-full w-6 opacity-60 transform rotate-45 animate-course-arrow delay-1500">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <rect x="0" y="0" width="24" height="24" fill="white" opacity="0.08" />
              </svg>
            </div>
          </div>

          <div className="relative flex items-center justify-between px-2">
              {lessons.map((ls, i) => (
                <Station
                  key={ls.index}
                  data-testid={`station-${ls.index}`}
                  index={ls.index}
                  title={ls.title}
                  done={!!ls.done}
                  active={!!ls.active}
                  percent={typeof ls.percent === 'number' ? ls.percent : 0}
                  flash={!!animState[ls.index]?.flashed}
                  // 選取仍設定 selected；雙擊直接觸發 onStart(lesson)
                  onSelect={() => setSelected(i)}
                  onComplete={() => handleComplete(i)}
                  onDoubleClick={() => { setSelected(i); onStart?.(lessons[i]); }}
                />
              ))}
          </div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite" ref={liveRef} />

      {/* Start button removed per request — entry via double-click on station number. */}

      <style jsx>{`
        .animate-course-arrow { animation: courseArrow 3s linear infinite; }
        .delay-1500 { animation-delay: 1.5s; }
        @keyframes courseArrow { 0% { transform: translateX(0) rotate(45deg); opacity: .8; } 50% { transform: translateX(160px) rotate(45deg); opacity: .2; } 100% { transform: translateX(0) rotate(45deg); opacity: .8; } }
      `}</style>
    </div>
  )
}

function Station({ index, title, done, active, percent, flash, onSelect, onComplete, onDoubleClick, ...rest }: {
  index: number
  title: string
  done?: boolean
  active?: boolean
  percent?: number
  flash?: boolean
  onSelect?: () => void
  onComplete?: () => void
        onDoubleClick?: () => void
  [k: string]: any
}) {
  const circleId = `station-clip-${index}`
  const pct = Math.max(0, Math.min(100, percent || 0))
  const ariaState = done ? 'completed' : active ? 'in progress' : 'locked'
  return (
    <div className="relative flex flex-col items-center w-28">
      <button
        role="button"
        aria-pressed={active || done}
        aria-label={`Lesson ${index} ${title} ${ariaState}. Double-click the number to start.`}
        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold focus:outline-none focus:ring-2 ${
          done ? 'bg-blue-600 text-white' : active ? 'bg-blue-50 text-slate-900 ring-1 ring-blue-200' : 'bg-white border border-slate-200 text-slate-600'
        }`}
        onClick={() => onSelect && onSelect()}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick && onDoubleClick(); }}
        {...rest}
      >
        <svg className="absolute inset-0 w-12 h-12" viewBox="0 0 48 48" aria-hidden>
          <defs>
            <clipPath id={circleId}>
              <circle cx="24" cy="24" r="20" />
            </clipPath>
          </defs>
          <circle cx="24" cy="24" r="20" fill="transparent" stroke="transparent" />
          <g clipPath={`url(#${circleId})`} transform="translate(0,0)">
            <rect x="0" y={48 - (pct / 100) * 48} width="48" height="48" fill="#bfdbfe" opacity="0.95" style={{ transition: 'height 1200ms cubic-bezier(.22,.9,.32,1), y 1200ms cubic-bezier(.22,.9,.32,1)' }} />
            <g className="wave-layer" style={{ transformOrigin: 'center', animation: 'waveShift 4s linear infinite' }}>
              <path d="M0 30 Q12 26 24 30 T48 30 V48 H0 Z" fill="#93c5fd" opacity="0.6" />
            </g>
            <g className="wave-layer" style={{ transformOrigin: 'center', animation: 'waveShift 6s linear infinite reverse' }}>
              <path d="M0 32 Q12 28 24 32 T48 32 V48 H0 Z" fill="#bfdbfe" opacity="0.5" />
            </g>
          </g>
        </svg>
        <span className="relative z-20 pointer-events-none">{index}</span>
      </button>

      <div className="sr-only" aria-hidden={false}>
        <button
          onClick={() => onSelect && onSelect()}
          aria-label={`Select lesson ${index}`}
          data-testid={`station-select-${index}`}
        >
          選取
        </button>
        <button
          onClick={() => onComplete && onComplete()}
          aria-label={`Complete lesson ${index}`}
          data-testid={`station-complete-${index}`}
        >
          完成
        </button>
      </div>

      <style jsx>{`
        @keyframes waveShift { 0% { transform: translateX(0); } 100% { transform: translateX(-24px); } }
        @keyframes flash { 0% { box-shadow: none } 50% { box-shadow: 0 0 14px rgba(255,255,255,0.6) } 100% { box-shadow: none } }
        @keyframes ripple { 0% { transform: scale(0.6); opacity: .6 } 100% { transform: scale(2.2); opacity: 0 } }
      `}</style>
      {flash && (
        <>
          <div aria-hidden className="absolute -inset-1 rounded-full flash" style={{ animation: 'flash 420ms ease-out' }} />
          <span aria-hidden className="absolute -inset-6 rounded-full" style={{ animation: 'ripple 900ms ease-out' }} />
        </>
      )}
    </div>
  )
}
