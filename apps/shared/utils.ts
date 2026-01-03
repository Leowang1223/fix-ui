import path from 'path';
import { existsSync } from 'fs';

// Resolve plugin directory path
export function resolveInterviewDir(interviewType: string, baseDir: string): string {
  // Check if it's a Chinese lesson
  if (interviewType.startsWith('L') && /^\d+$/.test(interviewType.substring(1))) {
    // Chinese lessons: L1, L2, etc.
    const chineseLessonsDir = path.resolve(baseDir, 'plugins', 'chinese-lessons');
    if (existsSync(chineseLessonsDir)) return chineseLessonsDir;
  }

  // Development environment path
  const devPath = path.resolve(baseDir, 'plugins', 'chinese-lessons', interviewType);
  if (existsSync(devPath)) return devPath;

  // Production environment path
  const prodPath = path.resolve(baseDir, 'plugins', 'interview-types', interviewType);
  if (existsSync(prodPath)) return prodPath;

  // Fallback path
  const fallbackPath = path.resolve(baseDir, '../../src', 'plugins', 'chinese-lessons', interviewType);
  return fallbackPath;
}

// Format API response
export function formatApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): any {
  return {
    success,
    data,
    error,
    message,
    timestamp: new Date().toISOString()
  };
}

// Handle API error
export function handleApiError(error: any): any {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return formatApiResponse(false, null, error.message, error.code);
  }

  if (error.name === 'ValidationError') {
    return formatApiResponse(false, null, 'Input validation error', 'VALIDATION_ERROR');
  }

  if (error.code === 'ENOENT') {
    return formatApiResponse(false, null, 'File not found', 'FILE_NOT_FOUND');
  }

  return formatApiResponse(false, null, 'Internal server error', 'INTERNAL_ERROR');
}

// Custom API error class
export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}
