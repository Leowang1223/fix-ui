import type { QAItem, PerQuestionResult, SemanticSignals } from './types';

/* ---------- 工具函數 ---------- */
export const stripPunc = (s: string) => s.replace(/[^\p{L}\p{N}\s]/gu, '');
export const detectLang = (s: string) => /[\u4e00-\u9fff]/.test(s) ? 'zh' : 'en';
export const tokenCount = (text: string) => {
  const lang = detectLang(text);
  if (lang === 'zh') return stripPunc(text).replace(/\s+/g,'').length;
  return stripPunc(text).trim().split(/\s+/).filter(Boolean).length;
};
export const tpm = (count: number, secs: number, _lang: 'zh'|'en') =>
  secs <= 0 ? 0 : (count / (secs/60));

// 拼音轉換映射表（簡化版）
const PINYIN_MAP: Record<string, string> = {
  '你': 'ni', '好': 'hao', '嗎': 'ma', '我': 'wo', '是': 'shi',
  '學生': 'xuesheng', '老師': 'laoshi', '謝謝': 'xiexie', '請': 'qing',
  '吃': 'chi', '喝': 'he', '去': 'qu', '來': 'lai', '看': 'kan'
};

// 簡化拼音轉換
function toPinyin(text: string): string {
  return text.split('').map(char => PINYIN_MAP[char] || char).join(' ');
}

// Levenshtein 距離計算
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替換
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 刪除
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// 計算相似度 (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

// 動態閾值計算（根據題目難度）
function getDynamicThresholds(expectedAnswer: string, question: string) {
  const expectedLen = expectedAnswer.length;
  const questionLen = question.length;

  // 簡單題目：短答案，寬鬆閾值
  if (expectedLen <= 3) {
    return { keywordThreshold: 0.6, structureThreshold: 0.5, similarityThreshold: 0.8 };
  }
  // 中等題目：中等長度，標準閾值
  else if (expectedLen <= 10) {
    return { keywordThreshold: 0.7, structureThreshold: 0.6, similarityThreshold: 0.75 };
  }
  // 困難題目：長答案，嚴格閾值
  else {
    return { keywordThreshold: 0.8, structureThreshold: 0.7, similarityThreshold: 0.7 };
  }
}

// 多語言混合處理
function normalizeText(text: string): { original: string; pinyin: string; english: string } {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  return {
    original: text.toLowerCase(),
    pinyin: hasChinese ? toPinyin(text).toLowerCase() : '',
    english: hasEnglish ? text.replace(/[^\w\s]/g, '').toLowerCase() : ''
  };
}

export const preprocessOne = (q: QAItem) => {
  const lang = detectLang(q.answer);
  const count = tokenCount(q.answer);
  const speed = tpm(count, q.answeringTime, lang);
  const ratio = q.answeringTime > 0 ? q.thinkingTime / q.answeringTime : 0;
  return { lang, token_count: count, tpm: speed, ratio };
};

/* ---------- 規則計算 ---------- */
const CFG = {
  weights: { pronunciation: 0.30, fluency: 0.20, accuracy: 0.25, comprehension: 0.15, confidence: 0.10 },
  fluency: { tpmMin_zh: 200, tpmMax_zh: 350, hesitationThreshold: 0.15 },
  accuracy: { keywordMatchMin: 0.6, structureScoreMin: 0.7 },
  comprehension: { directAnswerProbMin: 0.7, semanticRelevanceMin: 0.6 },
  confidence: { volumeStabilityMin: 0.8, engagementScoreMin: 0.7 }
};

const hasBulletCues = (t: string) => /(第一|其次|最後|首先|接著|1\.|2\.|3\.)/.test(t);
const headTwo = (t: string) => t.split(/[。.!?]\s*/).slice(0,2).join(' ');
const conclusionFirstHeuristic = (_q: string, t: string) => headTwo(t).length>0;
const closingResultHeuristic = (_q: string, t: string) => /(因此|所以|結果|總結|因此我|所以我)/.test(t.slice(-80));

const keywordHitRatio = (q: string, t: string) => {
  const key = stripPunc(q).split(/\s|、|，|。|,|\/|:|；/).filter(w => w.length>=2).slice(0,5);
  if (key.length===0) return 0.5;
  const hit = key.filter(k => t.includes(k)).length;
  return hit/key.length;
};
const specificityCount = (t: string) => {
  const nums = (t.match(/(\d+(\.\d+)?%?)/g)||[]).length;
  const dates = (t.match(/(20\d{2}|19\d{2}|月|年|日)/g)||[]).length;
  const proper = (t.match(/[A-Z][a-z]{2,}/g)||[]).length;
  return nums+dates+proper;
};
const bounded = (x:number)=>Math.max(0, Math.min(100, x));

