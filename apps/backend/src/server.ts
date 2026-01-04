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

// CORS configuration - Allow both local development and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://fix-ui-web.vercel.app',
  'https://fix-ui-leowang1223.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check if origin matches vercel.app pattern
    if (origin.match(/^https:\/\/.*\.vercel\.app$/)) {
      return callback(null, true);
    }

    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for logs
app.use('/logs', express.static(path.join(__dirname, 'logs')));

// API routes
app.post('/api/analyze', analyzeHandler);
app.post('/api/score', scoreUpload, scoreHandler);
app.post('/api/qa', qaHandler);
app.get('/api/sessions', getSessionsHandler);
app.get('/api/sessions/:sessionId', getSessionDetailHandler);
app.use('/api/lessons', lessonsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/conversation', conversationRouter);
app.use('/api/lesson-history', lessonHistoryRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.NODE_ENV === 'production' ? 'Vercel domains' : 'localhost'}`);
});
