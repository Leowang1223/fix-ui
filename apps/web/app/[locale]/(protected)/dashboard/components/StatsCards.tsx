'use client'

import { motion } from 'framer-motion'

interface StatRowProps {
  label: string
  value: number | string
  index: number
}

function StatRow({ label, value, index }: StatRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: 'easeOut'
      }}
      whileHover={{
        x: 4,
        transition: { duration: 0.2 }
      }}
      className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-50/50 to-blue-50/30 border border-slate-100/50 backdrop-blur-sm"
    >
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400 font-medium">
        {label}
      </p>
      <p className="text-5xl font-bold text-slate-900">
        {value}
      </p>
    </motion.div>
  )
}

interface StatsCardsProps {
  lessons?: number
  avgScore?: number
  hours?: number
}

export default function StatsCards({
  lessons = 0,
  avgScore = 0,
  hours = 0
}: StatsCardsProps) {
  const stats = [
    { label: 'lessons', value: lessons },
    { label: 'average score', value: avgScore },
    { label: 'study hours', value: hours }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-8 space-y-4"
    >
      {stats.map((stat, index) => (
        <StatRow
          key={stat.label}
          label={stat.label}
          value={stat.value}
          index={index}
        />
      ))}
    </motion.div>
  )
}
