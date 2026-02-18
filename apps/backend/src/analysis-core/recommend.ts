import type { PerQuestionResult, Overview } from './types';
import { type SupportedLocale, RECOMMEND_TRANSLATIONS } from '../utils/i18n';

export function recommend(per: PerQuestionResult[], ov: Overview, locale: SupportedLocale = 'en'): string[] {
  const t = RECOMMEND_TRANSLATIONS[locale];
  const worst = [...per].sort((a,b)=>a.scores.total-b.scores.total).slice(0,2);
  const tips = worst.map(w=>{
    const entries = Object.entries(w.scores).filter(([k])=>k!=='total') as [string, number][];
    const weakest = entries.sort((a,b)=>a[1]-b[1])[0][0];
    return `${w.questionId} ${t.tips[weakest] || t.tips.confidence}`;
  });
  const sysWeak = Object.entries(ov.radar).sort((a:any,b:any)=>a[1]-b[1])[0][0] as keyof typeof ov.radar;
  tips.push(`${t.systemWeak} ${ov.radar[sysWeak]})`);
  return tips.slice(0,3);
}

export function getDimensionName(dimension: string, locale: SupportedLocale = 'en'): string {
  const t = RECOMMEND_TRANSLATIONS[locale];
  return t.dimensions[dimension] || dimension;
}
