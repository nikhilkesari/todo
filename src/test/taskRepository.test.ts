import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { taskRepository } from '../db/taskRepository';
import { closeDatabase, DB_NAME } from '../db/database';

describe('TaskRepository', () => {
  beforeEach(async () => {
    closeDatabase();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });

  afterEach(() => {
    closeDatabase();
  });

  it('creates a task with default and provided properties', async () => {
    const task = await taskRepository.create({
      title: 'Buy groceries',
      description: 'Milk, eggs, cheese',
      dueDate: '2026-09-30',
      priority: 'high',
      complexity: 'medium',
      estimatedMinutes: 45,
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Buy groceries');
    expect(task.description).toBe('Milk, eggs, cheese');
    expect(task.dueDate).toBe('2026-09-30');
    expect(task.priority).toBe('high');
    expect(task.complexity).toBe('medium');
    expect(task.estimatedMinutes).toBe(45);
    expect(task.completed).toBe(false);
    expect(task.projectId).toBe('inbox');
    expect(task.createdAt).toBeDefined();
    expect(task.updatedAt).toBeDefined();

    const fetched = await taskRepository.getById(task.id);
    expect(fetched).toEqual(task);
  });

  it('retrieves all tasks and filters by project and due date', async () => {
    const t1 = await taskRepository.create({
      title: 'Work task',
      projectId: 'work',
      dueDate: '2026-10-01',
    });
    const t2 = await taskRepository.create({
      title: 'Personal task',
      projectId: 'personal',
      dueDate: '2026-10-01',
    });
    const t3 = await taskRepository.create({
      title: 'Inbox task',
      projectId: 'inbox',
      dueDate: '2026-10-05',
    });

    const all = await taskRepository.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((t) => t.id)).toContain(t3.id);

    const workTasks = await taskRepository.getByProjectId('work');
    expect(workTasks).toHaveLength(1);
    expect(workTasks[0].id).toBe(t1.id);

    const oct1Tasks = await taskRepository.getByDueDate('2026-10-01');
    expect(oct1Tasks).toHaveLength(2);
    expect(oct1Tasks.map((t) => t.id).sort()).toEqual([t1.id, t2.id].sort());
  });

  it('updates task properties accurately', async () => {
    const task = await taskRepository.create({
      title: 'Original Title',
      priority: 'low',
    });

    const updated = await taskRepository.update({
      id: task.id,
      title: 'Updated Title',
      priority: 'high',
      description: 'Added description',
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.priority).toBe('high');
    expect(updated.description).toBe('Added description');

    const fetched = await taskRepository.getById(task.id);
    expect(fetched?.title).toBe('Updated Title');
  });

  it('toggles task completion status', async () => {
    const task = await taskRepository.create({ title: 'Toggle test', completed: false });
    expect(task.completed).toBe(false);

    const toggled1 = await taskRepository.toggleComplete(task.id);
    expect(toggled1.completed).toBe(true);

    const toggled2 = await taskRepository.toggleComplete(task.id);
    expect(toggled2.completed).toBe(false);
  });

  it('deletes a task', async () => {
    const task = await taskRepository.create({ title: 'To delete' });
    expect(await taskRepository.getById(task.id)).toBeDefined();

    await taskRepository.delete(task.id);
    expect(await taskRepository.getById(task.id)).toBeUndefined();
  });

  it('batch reschedules multiple tasks in an atomic transaction', async () => {
    const t1 = await taskRepository.create({ title: 'Task 1', dueDate: '2026-09-28' });
    const t2 = await taskRepository.create({ title: 'Task 2', dueDate: '2026-09-28' });

    const updated = await taskRepository.batchReschedule([
      { taskId: t1.id, newDueDate: '2026-09-29' },
      { taskId: t2.id, newDueDate: '2026-09-30' },
    ]);

    expect(updated).toHaveLength(2);
    expect((await taskRepository.getById(t1.id))?.dueDate).toBe('2026-09-29');
    expect((await taskRepository.getById(t2.id))?.dueDate).toBe('2026-09-30');
  });
});
