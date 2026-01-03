import type { PerQuestionResult, Overview } from './types';

export function recommend(per: PerQuestionResult[], ov: Overview): string[] {
  const worst = [...per].sort((a,b)=>a.scores.total-b.scores.total).slice(0,2);
  const tips = worst.map(w=>{
    const entries = Object.entries(w.scores).filter(([k])=>k!=='total') as [string, number][];
    const weakest = entries.sort((a,b)=>a[1]-b[1])[0][0];
    if (weakest==='pronunciation') return `${w.questionId} 发音需改善：注意声母、韵母和声调的准确性，多听标准发音。`;
    if (weakest==='fluency') return `${w.questionId} 流畅度不足：减少犹豫，保持自然连贯的语速。`;
    if (weakest==='accuracy') return `${w.questionId} 准确度待提高：注意正确的句型、语序和词汇使用。`;
    if (weakest==='comprehension') return `${w.questionId} 理解力需加强：确保完全理解问题后再回答。`;
    return `${w.questionId} 自信表达不足：提高音量，展现更积极的参与意愿。`;
  });
  const sysWeak = Object.entries(ov.radar).sort((a:any,b:any)=>a[1]-b[1])[0][0] as keyof typeof ov.radar;
  tips.push(`整體待強化：（平均 ${ov.radar[sysWeak]} 分）`);
  return tips.slice(0,3);
}

function getDimensionName(dimension: string): string {
  const names: Record<string, string> = {
    pronunciation: '发音',
    fluency: '流畅度',
    accuracy: '准确度',
    comprehension: '理解力',
    confidence: '自信表达'
  };
  return names[dimension] || dimension;
}
