// Dashboard‑Style Optimized Button Component
import React from 'react'
import { LucideIcon } from 'lucide-react'

interface AppButtonProps {
  variant?: 'primary' | 'danger'
  children: React.ReactNode
  icon?: LucideIcon
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  className?: string
}

// Dashboard 風格：柔和白底 + 淡邊框 + 微陰影 + 圓角 2xl
export const AppButton = ({
  variant = 'primary',
  children,
  icon: Icon,
  onClick,
  disabled = false,
  className = ''
}: AppButtonProps) => {
  const base =
    'w-full max-w-md sm:max-w-lg flex items-center justify-center gap-1.5 sm:gap-2 px-5 py-3 sm:px-6 sm:py-3.5 md:py-4 rounded-2xl text-sm sm:text-base font-semibold shadow-sm border transition-all active:scale-[0.97] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed'

  const styles =
    variant === 'primary'
      ? 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:shadow-md'
      : 'bg-white border-red-300 text-red-600 hover:bg-red-50 hover:shadow-md'

  return (
    <button
      className={`${base} ${styles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={18} className="opacity-80" />}
      {children}
    </button>
  )
}
