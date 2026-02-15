'use client'

import { motion } from 'framer-motion'

interface LessonStation {
  id: number
  label: string
  completed: boolean
}

interface LessonRouteProps {
  stations: LessonStation[]
  completedIndex: number // 0-based index of last completed
  onStationClick?: (station: LessonStation) => void
}

export default function LessonRoute({ stations, completedIndex, onStationClick }: LessonRouteProps) {
  const count = stations.length
  const progressRatio =
    completedIndex <= 0 ? 0 : completedIndex >= count - 1 ? 1 : completedIndex / (count - 1)

  return (
    <section className="rounded-[28px] bg-white/70 p-6 shadow-inner backdrop-blur-sm border border-white/50">
      <header className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <div>
          <div className="font-semibold text-slate-700">lesson route</div>
          <p className="text-xs text-slate-400">Double-click a station to resume.</p>
        </div>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
          view history
        </button>
      </header>

      <div className="relative mt-6 overflow-x-auto pb-4">
        <div className="relative mx-2 sm:mx-4 h-20 sm:h-24 min-w-full sm:min-w-[560px]">
          {/* 灰色底線 */}
          <div className="absolute left-0 right-0 top-[30px] sm:top-[40px] h-[3px] sm:h-[4px] rounded-full bg-slate-200" />

          {/* 藍色進度線 */}
          <motion.div
            className="absolute left-0 top-[30px] sm:top-[40px] h-[3px] sm:h-[4px] rounded-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.7)]"
            style={{ width: `${progressRatio * 100}%` }}
            initial={false}
            animate={{ width: `${progressRatio * 100}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />

          {/* 站點 */}
          <div className="relative flex h-full items-end justify-between">
            {stations.map((station, idx) => {
              const isCompleted = station.completed
              const isCurrent = idx === completedIndex + 1

              return (
                <motion.button
                  key={station.id}
                  type="button"
                  className="flex flex-col items-center gap-1.5 sm:gap-2 text-xs text-slate-500 focus-visible:outline-none touch-manipulation"
                  whileHover={{ y: -4, scale: 1.04 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  onClick={() => onStationClick?.(station)}
                >
                  <div
                    className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-[2px] sm:border-[3px] bg-white shadow-md ${
                      isCompleted
                        ? 'border-blue-500 shadow-[0_10px_25px_rgba(37,99,235,0.45)]'
                        : 'border-slate-200'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-sm sm:text-base font-semibold ${
                        isCompleted
                          ? 'bg-gradient-to-b from-blue-400 to-blue-600 text-white'
                          : isCurrent
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {station.id}
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-500">{station.label}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
