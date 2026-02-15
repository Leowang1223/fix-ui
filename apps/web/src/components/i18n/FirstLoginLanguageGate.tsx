'use client'

import { useState, useEffect } from 'react'
import { LanguageSelectPage } from './LanguageSelector'

export function FirstLoginLanguageGate({ children }: { children: React.ReactNode }) {
  const [needsSelection, setNeedsSelection] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const hasSelected = localStorage.getItem('languageSelected')
    if (!hasSelected) {
      setNeedsSelection(true)
    }
  }, [])

  if (!mounted) return <>{children}</>

  if (needsSelection) {
    return <LanguageSelectPage onSelect={() => setNeedsSelection(false)} />
  }

  return <>{children}</>
}
