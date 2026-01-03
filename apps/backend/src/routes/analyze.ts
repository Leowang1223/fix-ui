import type { Request, Response } from 'express';
import type { SessionInput, AnalysisOutput, PerQuestionResult } from '../analysis-core';
import { scoreOneRuleOnly, fuseWithLLM, aggregate, recommend } from '../analysis-core';
import { DummySemanticExtractor, GeminiSemanticExtractor } from '../service/semantic';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { saveReportToSessionLog } from '../utils/fileStore';

// 修改：條件性選擇提取器，如果有 API 金鑰則使用 Gemini，否則使用 Dummy
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const extractor = apiKey ? new GeminiSemanticExtractor() : new DummySemanticExtractor();

// 修改：簡化為只處理中文課程（移除非中文邏輯）
function resolveInterviewDir(interviewType: string): string {
  // 只處理中文課程：L1, L2, etc.
  if (interviewType.startsWith('L') && /^\d+$/.test(interviewType.substring(1))) {
    const chineseLessonsDir = path.resolve(__dirname, '../plugins', 'chinese-lessons');
    if (existsSync(chineseLessonsDir)) return chineseLessonsDir;
  }
  // 如果不是中文課程，拋出錯誤或返回預設路徑
  throw new Error(`Unsupported interview type: ${interviewType}`);
}

