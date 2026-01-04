'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import FancyButton from '@/components/ui/FancyButton'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.name },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (signUpError) throw signUpError

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: form.email,
            full_name: form.name,
            provider: 'email'
          })

        if (profileError) console.error('Profile creation error:', profileError)
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="glass-card w-full max-w-md p-10 space-y-8 shadow-2xl backdrop-blur-xl relative z-10 animate-fade-in">
        <div className="space-y-6 text-center">
          <p className="chip animate-slide-up mb-2">TALK LEARNING</p>
          <h1 className="hero-title text-4xl font-bold leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Create<br />Account
          </h1>
          <p className="text-gray-600 text-base leading-relaxed mt-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Start your Chinese learning journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div>
            <label htmlFor="register-name" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field transition-all focus:ring-4 focus:ring-blue-100"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field transition-all focus:ring-4 focus:ring-blue-100"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field transition-all focus:ring-4 focus:ring-blue-100"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-2">At least 6 characters</p>
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
                Creating account...
              </span>
            ) : (
              'Sign Up'
            )}
          </FancyButton>
        </form>

        <p className="text-center text-sm text-gray-600 pt-2">
          Already have an account?{' '}
          <Link href="/login" className="brand-link font-semibold hover:text-blue-700 transition">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
