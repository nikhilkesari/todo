import { Router, Request, Response } from 'express';
import { geminiService } from '../services/gemini';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: geminiService.isConfigured(),
    model: geminiService.getModel(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
