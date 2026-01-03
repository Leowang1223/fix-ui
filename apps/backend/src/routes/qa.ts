import type { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

// 解析 interview 目錄的輔助函數
function resolveInterviewDir(interviewType: string): string {
  // 檢查是否為中文課程
  if (interviewType.startsWith('L') && /^\d+$/.test(interviewType.substring(1))) {
    // 中文課程：L1, L2, etc.
    const chineseLessonsDir = path.resolve(__dirname, '../plugins', 'chinese-lessons');
    if (existsSync(chineseLessonsDir)) return chineseLessonsDir;
  }

  // 原有面試類型
  const inSrc = path.resolve(__dirname, '../plugins', 'interview-types', interviewType);
  if (existsSync(inSrc)) return inSrc;
  const inDistPeer = path.resolve(__dirname, '../plugins', 'interview-types', interviewType);
  if (existsSync(inDistPeer)) return inDistPeer;
  const inSrcAlt = path.resolve(__dirname, '../../src', 'plugins', 'interview-types', interviewType);
  return inSrcAlt;
}

// 獲取課程數據
async function getCourseData(interviewType: string) {
  try {
    // 檢查是否為中文課程
    if (interviewType.startsWith('L') && /^\d+$/.test(interviewType.substring(1))) {
      // 中文課程：載入對應的 JSON 檔案
      const lessonFile = path.resolve(__dirname, '../plugins', 'chinese-lessons', `${interviewType}.json`);
      if (existsSync(lessonFile)) {
        const lessonContent = await readFile(lessonFile, 'utf-8');
        const lessonData = JSON.parse(lessonContent);
        return lessonData;
      }
    } else {
      // 原有面試類型邏輯
      const dir = resolveInterviewDir(interviewType);
      const rulePath = path.join(dir, 'rule');
      if (existsSync(rulePath)) {
        const ruleContent = await readFile(rulePath, 'utf-8');
        const ruleData = JSON.parse(ruleContent);
        return ruleData;
      }
    }
  } catch (error) {
    console.warn('Failed to load course data:', error);
  }
  return null;
}

export async function qaHandler(req: Request, res: Response) {
  const { interviewType, question } = req.body as { interviewType?: string; question?: string };

  if (!question || !interviewType) {
    return res.status(422).json({ code: 'INVALID_INPUT', message: 'Missing question or interviewType' });
  }

  try {
    // 獲取課程數據
    const courseData = await getCourseData(interviewType);

    if (!courseData) {
      return res.status(404).json({ code: 'COURSE_NOT_FOUND', message: 'Course data not found' });
    }

    // 準備上下文
    let context = '';
    if (courseData.steps) {
      // 中文課程格式
          context = courseData.steps.map((step: any, index: number) => 
      `Step ${index + 1}: ${step.expected_answer}`
    ).join('\n');
    } else if (courseData.lessons) {
      // 原有面試格式
      context = courseData.lessons.map((lesson: any) => 
        lesson.steps?.map((step: any) => step.expected_answer).join('\n')
      ).join('\n');
    }

    // 使用 Gemini 生成回答
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
      return res.status(500).json({ code: 'API_KEY_MISSING', message: 'Gemini API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = [
      '你是一個專業的中文學習助手。請根據以下課程內容回答學生的問題。',
      '',
      '課程內容：',
      context,
      '',
      '學生的問題：',
      question,
      '',
      '請提供：',
      '1. 直接、清晰的回答',
      '2. 如果相關，提供具體的例子',
      '3. 鼓勵學生的學習進度',
      '',
      '回答請使用繁體中文，保持友善和專業的語氣。'
    ].join('\n');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
    });

    const answer = (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '抱歉，我無法生成回答。';

    res.json({
      answer,
      courseType: interviewType.startsWith('L') ? 'chinese-lesson' : 'interview',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('QA handler error:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to process question' });
  }
}
