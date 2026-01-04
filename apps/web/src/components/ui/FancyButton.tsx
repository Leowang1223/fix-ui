'use client'

import React from 'react'

interface FancyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost' | 'soft'
  children: React.ReactNode
}

export default function FancyButton({
  variant = 'solid',
  className = '',
  children,
  ...props
}: FancyButtonProps) {
  const baseStyles = 'px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl text-sm sm:text-base font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    solid: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md',
    soft: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100',
    outline: 'border-2 border-blue-500 text-blue-600 hover:bg-blue-50',
    ghost: 'text-blue-600 hover:bg-blue-50'
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