/* ---------- 優化後的準確度評估邏輯 ----------

新功能說明：
1. 拼音支援：自動將中文轉換為拼音進行比對
2. Levenshtein 距離：計算字串相似度，允許小錯誤
3. 多語言支援：同時處理中英文混合輸入
4. 動態閾值：根據答案長度動態調整匹配嚴格度

評分邏輯：
- 相似度匹配 (50%)：原始文本 + 拼音 + 英文的最大相似度
- 關鍵詞匹配 (30%)：傳統關鍵詞重疊度
- 結構完整性 (20%)：句子結構評估

範例：
預期答案: "你好嗎"
使用者回答: "你好嗎"  相似度: 1.0  Excellent
使用者回答: "你好马"  相似度: 0.8, 拼音相似度: 0.9  Good
使用者回答: "hello"  英文相似度: 0.0  Fair

*/
export function scoreOneRuleOnly(q: QAItem): PerQuestionResult {
  const pre = preprocessOne(q);

  // Pronunciation (发音) - 基于语速和停顿分析（近似评估）
  const [minTpm, maxTpm] = [CFG.fluency.tpmMin_zh, CFG.fluency.tpmMax_zh];
  const pronunciation = bounded(
    pre.tpm >= minTpm && pre.tpm <= maxTpm ? 85 :
    pre.tpm < minTpm ? Math.max(60, 85 - (minTpm - pre.tpm) * 2) :
    Math.max(60, 85 - (pre.tpm - maxTpm) * 1.5)
  );

  // Fluency (流畅度) - 基于语速和思考时间比例
  const fluencyRatio = pre.ratio;
  const fluencyTpm = pre.tpm;
  let fluency = 100;
  if (fluencyTpm < minTpm) fluency -= Math.ceil((minTpm - fluencyTpm) / 20) * 8;
  if (fluencyTpm > maxTpm) fluency -= Math.ceil((fluencyTpm - maxTpm) / 20) * 6;
  if (fluencyRatio > CFG.fluency.hesitationThreshold) fluency -= Math.ceil((fluencyRatio - CFG.fluency.hesitationThreshold) / 0.05) * 10;
  const fluencyScore = bounded(fluency);

  // Accuracy (准确度) - 基于多维度比对算法
  let accuracy = 60; // 基础分数

  // 檢查是否有預期的答案數據
  if (q.expectedAnswer) {
    const userNormalized = normalizeText(q.answer);
    const expectedAnswers = Array.isArray(q.expectedAnswer)
      ? q.expectedAnswer
      : [q.expectedAnswer];

    let bestMatchScore = 0;

    for (const expected of expectedAnswers) {
      const expectedNormalized = normalizeText(expected);
      const thresholds = getDynamicThresholds(expected, q.question);

      // 1. 原始文本相似度
      const originalSimilarity = calculateSimilarity(
        userNormalized.original,
        expectedNormalized.original
      );

      // 2. 拼音相似度（如果有中文）
      const pinyinSimilarity = userNormalized.pinyin && expectedNormalized.pinyin
        ? calculateSimilarity(userNormalized.pinyin, expectedNormalized.pinyin)
        : 0;

      // 3. 英文相似度（如果有英文）
      const englishSimilarity = userNormalized.english && expectedNormalized.english
        ? calculateSimilarity(userNormalized.english, expectedNormalized.english)
        : 0;

      // 4. 關鍵詞匹配（傳統方法）
      const keywordMatch = keywordHitRatio(q.question, q.answer);

      // 5. 句子結構完整性
      const hasStructure = hasBulletCues(q.answer) || conclusionFirstHeuristic(q.question, q.answer);

      // 綜合評分
      const maxSimilarity = Math.max(originalSimilarity, pinyinSimilarity, englishSimilarity);
      const similarityScore = maxSimilarity >= thresholds.similarityThreshold ? 1 : maxSimilarity;
      const keywordScore = keywordMatch >= thresholds.keywordThreshold ? 1 : keywordMatch;
      const structureScore = hasStructure ? 1 : 0.5;

      // 加權計算
      const matchScore = (
        similarityScore * 0.5 +    // 相似度權重 50%
        keywordScore * 0.3 +      // 關鍵詞權重 30%
        structureScore * 0.2      // 結構權重 20%
      );

      bestMatchScore = Math.max(bestMatchScore, matchScore);
    }

    // 轉換為百分比分數
    accuracy = bounded(bestMatchScore * 100);
  }

  // 如果沒有預期答案，基於回答質量給出基礎分數
  if (!q.expectedAnswer) {
    const answerLength = q.answer.trim().length;
    const hasMeaningfulContent = answerLength > 5 && /\p{L}/u.test(q.answer);
    accuracy = hasMeaningfulContent ? bounded(70 + Math.min(20, answerLength / 10)) : 40;
  }

  // Comprehension (理解力) - 基于直接回答概率和语义相关性（简化版）
  const directAnswerScore = conclusionFirstHeuristic(q.question, q.answer) ? 80 : 60;
  const semanticRelevance = keywordHitRatio(q.question, q.answer) * 100;
  const comprehension = bounded((directAnswerScore + semanticRelevance) / 2);

  // Confidence (自信表达) - 基于回答长度和语速稳定性
  const lengthScore = Math.min(100, pre.token_count * 2); // 回答越长越自信
  const speedStability = fluencyTpm >= minTpm && fluencyTpm <= maxTpm ? 90 : 70;
  const confidence = bounded((lengthScore + speedStability) / 2);

  const scores = {
    pronunciation,
    fluency: fluencyScore,
    accuracy,
    comprehension,
    confidence
  };

  const total = Math.round(
    scores.pronunciation * CFG.weights.pronunciation +
    scores.fluency * CFG.weights.fluency +
    scores.accuracy * CFG.weights.accuracy +
    scores.comprehension * CFG.weights.comprehension +
    scores.confidence * CFG.weights.confidence
  );

  return {
    questionId: q.index.toString(),
    title: q.question.slice(0,16),
    metrics: { thinkingTime: q.thinkingTime, answeringTime: q.answeringTime, tokensPerMinute: pre.tpm, tokenCount: pre.token_count, ratio: pre.ratio },
    scores: { ...scores, total },
    notes: ''
  };
}

