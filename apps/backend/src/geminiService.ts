import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
      });

      return (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate content with Gemini');
    }
  }

  isAvailable(): boolean {
    return this.model !== null;
  }
}

// 導出預設實例
export const geminiService = new GeminiService();
