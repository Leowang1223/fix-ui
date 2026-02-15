/**
 * Backend i18n utilities for language-aware API responses and AI prompts
 */

export const SUPPORTED_LOCALES = ['en', 'vi', 'th', 'id'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  vi: 'Vietnamese (Tiếng Việt)',
  th: 'Thai (ภาษาไทย)',
  id: 'Indonesian (Bahasa Indonesia)',
}

/**
 * Extract locale from request (header, query, or body)
 */
export function getLocaleFromRequest(req: {
  query?: Record<string, any>
  body?: Record<string, any>
  headers?: Record<string, any>
}): SupportedLocale {
  // 1. Check query parameter
  const queryLang = req.query?.lang
  if (queryLang && SUPPORTED_LOCALES.includes(queryLang as SupportedLocale)) {
    return queryLang as SupportedLocale
  }

  // 2. Check body parameter
  const bodyLang = req.body?.lang
  if (bodyLang && SUPPORTED_LOCALES.includes(bodyLang as SupportedLocale)) {
    return bodyLang as SupportedLocale
  }

  // 3. Check Accept-Language header
  const acceptLang = req.headers?.['accept-language'] || ''
  for (const locale of SUPPORTED_LOCALES) {
    if (acceptLang.includes(locale)) {
      return locale
    }
  }

  return 'en'
}

/**
 * Get the feedback language instruction for Gemini prompts
 */
export function getFeedbackLanguagePrompt(locale: SupportedLocale): string {
  const langName = LOCALE_NAMES[locale]
  return `IMPORTANT: Please provide ALL feedback, suggestions, and explanations in ${langName}. The learner speaks ${langName} as their native language.`
}
