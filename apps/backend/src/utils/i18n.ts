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

/**
 * Get short language name for Gemini prompt translation field
 */
export function getTranslationLanguageName(locale: SupportedLocale): string {
  const names: Record<SupportedLocale, string> = {
    en: 'English',
    vi: 'Vietnamese',
    th: 'Thai',
    id: 'Indonesian',
  }
  return names[locale]
}

/**
 * Score fallback feedback for when Gemini API fails
 */
export const SCORE_FALLBACK_FEEDBACK: Record<SupportedLocale, { excellent: string; good: string; needsPractice: string }> = {
  en: {
    excellent: 'Excellent pronunciation! Your tone and fluency are outstanding. Keep up the great work!',
    good: 'Good job! Your pronunciation is clear and understandable. Continue practicing to perfect your tones.',
    needsPractice: 'Keep practicing! Focus on pronunciation accuracy and tone. Try to speak more clearly and confidently.',
  },
  vi: {
    excellent: 'Phát âm tuyệt vời! Thanh điệu và sự lưu loát của bạn rất xuất sắc. Hãy tiếp tục phát huy!',
    good: 'Làm tốt lắm! Phát âm của bạn rõ ràng và dễ hiểu. Hãy tiếp tục luyện tập để hoàn thiện thanh điệu.',
    needsPractice: 'Hãy tiếp tục luyện tập! Tập trung vào độ chính xác phát âm và thanh điệu. Cố gắng nói rõ ràng và tự tin hơn.',
  },
  th: {
    excellent: 'การออกเสียงยอดเยี่ยม! โทนเสียงและความคล่องแคล่วของคุณโดดเด่นมาก ทำต่อไปนะ!',
    good: 'ทำได้ดี! การออกเสียงของคุณชัดเจนและเข้าใจได้ ฝึกต่อไปเพื่อให้โทนเสียงสมบูรณ์แบบ',
    needsPractice: 'ฝึกต่อไปนะ! ตั้งใจเรื่องความแม่นยำในการออกเสียงและโทนเสียง พยายามพูดให้ชัดเจนและมั่นใจมากขึ้น',
  },
  id: {
    excellent: 'Pengucapan luar biasa! Nada dan kelancaran Anda sangat bagus. Terus pertahankan!',
    good: 'Kerja bagus! Pengucapan Anda jelas dan mudah dipahami. Terus berlatih untuk menyempurnakan nada.',
    needsPractice: 'Terus berlatih! Fokus pada ketepatan pengucapan dan nada. Cobalah berbicara lebih jelas dan percaya diri.',
  },
}

/**
 * Recommendation translations for analysis reports
 */
export const RECOMMEND_TRANSLATIONS: Record<SupportedLocale, {
  tips: Record<string, string>
  dimensions: Record<string, string>
  systemWeak: string
}> = {
  en: {
    tips: {
      pronunciation: 'Pronunciation needs improvement: pay attention to initials, finals, and tone accuracy. Listen to standard pronunciation more.',
      fluency: 'Fluency is insufficient: reduce hesitation, maintain a natural and coherent pace.',
      accuracy: 'Accuracy needs improvement: pay attention to correct sentence patterns, word order, and vocabulary usage.',
      comprehension: 'Comprehension needs strengthening: make sure you fully understand the question before answering.',
      confidence: 'Confidence needs improvement: raise your volume and show more active engagement.',
    },
    dimensions: { pronunciation: 'Pronunciation', fluency: 'Fluency', accuracy: 'Accuracy', comprehension: 'Comprehension', confidence: 'Confidence' },
    systemWeak: 'Overall needs strengthening: (average',
  },
  vi: {
    tips: {
      pronunciation: 'Phát âm cần cải thiện: chú ý đến phụ âm đầu, vần và thanh điệu. Hãy nghe nhiều phát âm chuẩn hơn.',
      fluency: 'Độ lưu loát chưa đủ: giảm ngập ngừng, duy trì tốc độ tự nhiên và mạch lạc.',
      accuracy: 'Độ chính xác cần nâng cao: chú ý đúng cấu trúc câu, trật tự từ và cách dùng từ vựng.',
      comprehension: 'Khả năng hiểu cần tăng cường: đảm bảo hiểu hoàn toàn câu hỏi trước khi trả lời.',
      confidence: 'Sự tự tin cần cải thiện: tăng âm lượng và thể hiện sự tham gia tích cực hơn.',
    },
    dimensions: { pronunciation: 'Phát âm', fluency: 'Lưu loát', accuracy: 'Chính xác', comprehension: 'Hiểu', confidence: 'Tự tin' },
    systemWeak: 'Tổng thể cần tăng cường: (trung bình',
  },
  th: {
    tips: {
      pronunciation: 'การออกเสียงต้องปรับปรุง: ใส่ใจพยัญชนะต้น สระ และวรรณยุกต์ ฟังการออกเสียงมาตรฐานให้มากขึ้น',
      fluency: 'ความคล่องแคล่วไม่เพียงพอ: ลดการลังเล รักษาจังหวะที่เป็นธรรมชาติและต่อเนื่อง',
      accuracy: 'ความแม่นยำต้องปรับปรุง: ใส่ใจโครงสร้างประโยค ลำดับคำ และการใช้คำศัพท์ที่ถูกต้อง',
      comprehension: 'ความเข้าใจต้องเสริม: ให้แน่ใจว่าเข้าใจคำถามอย่างสมบูรณ์ก่อนตอบ',
      confidence: 'ความมั่นใจต้องปรับปรุง: เพิ่มระดับเสียงและแสดงความกระตือรือร้นมากขึ้น',
    },
    dimensions: { pronunciation: 'การออกเสียง', fluency: 'ความคล่อง', accuracy: 'ความแม่นยำ', comprehension: 'ความเข้าใจ', confidence: 'ความมั่นใจ' },
    systemWeak: 'ภาพรวมต้องเสริม: (เฉลี่ย',
  },
  id: {
    tips: {
      pronunciation: 'Pengucapan perlu diperbaiki: perhatikan konsonan awal, vokal, dan ketepatan nada. Dengarkan lebih banyak pengucapan standar.',
      fluency: 'Kelancaran kurang: kurangi keraguan, pertahankan kecepatan yang alami dan koheren.',
      accuracy: 'Ketepatan perlu ditingkatkan: perhatikan pola kalimat, urutan kata, dan penggunaan kosakata yang benar.',
      comprehension: 'Pemahaman perlu diperkuat: pastikan Anda memahami pertanyaan sepenuhnya sebelum menjawab.',
      confidence: 'Kepercayaan diri perlu ditingkatkan: tingkatkan volume suara dan tunjukkan keterlibatan yang lebih aktif.',
    },
    dimensions: { pronunciation: 'Pengucapan', fluency: 'Kelancaran', accuracy: 'Ketepatan', comprehension: 'Pemahaman', confidence: 'Kepercayaan diri' },
    systemWeak: 'Keseluruhan perlu diperkuat: (rata-rata',
  },
}