// 修改：簡化 getLessonsData，只處理中文課程
async function getLessonsData(interviewType: string) {
  try {
    if (interviewType.startsWith('L') && /^\d+$/.test(interviewType.substring(1))) {
      const lessonFile = path.resolve(__dirname, '../plugins', 'chinese-lessons', `${interviewType}.json`);
      if (existsSync(lessonFile)) {
        const lessonContent = await readFile(lessonFile, 'utf-8');
        const lessonData = JSON.parse(lessonContent);
        if (lessonData.steps) {
          return [{
            lesson_id: lessonData.lesson_id,
            steps: lessonData.steps.map((step: any, index: number) => ({
              expected_answer: step.expected_answer,
              step_id: step.id || index
            }))
          }];
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load lessons data:', error);
  }
  return null;
}

export async function analyzeHandler(req:Request,res:Response){
  const body = req.body as SessionInput;
  if(!body?.items?.length) return res.status(422).json({code:'INVALID_INPUT'});

  // 確保 interviewType 是中文課程格式
  if (!body.interviewType?.startsWith('L') || !/^\d+$/.test(body.interviewType.substring(1))) {
    return res.status(422).json({ code: 'INVALID_INTERVIEW_TYPE', message: 'Only Chinese lesson types (e.g., L1) are supported' });
  }

  // 嘗試獲取 lessons 數據以匹配 expected_answer
  const lessonsData = await getLessonsData(body.interviewType || 'self_intro');

  // 修改：簡化 enrichedItems，只使用 lessonId 和 stepId 匹配
  const enrichedItems = body.items.map(item => {
    if (lessonsData && item.lessonId && typeof item.stepId === 'number') {
      const lesson = lessonsData.find((l: any) => l.lesson_id === item.lessonId);
      if (lesson?.steps && lesson.steps[item.stepId]) {
        const step = lesson.steps[item.stepId];
        return { ...item, expectedAnswer: step.expected_answer };
      }
    }
    return item; // 如果不匹配，保持原樣
  });

  const per:PerQuestionResult[]=[];

  // 準備 LLM（若無金鑰則僅回傳空的建議/優化）
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const hasKey = apiKey.length>0;
  const genAI = hasKey ? new GoogleGenerativeAI(apiKey) : null;

  async function genAdviceAndOptimization(question: string, transcript: string): Promise<{ advice?: string; optimized?: string }>{
    if(!hasKey || !genAI){
      return { advice: undefined, optimized: undefined };
    }
    try{
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = [
        '請根據下面的「題目」與「逐字稿回答」產生：',
        '1) 約 250~350 字的客製化改進建議（保持同語言、直白具體、可操作，用**粗體**標示重點）',
        '2) 將該題的回答直接改寫成更好的版本，要求：',
        '   - 保持同語言與語氣，不要加標題',
        '   - 根據改進建議實際示範如何回答',
        '   - 展現更好的結構、具體性和表達方式',
        '   - 長度控制在原回答的1.2-1.5倍',
        '',
        '請只輸出 JSON，格式如下：',
        '{"advice":"...","optimized":"..."}',
        '',
        '題目：',
        question,
        '',
        '逐字稿回答：',
        transcript
      ].join('\n');
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' as any }
      });
      const raw = (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      let parsed: any = {};
      try{ parsed = JSON.parse(raw); }catch{ /* ignore parse error */ }
      const advice = typeof parsed?.advice === 'string' ? parsed.advice.trim() : undefined;
      const optimized = typeof parsed?.optimized === 'string' ? parsed.optimized.trim() : undefined;
      return { advice, optimized };
    }catch(e){
      // eslint-disable-next-line no-console
      console.warn('genAdviceAndOptimization failed:', e);
      return { advice: undefined, optimized: undefined };
    }
  }
  for(const it of enrichedItems){
    const base=scoreOneRuleOnly(it);
    try{
      console.log('開始分析');
      const signals=await extractor.extractSignals({question:it.question,transcript:it.answer});
      console.log('分析完成');
      const fused = fuseWithLLM(base,signals);
      // 取得該題建議與優化稿（若無金鑰則為 undefined）
      const extra = await genAdviceAndOptimization(it.question, it.answer || '');
      per.push({ ...fused, advice: extra.advice, optimizedAnswer: extra.optimized });
    }catch{
      per.push(base);
    }
  }
  const ov=aggregate(per,enrichedItems);
  // 依每題建議彙整列點摘要（若無建議則回退既有 recommend）
        // 為每題生成濃縮的改進重點
      const questionSummaries: string[] = [];
      for (let i = 0; i < per.length; i++) {
        const p = per[i];
        const questionNum = i + 1;
        if (p.advice && p.advice.trim()) {
          // 使用 LLM 將每題的改進建議濃縮成一句話
          try {
            const model = genAI?.getGenerativeModel({ model: 'gemini-2.0-flash' });
            if (model) {
                            const prompt = `請將以下改進建議濃縮成一句簡潔的重點（20-30字），保持原有的粗體標記（**），直接給出核心改進方向：

${p.advice}`;

;
              const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 50 }
              });
              const summary = (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              if (summary) {
                questionSummaries.push(`第${questionNum}題：${summary}`);
              }
            }
          } catch (e) {
            console.warn(`Failed to summarize question ${questionNum}:`, e);
          }
        }
      }

      // 如果沒有生成任何總結，使用原有的建議去重邏輯
      const bullets = questionSummaries.length > 0 ? questionSummaries : (() => {
        const bulletsSet = new Set<string>();
        for (const p of per) {
          const text = p.advice || '';
          if (!text) continue;
          const parts = text
            .split(/(?<=[。！？])\s*(?=[^。！？])|(?<=\d+[\.\)])\s*(?=[^\.\)])|(?<=[一二三四五六七八九十])\s*(?=[^一二三四五六七八九十])/)
            .map(s => s.trim())
            .filter(s => s.length >= 10)
            .slice(0, 2);
          for (const s of parts) {
            const cleaned = s.replace(/^[\-\d\.)\s]+/, '').trim();
            if (cleaned && cleaned.length >= 10) bulletsSet.add(cleaned);
          }
        }
        return Array.from(bulletsSet).slice(0, 8);
      })();
  const out:AnalysisOutput={ overview:ov, per_question:per, recommendations: bullets.length? bullets : recommend(per,ov), version:'core.v1.2.0+llm.v1'};
  res.json(out);
}

// 修改：移除 generateReportHandler，如果不適用於中文學習（或保留並調整）
