import { getDatabase } from './database';
import { Task, TaskCreateInput, TaskUpdateInput } from '../types';

export class TaskRepository {
  async getAll(): Promise<Task[]> {
    const db = await getDatabase();
    return db.getAll('tasks');
  }

  async getById(id: string): Promise<Task | undefined> {
    const db = await getDatabase();
    return db.get('tasks', id);
  }

  async getByProjectId(projectId: string): Promise<Task[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('tasks', 'by-projectId', projectId);
  }

  async getByDueDate(dueDate: string): Promise<Task[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('tasks', 'by-dueDate', dueDate);
  }

  async create(input: TaskCreateInput): Promise<Task> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = input.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newTask: Task = {
      id,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      completed: input.completed ?? false,
      dueDate: input.dueDate || undefined,
      projectId: input.projectId || 'inbox',
      priority: input.priority || 'medium',
      complexity: input.complexity || 'low',
      estimatedMinutes: input.estimatedMinutes,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('tasks', newTask);
    return newTask;
  }

  async update(input: TaskUpdateInput): Promise<Task> {
    const db = await getDatabase();
    const existing = await db.get('tasks', input.id);
    if (!existing) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    const updatedTask: Task = {
      ...existing,
      ...input,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? input.description.trim() || undefined : existing.description,
      dueDate: input.dueDate !== undefined ? (input.dueDate || undefined) : existing.dueDate,
      updatedAt: new Date().toISOString(),
    };

    await db.put('tasks', updatedTask);
    return updatedTask;
  }

  async toggleComplete(id: string): Promise<Task> {
    const db = await getDatabase();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const existing = await store.get(id);
    if (!existing) {
      await tx.done;
      throw new Error(`Task with id ${id} not found`);
    }

    const updatedTask: Task = {
      ...existing,
      completed: !existing.completed,
      updatedAt: new Date().toISOString(),
    };

    await store.put(updatedTask);
    await tx.done;
    return updatedTask;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('tasks', id);
  }

  async batchReschedule(
    suggestions: Array<{ taskId: string; newDueDate: string }>
  ): Promise<Task[]> {
    const db = await getDatabase();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const updatedTasks: Task[] = [];
    const now = new Date().toISOString();

    for (const item of suggestions) {
      const existing = await store.get(item.taskId);
      if (existing) {
        const updated: Task = {
          ...existing,
          dueDate: item.newDueDate,
          updatedAt: now,
        };
        await store.put(updated);
        updatedTasks.push(updated);
      }
    }

    await tx.done;
    return updatedTasks;
  }

  async batchUpdate(tasks: Task[]): Promise<Task[]> {
    const db = await getDatabase();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const now = new Date().toISOString();

    const saved: Task[] = [];
    for (const t of tasks) {
      const item: Task = { ...t, updatedAt: now };
      await store.put(item);
      saved.push(item);
    }

    await tx.done;
    return saved;
  }
}

export const taskRepository = new TaskRepository();
