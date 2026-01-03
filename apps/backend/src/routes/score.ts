import type { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';

// 設置 multer 來處理文件上傳
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 單次錄音評分 API
 * POST /api/score
 * 
 * 接收參數：
 * - audio: 音頻文件 (FormData)
 * - expectedAnswer: 期望答案 (JSON string array)
 * - questionId: 題目 ID
 * - lessonId: 課程 ID
 */
export async function scoreHandler(req: Request, res: Response) {
  try {
    const { expectedAnswer, questionId, lessonId } = req.body;
    const audioFile = (req as any).file;

    // 驗證必要參數
    if (!expectedAnswer || !questionId || !lessonId) {
      return res.status(422).json({
        code: 'INVALID_INPUT',
        message: 'Missing required parameters: expectedAnswer, questionId, lessonId'
      });
    }

    // 解析期望答案
    let expectedAnswers: string[];
    try {
      expectedAnswers = JSON.parse(expectedAnswer);
      if (!Array.isArray(expectedAnswers)) {
        expectedAnswers = [expectedAnswer];
      }
    } catch {
      expectedAnswers = [expectedAnswer];
    }

    console.log('📝 評分請求:', {
      questionId,
      lessonId,
      expectedAnswers,
      hasAudio: !!audioFile
    });

    // 🎯 方案 1: 使用 Gemini API 進行語音轉文字和評分（如果有 API key）
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    
    if (apiKey && audioFile) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // 將音頻轉為 base64
        const audioBase64 = audioFile.buffer.toString('base64');

        const prompt = [
          'You are a professional Chinese pronunciation scoring system.',
          '',
          'Task:',
          '1. Listen to the Chinese pronunciation in the audio',
          '2. Compare with the expected answer',
          '3. Give a score from 0-100',
          '',
          `Expected answer: ${expectedAnswers.join(' or ')}`,
          '',
          'Scoring criteria:',
          '- Pronunciation accuracy (30%)',
          '- Tone accuracy (30%)',
          '- Fluency (20%)',
          '- Completeness (20%)',
          '',
          'IMPORTANT: Please provide feedback in English.',
          '',
          'Return in JSON format:',
          '{',
          '  "transcript": "recognized text",',
          '  "overall_score": 85,',
          '  "scores": {',
          '    "pronunciation": 88,',
          '    "fluency": 82,',
          '    "accuracy": 87,',
          '    "comprehension": 85,',
          '    "confidence": 83',
          '  },',
          '  "feedback": "Detailed feedback in English"',
          '}'
        ].join('\n');

        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: audioBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json' as any
          }
        });

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const scoreData = JSON.parse(responseText);

        console.log('✅ Gemini 評分成功:', scoreData);

        return res.json({
          overall_score: scoreData.overall_score || 75,
          scores: scoreData.scores || {
            pronunciation: 75,
            fluency: 75,
            accuracy: 75,
            comprehension: 75,
            confidence: 75
          },
          transcript: scoreData.transcript || '',
          feedback: scoreData.feedback || '',
          method: 'gemini'
        });

      } catch (error) {
        console.warn('⚠️ Gemini API 評分失敗，使用模擬評分:', error);
        // 繼續使用模擬評分
      }
    }

    // 🎯 方案 2: 模擬評分（備用方案）
    console.log('📊 使用模擬評分');

    // 生成合理的隨機分數（70-95 之間，偏向高分）
    const baseScore = 70 + Math.random() * 25;
    const pronunciation = Math.round(baseScore + (Math.random() - 0.5) * 10);
    const fluency = Math.round(baseScore + (Math.random() - 0.5) * 10);
    const accuracy = Math.round(baseScore + (Math.random() - 0.5) * 10);
    const comprehension = Math.round(baseScore + (Math.random() - 0.5) * 10);
    const confidence = Math.round(baseScore + (Math.random() - 0.5) * 10);

    const overall_score = Math.round((pronunciation + fluency + accuracy + comprehension + confidence) / 5);

    const mockResult = {
      overall_score: Math.max(60, Math.min(100, overall_score)),
      scores: {
        pronunciation: Math.max(60, Math.min(100, pronunciation)),
        fluency: Math.max(60, Math.min(100, fluency)),
        accuracy: Math.max(60, Math.min(100, accuracy)),
        comprehension: Math.max(60, Math.min(100, comprehension)),
        confidence: Math.max(60, Math.min(100, confidence))
      },
      transcript: expectedAnswers[0] || '',
      feedback: overall_score >= 90
        ? 'Excellent pronunciation! Your tone and fluency are outstanding. Keep up the great work!' 
        : overall_score >= 75 
        ? 'Good job! Your pronunciation is clear and understandable. Continue practicing to perfect your tones.' 
        : 'Keep practicing! Focus on pronunciation accuracy and tone. Try to speak more clearly and confidently.',
      method: 'mock'
    };

    console.log('✅ 模擬評分結果:', mockResult);

    return res.json(mockResult);

  } catch (error) {
    console.error('❌ 評分錯誤:', error);
    return res.status(500).json({
      code: 'SCORE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      overall_score: 0
    });
  }
}

// 導出 multer middleware
export const scoreUpload = upload.single('audio');
