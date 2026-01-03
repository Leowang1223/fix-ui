import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { analyzeHandler } from './routes/analyze';
import { qaHandler } from './routes/qa';
import { scoreHandler, scoreUpload } from './routes/score';
import { getSessionsHandler, getSessionDetailHandler } from './routes/sessions';
import lessonsRouter from './routes/lessons';
import scenariosRouter from './routes/scenarios';
import conversationRouter from './routes/conversation';
import lessonHistoryRouter from './routes/lessonHistory';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8082;

// ������
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// �R�A�ɮתA��
app.use('/logs', express.static(path.join(__dirname, 'logs')));

// API ����
app.post('/api/analyze', analyzeHandler);
app.post('/api/score', scoreUpload, scoreHandler);
app.post('/api/qa', qaHandler);
app.get('/api/sessions', getSessionsHandler);
app.get('/api/sessions/:sessionId', getSessionDetailHandler);
app.use('/api/lessons', lessonsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/conversation', conversationRouter);
app.use('/api/lesson-history', lessonHistoryRouter);

// ���d�ˬd
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ���~�B�z������
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    code: 'INTERNAL_ERROR', 
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// �Ұʦ��A��
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
