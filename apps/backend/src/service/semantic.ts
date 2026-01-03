import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SemanticSignals, SessionInput } from '../analysis-core';

export interface SemanticExtractor {
  extractSignals(input: { question: string; transcript: string }): Promise<SemanticSignals>;
  generateReport?(data: any): Promise<any>;
}

export class DummySemanticExtractor implements SemanticExtractor {
  async extractSignals(input: { question: string; transcript: string }): Promise<SemanticSignals> {
    // 模擬語意分析結果
    return {
      sentiment: 0.7,
      confidence: 0.8,
      clarity: 0.75,
      relevance: 0.85,
      completeness: 0.7
    };
  }

  async generateReport(data: any): Promise<any> {
    // 生成學習報告
    const { studentName, lessonTitle, lessonObjective, dateCompleted, questions, overallScores } = data;

    return {
      studentName,
      lessonTitle,
      lessonObjective,
      dateCompleted,
      summary: {
        overallPerformance: this.calculateOverallPerformance(overallScores),
        strengths: this.identifyStrengths(questions),
        areasForImprovement: this.identifyAreasForImprovement(questions),
        recommendations: this.generateRecommendations(questions, overallScores)
      },
      detailedResults: questions.map((q: any, index: number) => ({
        questionNumber: index + 1,
        prompt: q.prompt,
        studentAnswer: q.studentAnswer,
        scores: q.scores,
        feedback: this.generateQuestionFeedback(q)
      })),
      overallScores,
      generatedAt: new Date().toISOString()
    };
  }

  private calculateOverallPerformance(scores: any): string {
    const scoreValues = Object.values(scores) as number[];
    const avg = scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length;
    if (avg >= 8.5) return '優秀';
    if (avg >= 7.0) return '良好';
    if (avg >= 6.0) return '及格';
    return '需要改進';
  }

  private identifyStrengths(questions: any[]): string[] {
    const strengths: string[] = [];
    const avgPronunciation = questions.reduce((sum, q) => sum + q.scores.Pronunciation, 0) / questions.length;
    const avgFluency = questions.reduce((sum, q) => sum + q.scores.Fluency, 0) / questions.length;
    const avgAccuracy = questions.reduce((sum, q) => sum + q.scores.Accuracy, 0) / questions.length;

    if (avgPronunciation >= 8) strengths.push('發音清晰準確');
    if (avgFluency >= 8) strengths.push('語流流暢自然');
    if (avgAccuracy >= 8) strengths.push('用詞精確得當');

    return strengths.length > 0 ? strengths : ['持續練習將帶來進步'];
  }

  private identifyAreasForImprovement(questions: any[]): string[] {
    const areas: string[] = [];
    const avgPronunciation = questions.reduce((sum, q) => sum + q.scores.Pronunciation, 0) / questions.length;
    const avgFluency = questions.reduce((sum, q) => sum + q.scores.Fluency, 0) / questions.length;
    const avgAccuracy = questions.reduce((sum, q) => sum + q.scores.Accuracy, 0) / questions.length;
    const avgComprehension = questions.reduce((sum, q) => sum + q.scores.Comprehension, 0) / questions.length;

    if (avgPronunciation < 7) areas.push('發音需要改進');
    if (avgFluency < 7) areas.push('語流需要更流暢');
    if (avgAccuracy < 7) areas.push('用詞準確性需要提升');
    if (avgComprehension < 7) areas.push('理解力需要加強');

    return areas.length > 0 ? areas : ['整體表現均衡'];
  }

  private generateRecommendations(questions: any[], overallScores: any): string[] {
    const recommendations: string[] = [];

    if (overallScores.Pronunciation < 7) {
      recommendations.push('建議多聽標準發音並跟讀練習');
    }
    if (overallScores.Fluency < 7) {
      recommendations.push('建議增加日常對話練習，提高語流流暢度');
    }
    if (overallScores.Accuracy < 7) {
      recommendations.push('建議擴充詞彙量並注意文法使用');
    }
    if (overallScores.Comprehension < 7) {
      recommendations.push('建議多聽多看中文內容，提高理解能力');
    }

    return recommendations.length > 0 ? recommendations : ['繼續保持良好的學習習慣'];
  }

  private generateQuestionFeedback(question: any): string {
    const scores = question.scores;
    const scoreValues = Object.values(scores) as number[];
    const avgScore = scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length;

    if (avgScore >= 8.5) {
      return '表現優秀，繼續保持！';
    } else if (avgScore >= 7.0) {
      return '表現良好，有進步空間。';
    } else if (avgScore >= 6.0) {
      return '基本達標，需要更多練習。';
    } else {
      return '需要加強練習和改進。';
    }
  }
}

export class GeminiSemanticExtractor implements SemanticExtractor {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error('Gemini API key not configured');
    }
    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async extractSignals(input: { question: string; transcript: string }): Promise<SemanticSignals> {
    try {
      const prompt = [
        '請分析以下問題和回答的語意特徵，返回 JSON 格式：',
        '{"sentiment": 0.0-1.0, "confidence": 0.0-1.0, "clarity": 0.0-1.0, "relevance": 0.0-1.0, "completeness": 0.0-1.0}',
        '',
        '問題：',
        input.question,
        '',
        '回答：',
        input.transcript
      ].join('\n');

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' as any }
      });

      const raw = (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(raw);

      return {
        sentiment: Math.max(0, Math.min(1, parsed.sentiment || 0.5)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        clarity: Math.max(0, Math.min(1, parsed.clarity || 0.5)),
        relevance: Math.max(0, Math.min(1, parsed.relevance || 0.5)),
        completeness: Math.max(0, Math.min(1, parsed.completeness || 0.5))
      };
    } catch (error) {
      console.warn('Gemini semantic extraction failed, using dummy values:', error);
      return {
        sentiment: 0.5,
        confidence: 0.5,
        clarity: 0.5,
        relevance: 0.5,
        completeness: 0.5
      };
    }
  }

  async generateReport(data: any): Promise<any> {
    // 使用 Gemini 生成更詳細的學習報告
    const { studentName, lessonTitle, lessonObjective, dateCompleted, questions, overallScores } = data;

    try {
      const prompt = [
        '請根據以下學習數據生成詳細的中文學習報告。報告應包含：',
        '1. 學生的整體表現評價',
        '2. 各項能力的分析（發音、流暢度、準確性、理解力）',
        '3. 具體的改進建議',
        '4. 鼓勵和下一步學習建議',
        '',
        '學生姓名：', studentName,
        '課程標題：', lessonTitle,
        '學習目標：', lessonObjective,
        '完成日期：', dateCompleted,
        '',
        '整體分數：', JSON.stringify(overallScores, null, 2),
        '',
        '題目詳情：', JSON.stringify(questions, null, 2),
        '',
        '請用繁體中文撰寫報告，結構清晰，內容專業且鼓勵性。'
      ].join('\n');

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      });

      const reportContent = (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '無法生成報告內容';

      return {
        studentName,
        lessonTitle,
        lessonObjective,
        dateCompleted,
        reportContent,
        overallScores,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Gemini AI'
      };
    } catch (error) {
      console.warn('Gemini report generation failed, falling back to dummy:', error);
      const dummyExtractor = new DummySemanticExtractor();
      return await dummyExtractor.generateReport(data);
    }
  }
}
