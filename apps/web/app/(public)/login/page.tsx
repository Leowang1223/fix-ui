'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, AlertCircle, Loader2, Info, TrendingUp, RefreshCw } from 'lucide-react'
import FancyButton from '@/components/ui/FancyButton'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      const next = search.get('next')
      router.push(next && next.startsWith('/') ? next : '/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="glass-card w-full max-w-5xl p-8 sm:p-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] shadow-2xl backdrop-blur-xl relative z-10 animate-fade-in">
        {/* 左侧：信息区 */}
        <section className="space-y-6 text-left">
          <div className="space-y-4">
            <p className="chip animate-slide-up">Talk Learning</p>
            <h1 className="hero-title text-left animate-slide-up" style={{ animationDelay: '0.1s' }}>
              log in
            </h1>
            <p className="hero-subtitle text-left text-base sm:text-lg leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Reconnect with your Mandarin tutor and keep your streak alive.
            </p>
          </div>

          <div className="grid gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="glass-outline p-5 rounded-2xl transform transition hover:scale-105 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Keep your streak</p>
                  <p className="text-sm text-slate-500 mt-1">Dashboard cards update as soon as you complete a lesson.</p>
                </div>
              </div>
            </div>
            <div className="glass-outline p-5 rounded-2xl transform transition hover:scale-105 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Sync everywhere</p>
                  <p className="text-sm text-slate-500 mt-1">History, flashcards, and retry points follow you across devices.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 右侧：表单区 */}
        <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="input-field mt-2 transition-all focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="input-field mt-2 transition-all focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            {error && (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3 animate-slide-up" role="alert">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <FancyButton
              type="submit"
              variant="solid"
              className="w-full justify-center transform transition hover:scale-105"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  logging in…
                </span>
              ) : (
                'log in'
              )}
            </FancyButton>
          </form>

          {/* Google OAuth button */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Need an account?
            <Link href="/register" className="brand-link ml-2 font-semibold hover:text-blue-700 transition">
              sign up
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
