import type { Request, Response } from 'express';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// 獲取所有 session 列表
export async function getSessionsHandler(req: Request, res: Response) {
  try {
    const sessionsDir = path.resolve(__dirname, '../logs/sessions');
    
    if (!existsSync(sessionsDir)) {
      return res.json({ sessions: [] });
    }
    
    const files = await readdir(sessionsDir);
    const sessions: any[] = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const filePath = path.join(sessionsDir, file);
        const content = await readFile(filePath, 'utf-8');
        const sessionData = JSON.parse(content);
        
        // 提取 session 摘要信息
        const sessionId = file.replace('.json', '');
        const items = sessionData.items || [];
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        
        // 判斷是否為中文課程
        const isChineseLesson = firstItem?.lesson_id?.startsWith('L');
        
        sessions.push({
          sessionId,
          interviewType: sessionData.interview_type || 'unknown',
          isChineseLesson,
          lessonId: firstItem?.lesson_id,
          createdAt: firstItem?.askedAt || new Date().toISOString(),
          completedAt: lastItem?.answeredAt,
          completed: lastItem?.completed || false,
          totalQuestions: items.length,
          answeredQuestions: items.filter((item: any) => item.answer).length
        });
      } catch (error) {
        console.warn(`Failed to parse session file ${file}:`, error);
      }
    }
    
    // 按創建時間倒序排列
    sessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to get sessions' });
  }
}

// 獲取單個 session 詳情
export async function getSessionDetailHandler(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const sessionFile = path.resolve(__dirname, '../logs/sessions', `${sessionId}.json`);
    
    if (!existsSync(sessionFile)) {
      return res.status(404).json({ code: 'SESSION_NOT_FOUND', message: 'Session not found' });
    }
    
    const content = await readFile(sessionFile, 'utf-8');
    const sessionData = JSON.parse(content);
    
    res.json(sessionData);
  } catch (error) {
    console.error('Get session detail error:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to get session detail' });
  }
}
