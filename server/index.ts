import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import aiRouter from './routes/ai';

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', healthRouter);
app.use('/api', aiRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend proxy server listening on port ${PORT}`);
  });
}
