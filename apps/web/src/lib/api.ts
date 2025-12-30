export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const fullUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : `${getApiBase()}${url}`
  const res = await fetch(fullUrl, { ...(init || {}), headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) {
    let body = ''
    try { body = await res.text() } catch {}
    throw new Error(`${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`);
  }
  return res.json() as Promise<T>;
}

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

export function getApiBase(): string {
  // 1) If on client, allow runtime override from localStorage (useful when前後端分離或更換網路)
  if (typeof window !== 'undefined') {
    try {
      const lsBase = localStorage.getItem('api_base');
      if (lsBase && lsBase.trim().length > 0) return lsBase.trim().replace(/\/$/, '');
    } catch {}

    // 2) Runtime detection: if running locally, use port 8082; otherwise use same-origin
    const { protocol, hostname } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (isLocalHost) return `${protocol}//${hostname}:8082`;
    return '';
  }

  // 3) SSR fallback: use relative path (requires reverse proxy)
  return '';
}

export async function apiGetQuestions(type: string): Promise<{ questions: any[]; lessons?: any[]; playbackMode?: string }> {
  // Use relative path so Next.js rewrites can proxy to the backend in any env
  return fetchJson(`/api/questions/${encodeURIComponent(type)}`);
}

export async function apiGetLessonContent(type: string, lessonId: string): Promise<any> {
  return fetchJson(`/api/questions/${encodeURIComponent(type)}/${encodeURIComponent(lessonId)}`);
}

export async function apiTts(text: string): Promise<{ audioBase64: string; mime: string }> {
  return fetchJson(`/api/tts`, { method: 'POST', body: JSON.stringify({ text }) });
}

export async function apiStt(audioBase64: string, mime: string): Promise<{ text: string }> {
  return fetchJson(`/api/stt`, { method: 'POST', body: JSON.stringify({ audioBase64, mime }) });
}

export async function apiAnalyze(payload: {
  sessionId: string
  interviewType: string
  items: Array<{
    index: number
    question: string
    answer: string
    lessonId?: string
    stepId?: number
    expectedAnswer?: string
  }>
}): Promise<any> {
  return fetchJson(`/api/analyze`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiGetSessions(): Promise<{ sessions: any[] }> {
  return fetchJson(`/api/sessions`);
}

export async function apiGetSessionDetail(sessionId: string): Promise<any> {
  return fetchJson(`/api/sessions/${encodeURIComponent(sessionId)}`);
}

export async function apiLog(payload: { 
  sessionId: string; 
  index: number; 
  question?: string; 
  answer?: string; 
  completed?: boolean;
  thinkingTime?: number;
  answeringTime?: number;
  lesson_id?: string;    // 新增：課程 ID
  step_id?: number;      // 新增：步驟 ID
}): Promise<{ ok: true }> {
  return fetchJson(`/api/log`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiGenerateReport(payload: {
  sessionId?: string;  // 新增：session ID
  studentName: string;
  lessonTitle: string;
  lessonObjective: string;
  dateCompleted: string;
  questions: Array<{
    id: number;
    prompt: { chinese: string; pinyin: string; english: string };
    studentAnswer: string;
    scores: { Pronunciation: number; Fluency: number; Accuracy: number; Comprehension: number };
  }>;
  overallScores: { Pronunciation: number; Fluency: number; Accuracy: number; Comprehension: number; Confidence: number };
}): Promise<Report> {
  return fetchJson(`/v1/generate-report`, { method: 'POST', body: JSON.stringify(payload) });
}

// ========== Scenario Mode APIs ==========

export interface ScenarioCheckpoint {
  id: number
  description: string
  chineseDescription: string
  completed: boolean
  completedAt?: string
}

export interface Scenario {
  scenario_id: string
  title: string
  chineseTitle: string
  description: string
  chineseDescription: string
  difficulty: 'A0-A1' | 'A2-B1' | 'B2+'
  category: string
  objective: string
  chineseObjective: string
  estimatedTurns: number
  firstSpeaker?: 'user' | 'ai'
  defaultUserRole?: string
  checkpoints: Array<{
    id: number
    description: string
    chineseDescription: string
    keywords?: string[]
    weight: number
  }>
  roles: Array<{
    id: string
    name: string
    chineseName: string
    systemPrompt: string
  }>
  suggestions: {
    byRole: Record<string, Array<{
      chinese: string
      pinyin: string
      english: string
      type: 'safe' | 'advanced' | 'alternative'
      context?: string
      checkpointId?: number
    }>>
  }
  keyVocabulary: Array<{ chinese: string; pinyin: string; english: string }>
  keyPatterns: Array<{ pattern: string; example: string; english: string }>
  tags: string[]
  createdAt: string
  isCustom: boolean
}

export async function apiGetScenarios(): Promise<{ scenarios: Scenario[] }> {
  return fetchJson(`/api/scenarios`)
}

export async function apiGetScenarioById(scenarioId: string): Promise<{ scenario: Scenario }> {
  return fetchJson(`/api/scenarios/${encodeURIComponent(scenarioId)}`)
}

export async function apiGenerateCustomScenario(payload: {
  title: string
  description: string
  difficulty: 'A0-A1' | 'A2-B1' | 'B2+'
  objective: string
}): Promise<{ scenario: Scenario }> {
  return fetchJson(`/api/scenarios/generate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function apiSaveCustomScenario(scenario: Scenario): Promise<{ success: boolean; scenarioId: string }> {
  return fetchJson(`/api/scenarios/custom`, {
    method: 'POST',
    body: JSON.stringify({ scenario })
  })
}