/* ---------- LLM 融合 ---------- */
export function fuseWithLLM(base: PerQuestionResult, s?: SemanticSignals): PerQuestionResult {
  if (!s) return base;
  const pct = (x?:number)=> typeof x==='number'?Math.round(100*x):null;
  const avg = (arr:(number|null)[]) => {
    const xs = arr.filter((x):x is number=>x!=null);
    return xs.length? Math.round(xs.reduce((a,b)=>a+b,0)/xs.length):null;
  };

  // 使用LLM信號來增強各維度評分
  const semanticRelevance = pct(s.semanticRelevance);
  const directAnswerProb = pct(s.directAnswerProbability);
  const structureCompleteness = pct(s.structureCompleteness);
  const evidenceQuality = pct(s.evidenceQuality);

  // Pronunciation - 保持規則評分，主要基於語速
  const pronunciation = base.scores.pronunciation;

  // Fluency - 結合規則評分和LLM結構完整性
  const fluency = structureCompleteness != null ?
    Math.round(0.7 * base.scores.fluency + 0.3 * structureCompleteness) :
    base.scores.fluency;

  // Accuracy - 結合關鍵詞匹配和證據質量
  const accuracy = evidenceQuality != null ?
    Math.round(0.8 * base.scores.accuracy + 0.2 * evidenceQuality) :
    base.scores.accuracy;

  // Comprehension - 基於語義相關性和直接回答概率
  const comprehensionBase = semanticRelevance != null && directAnswerProb != null ?
    Math.round((semanticRelevance + directAnswerProb) / 2) :
    semanticRelevance != null ? semanticRelevance :
    directAnswerProb != null ? directAnswerProb : base.scores.comprehension;

  const comprehension = Math.round(0.6 * base.scores.comprehension + 0.4 * comprehensionBase);

  // Confidence - 保持規則評分
  const confidence = base.scores.confidence;

  const total = Math.round(
    pronunciation * CFG.weights.pronunciation +
    fluency * CFG.weights.fluency +
    accuracy * CFG.weights.accuracy +
    comprehension * CFG.weights.comprehension +
    confidence * CFG.weights.confidence
  );

  return { ...base, scores:{ pronunciation, fluency, accuracy, comprehension, confidence, total }, llmAnalysis: { signals: s } };
}
