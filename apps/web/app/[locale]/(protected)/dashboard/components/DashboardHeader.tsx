'use client'

import { motion } from 'framer-motion'

interface DashboardHeaderProps {
  title?: string
  subtitle?: string
}

export default function DashboardHeader({
  title = "talk learning",
  subtitle = "Minimal glass UI with blue accents to keep your lessons, history, and flashcards aligned."
}: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass-card p-16 md:p-20 text-center"
    >
      <motion.p
        className="chip mx-auto mb-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        Talk Learning
      </motion.p>

      <motion.h1
        className="text-7xl md:text-8xl lg:text-9xl font-bold mb-8"
        style={{
          color: '#0f172a',
          textShadow: '0 15px 45px rgba(37, 99, 235, 0.4), 0 8px 20px rgba(37, 99, 235, 0.25)',
          letterSpacing: '-0.04em'
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h1>

      <motion.p
        className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {subtitle}
      </motion.p>
    </motion.div>
  )
}
