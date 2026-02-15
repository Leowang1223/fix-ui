'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('languageSelector')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    router.replace(pathname, { locale: newLocale })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 hover:bg-white border border-slate-200 hover:border-slate-300 transition-all text-sm font-medium text-slate-700"
        aria-label={t('changeLanguage')}
      >
        <Globe size={16} className="text-slate-500" />
        <span>{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => handleChange(l)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                l === locale
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-lg">{localeFlags[l]}</span>
              <span>{localeNames[l]}</span>
              {l === locale && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LanguageSelectPage({ onSelect }: { onSelect?: () => void }) {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('languageSelector')
  const [selected, setSelected] = useState<Locale>(locale)

  const handleConfirm = () => {
    document.cookie = `NEXT_LOCALE=${selected};path=/;max-age=31536000`
    localStorage.setItem('languageSelected', 'true')
    router.replace(pathname, { locale: selected })
    onSelect?.()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center">
            <Globe size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-500 text-sm">{t('subtitle')}</p>
        </div>

        <div className="space-y-3">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => setSelected(l)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                l === selected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-3xl">{localeFlags[l]}</span>
              <span className={`text-lg font-medium ${
                l === selected ? 'text-blue-700' : 'text-slate-700'
              }`}>
                {localeNames[l]}
              </span>
              {l === selected && (
                <span className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg text-lg"
        >
          {t('confirm')}
        </button>
      </div>
    </div>
  )
}