/**
 * Conversation fallback strings
 */
export const CONVERSATION_FALLBACKS: Record<SupportedLocale, {
  greeting: { chinese: string; translation: string }
  okay: { chinese: string; translation: string }
  sorry: { chinese: string; translation: string }
  noLessons: string
  suggestionFallbacks: Array<{ chinese: string; pinyin: string; translation: string; type: string }>
}> = {
  en: {
    greeting: { chinese: '你好！', translation: 'Hello!' },
    okay: { chinese: '好的。', translation: 'Okay.' },
    sorry: { chinese: '抱歉，我沒聽清楚。', translation: "Sorry, I didn't hear clearly." },
    noLessons: 'No lessons to review',
    suggestionFallbacks: [
      { chinese: '你好', pinyin: 'nǐ hǎo', translation: 'Hello', type: 'safe' },
      { chinese: '謝謝', pinyin: 'xiè xiè', translation: 'Thank you', type: 'safe' },
      { chinese: '請再說一次', pinyin: 'qǐng zài shuō yī cì', translation: 'Please say it again', type: 'safe' },
    ],
  },
  vi: {
    greeting: { chinese: '你好！', translation: 'Xin chào!' },
    okay: { chinese: '好的。', translation: 'Được rồi.' },
    sorry: { chinese: '抱歉，我沒聽清楚。', translation: 'Xin lỗi, tôi không nghe rõ.' },
    noLessons: 'Không có bài học để ôn tập',
    suggestionFallbacks: [
      { chinese: '你好', pinyin: 'nǐ hǎo', translation: 'Xin chào', type: 'safe' },
      { chinese: '謝謝', pinyin: 'xiè xiè', translation: 'Cảm ơn', type: 'safe' },
      { chinese: '請再說一次', pinyin: 'qǐng zài shuō yī cì', translation: 'Xin nói lại lần nữa', type: 'safe' },
    ],
  },
  th: {
    greeting: { chinese: '你好！', translation: 'สวัสดี!' },
    okay: { chinese: '好的。', translation: 'ได้เลย' },
    sorry: { chinese: '抱歉，我沒聽清楚。', translation: 'ขอโทษ ฟังไม่ชัด' },
    noLessons: 'ไม่มีบทเรียนให้ทบทวน',
    suggestionFallbacks: [
      { chinese: '你好', pinyin: 'nǐ hǎo', translation: 'สวัสดี', type: 'safe' },
      { chinese: '謝謝', pinyin: 'xiè xiè', translation: 'ขอบคุณ', type: 'safe' },
      { chinese: '請再說一次', pinyin: 'qǐng zài shuō yī cì', translation: 'กรุณาพูดอีกครั้ง', type: 'safe' },
    ],
  },
  id: {
    greeting: { chinese: '你好！', translation: 'Halo!' },
    okay: { chinese: '好的。', translation: 'Baiklah.' },
    sorry: { chinese: '抱歉，我沒聽清楚。', translation: 'Maaf, saya tidak mendengar dengan jelas.' },
    noLessons: 'Tidak ada pelajaran untuk ditinjau',
    suggestionFallbacks: [
      { chinese: '你好', pinyin: 'nǐ hǎo', translation: 'Halo', type: 'safe' },
      { chinese: '謝謝', pinyin: 'xiè xiè', translation: 'Terima kasih', type: 'safe' },
      { chinese: '請再說一次', pinyin: 'qǐng zài shuō yī cì', translation: 'Tolong ulangi', type: 'safe' },
    ],
  },
}
