// Shared constants definition

// API endpoints constants
export const API_ENDPOINTS = {
  // Question bank management
  QUESTIONS: '/api/questions',
  QUESTIONS_BY_TYPE: '/api/questions/:type',

  // Analysis service
  ANALYZE: '/api/analyze',
  GENERATE_REPORT: '/api/generate-report',

  // Session management
  SESSION: '/api/session',
  SESSION_BY_ID: '/api/session/:id',

  // Version 1 API
  V1: {
    ANALYZE: '/v1/analyze',
    GENERATE_REPORT: '/v1/generate-report',
    QUESTIONS: '/v1/questions/:type'
  }
} as const;

// HTTP status codes constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Error codes constants
export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  API_KEY_MISSING: 'API_KEY_MISSING'
} as const;

// Interview types constants
export const INTERVIEW_TYPES = {
  SELF_INTRO: 'self_intro',
  CHINESE_TEST: 'chinese-lessons',
  TECHNICAL: 'technical',
  BEHAVIORAL: 'behavioral'
} as const;

// Scoring criteria constants
export const SCORING = {
  MAX_SCORE: 100,
  MIN_SCORE: 0,
  WEIGHTS: {
    PRONUNCIATION: 0.2,
    FLUENCY: 0.2,
    ACCURACY: 0.2,
    COMPREHENSION: 0.2,
    CONFIDENCE: 0.2
  }
} as const;

// Time constants (seconds)
export const TIME_LIMITS = {
  THINKING_TIME_MAX: 300, // 5 minutes
  ANSWERING_TIME_MAX: 600, // 10 minutes
  SESSION_TIMEOUT: 3600    // 1 hour
} as const;

// File paths constants
export const PATHS = {
  LOGS: 'logs',
  SESSIONS: 'logs/sessions',
  PLUGINS: 'plugins',
  CHINESE_TEST_CONTEXT: 'plugins/chinese-lessons'
} as const;

// Environment variables constants
export const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  BACKEND_PORT: 'BACKEND_PORT',
  FRONTEND_PORT: 'FRONTEND_PORT',
  GEMINI_API_KEY: 'GEMINI_API_KEY',
  GOOGLE_API_KEY: 'GOOGLE_API_KEY',
  NEXT_PUBLIC_API_URL: 'NEXT_PUBLIC_API_URL',
  DEBUG_API_ERRORS: 'DEBUG_API_ERRORS'
} as const;
