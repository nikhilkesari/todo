import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';

describe('Express Backend Proxy Server', () => {
  it('GET /api/health returns 200 with server status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.geminiConfigured).toBe('boolean');
    expect(typeof res.body.model).toBe('string');
  });

  it('POST /api/ai/analyze-workload rejects empty payload', async () => {
    const res = await request(app).post('/api/ai/analyze-workload').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/analyze-workload returns valid analysis for tasks', async () => {
    const tasks = [
      { id: '1', title: 'Task 1', completed: false, dueDate: '2026-09-27', projectId: 'inbox', priority: 'high' },
      { id: '2', title: 'Task 2', completed: false, dueDate: '2026-09-27', projectId: 'inbox', priority: 'medium' },
      { id: '3', title: 'Task 3', completed: false, dueDate: '2026-09-27', projectId: 'inbox', priority: 'low' },
      { id: '4', title: 'Task 4', completed: false, dueDate: '2026-09-27', projectId: 'inbox', priority: 'low' },
    ];

    const res = await request(app)
      .post('/api/ai/analyze-workload')
      .send({ tasks, currentDate: '2026-09-27' });

    expect(res.status).toBe(200);
    expect(res.body.workloadLevel).toBe('overcommitted');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
  });

  it('POST /api/ai/reschedule-suggestions returns rebalance candidates', async () => {
    const tasks = [
      { id: '1', title: 'Urgent Task', completed: false, dueDate: '2026-09-27', projectId: 'inbox', priority: 'high' },
      { id: '2', title: 'Routine Task', completed: false, dueDate: '2026-09-27', projectId: 'inbox', priority: 'low' },
    ];

    const res = await request(app)
      .post('/api/ai/reschedule-suggestions')
      .send({ tasks, targetDate: '2026-09-27' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions[0].taskId).toBe('2');
  });

  it('POST /api/ai/decompose-task returns subtasks', async () => {
    const res = await request(app)
      .post('/api/ai/decompose-task')
      .send({ title: 'Build CI Pipeline', estimatedMinutes: 90 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.subtasks)).toBe(true);
    expect(res.body.subtasks.length).toBeGreaterThanOrEqual(3);
  });
});
