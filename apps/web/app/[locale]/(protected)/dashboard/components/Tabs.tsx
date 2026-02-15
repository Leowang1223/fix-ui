'use client'

import { motion } from 'framer-motion'

interface Tab {
  id: string
  label: string
  onClick: () => void
}

interface TabsProps {
  tabs: Tab[]
  activeTab?: string
}

export default function Tabs({ tabs, activeTab }: TabsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex gap-4 justify-center"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <motion.button
            key={tab.id}
            onClick={tab.onClick}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`
              px-8 py-4 rounded-full font-semibold text-base transition-all duration-300
              ${isActive
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/40'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-2 border-blue-100 hover:border-blue-200'
              }
            `}
          >
            {tab.label}
          </motion.button>
        )
      })}
    </motion.div>
  )
}
