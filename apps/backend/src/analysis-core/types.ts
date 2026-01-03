// analysis-core/types moved into backend
export interface QAItem {
  index: number;
  question: string;
  answer: string;
  thinkingTime: number;
  answeringTime: number;
  lessonId?: string;    // 新增：課程 ID
  stepId?: number;      // 新增：步驟 ID
  expectedAnswer?: string | string[]; // 新增：預期答案（用於中文學習）
}

export type PerQuestionResult = {
  questionId: string;
  title: string;
  metrics: {
    thinkingTime: number;
    answeringTime: number;
    tokensPerMinute: number;
    tokenCount: number;
    ratio: number;
  };
  scores: {
    pronunciation: number;
    fluency: number;
    accuracy: number;
    comprehension: number;
    confidence: number;
    total: number;
  };
  notes?: string;
  llmAnalysis?: PerQuestionLLMExplain;
  /** 針對該題的客製化建議（約 300 字） */
  advice?: string;
  /** 針對該題的「優化後」建議稿（同語言重寫） */
  optimizedAnswer?: string;
};

export type PerQuestionLLMExplain = {
  signals?: SemanticSignals;
  highlights?: { type: 'support' | 'risk'; start: number; end: number; note?: string }[];
};

export type SemanticSignals = {
  sentiment?: number;
  confidence?: number;
  clarity?: number;
  relevance?: number;
  completeness?: number;
  semanticRelevance?: number;
  directAnswerProbability?: number;
  conclusionFirstProbability?: number;
  structureCompleteness?: number;
  coverageRatio?: number;
  missingPoints?: string[];
  evidenceQuality?: number;
  examplesExtracted?: { quote: string; start?: number; end?: number }[];
  flags?: { verbosity?: boolean; offtopic?: boolean; ethicsRisk?: boolean };
  rationales?: { dimension: 'pronunciation'|'fluency'|'accuracy'|'comprehension'|'confidence'; note: string }[];
};

export type SessionInput = {
  sessionId: string;
  date?: string;
  interviewType?: string; // 新增：面試類型，用於獲取 lessons 數據
  items: QAItem[];
};

export type Overview = {
  total_score: number;
  radar: { pronunciation: number; fluency: number; accuracy: number; comprehension: number; confidence: number; };
  totals: { numQuestions: number; totalSeconds: number; avgThink: number; avgAnswer: number; };
};

export type AnalysisOutput = {
  overview: Overview;
  per_question: PerQuestionResult[];
  recommendations: string[];
  version: string;
};

// 中文學習報告類型定義
export interface Report {
  student_name: string;
  lesson_title: string;
  lesson_objective: string;
  date_completed: string;
  overall_feedback: {
    teacher_summary: string;
    next_focus: string;
    encouragement: string;
  };
  lesson_score: {
    Pronunciation: number;
    Fluency: number;
    Accuracy: number;
    Comprehension: number;
    Confidence: number;
    Total: number;
  };
  question_feedback: Array<{
    question_id: number;
    original_prompt: {
      chinese: string;
      pinyin: string;
      english: string;
    };
    student_answer: string;
    evaluation: {
      Pronunciation: number;
      Fluency: number;
      Accuracy: number;
      Comprehension: number;
    };
    teacher_comment: string;
  }>;
  practice_recommendations: Array<{
    type: string;
    description: string;
    duration: string;
    audio_link?: string;
  }>;
  teacher_signature: string;
}


