export const locales = ['en', 'vi', 'th', 'id'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  id: 'Bahasa Indonesia',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  vi: '🇻🇳',
  th: '🇹🇭',
  id: '🇮🇩',
}
