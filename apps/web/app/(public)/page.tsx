import Link from 'next/link'
import { Target, Mic, BarChart3, ArrowRight } from 'lucide-react'
import FancyButton from '@/components/ui/FancyButton'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* 背景装饰圆圈 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />

      <div className="text-center space-y-12 max-w-2xl mx-auto relative z-10">
        <div className="glass-card px-12 sm:px-16 py-16 sm:py-20 space-y-8 shadow-2xl animate-fade-in backdrop-blur-xl">
          <div className="space-y-6">
            <p className="chip mx-auto animate-slide-up">Talk Learning</p>
            <h1 className="hero-title animate-slide-up" style={{ animationDelay: '0.1s' }}>
              talk learning
            </h1>
            <p className="hero-subtitle text-lg sm:text-xl mt-6 max-w-lg mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Master Chinese through interactive conversations with AI-powered voice analysis
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link href="/login" className="transform transition hover:scale-105">
              <FancyButton variant="solid" className="min-w-[140px]">
                log in
              </FancyButton>
            </Link>
            <Link href="/register" className="transform transition hover:scale-105">
              <FancyButton variant="outline" className="min-w-[140px]">
                sign up
              </FancyButton>
            </Link>
          </div>

          {/* 特色标签 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="glass-outline px-4 py-3 rounded-xl flex items-center justify-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-semibold text-blue-600">AI Feedback</p>
            </div>
            <div className="glass-outline px-4 py-3 rounded-xl flex items-center justify-center gap-2">
              <Mic className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-semibold text-purple-600">Voice Practice</p>
            </div>
            <div className="glass-outline px-4 py-3 rounded-xl flex items-center justify-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <p className="text-xs font-semibold text-indigo-600">Progress Track</p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-blue-600 transition inline-flex items-center gap-2 group"
        >
          <span>start learning now</span>
          <ArrowRight className="w-4 h-4 transform transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </main>
  )
}
