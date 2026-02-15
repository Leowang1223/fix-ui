'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import Topbar from './Topbar'
import { getCookie, clearAuthCookies } from '@/lib/cookies'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userEmail, setUserEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // 檢查登入狀態（Cookies）
    if (typeof window !== 'undefined') {
      const isLoggedIn = getCookie('isLoggedIn')
      const email = getCookie('userEmail')
      if (isLoggedIn !== 'true') {
        router.replace('/login')
        return
      }
      setUserEmail(email || '')
      setIsLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    clearAuthCookies()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Topbar userEmail={userEmail} onLogout={handleLogout} />
      <main className="container mx-auto px-6 py-12 max-w-7xl">
        {children}
      </main>
    </div>
  )
}
