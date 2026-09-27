import { Router, Request, Response, NextFunction } from 'express';
import { geminiService } from '../services/gemini';
import { Task } from '../types/ai';

const router = Router();

router.post('/ai/analyze-workload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tasks, currentDate } = req.body as { tasks: Task[]; currentDate?: string };
    if (!Array.isArray(tasks)) {
      res.status(400).json({ error: 'Body must include an array of tasks' });
      return;
    }
    const today = currentDate || new Date().toISOString().split('T')[0];
    const result = await geminiService.analyzeWorkload(tasks, today);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/ai/reschedule-suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tasks, targetDate } = req.body as { tasks: Task[]; targetDate?: string };
    if (!Array.isArray(tasks)) {
      res.status(400).json({ error: 'Body must include an array of tasks' });
      return;
    }
    const date = targetDate || new Date().toISOString().split('T')[0];
    const result = await geminiService.getRescheduleSuggestions(tasks, date);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/ai/decompose-task', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, estimatedMinutes } = req.body as {
      title: string;
      description?: string;
      estimatedMinutes?: number;
    };
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Body must include a valid task title string' });
      return;
    }
    const result = await geminiService.decomposeTask(title, description, estimatedMinutes);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
