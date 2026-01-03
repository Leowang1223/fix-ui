import type { PerQuestionResult, QAItem, Overview } from './types';

export function aggregate(per: PerQuestionResult[], items: QAItem[]): Overview {
  const avg = (arr:number[]) => arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  return {
    total_score: Math.round(avg(per.map(x=>x.scores.total))),
    radar: {
      pronunciation: Math.round(avg(per.map(x=>x.scores.pronunciation))),
      fluency: Math.round(avg(per.map(x=>x.scores.fluency))),
      accuracy: Math.round(avg(per.map(x=>x.scores.accuracy))),
      comprehension: Math.round(avg(per.map(x=>x.scores.comprehension))),
      confidence: Math.round(avg(per.map(x=>x.scores.confidence))),
    },
    totals: {
      numQuestions: items.length,
      totalSeconds: items.reduce((s,i)=>s+i.thinkingTime+i.answeringTime,0),
      avgThink: Math.round(avg(items.map(i=>i.thinkingTime))),
      avgAnswer: Math.round(avg(items.map(i=>i.answeringTime)))
    }
  };
}


