import { IDBPDatabase } from 'idb';
import { TodoDBSchema } from './database';
import { Project, Task } from '../types';
import { getTodayDateString, getTomorrowDateString } from '../utils/dateUtils';

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'inbox',
    name: 'Inbox',
    color: '#6366f1',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'work',
    name: 'Work',
    color: '#3b82f6',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#10b981',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'groceries',
    name: 'Groceries',
    color: '#f59e0b',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
];

export function getSampleTasks(): Task[] {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const now = new Date().toISOString();

  return [
    {
      id: 'task-welcome',
      title: 'Welcome to TaskFlow AI! 👋',
      description: 'Click the checkbox to mark this task complete, or edit to explore options.',
      completed: false,
      dueDate: today,
      projectId: 'inbox',
      priority: 'medium',
      complexity: 'low',
      estimatedMinutes: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-work-sprint',
      title: 'Review weekly project sprint goals',
      description: 'Check roadmap and upcoming milestones with the team.',
      completed: false,
      dueDate: today,
      projectId: 'work',
      priority: 'high',
      complexity: 'medium',
      estimatedMinutes: 45,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-work-slides',
      title: 'Prepare architecture presentation slides',
      description: 'Include IndexedDB schema diagram and CDP test pipeline.',
      completed: false,
      dueDate: tomorrow,
      projectId: 'work',
      priority: 'medium',
      complexity: 'high',
      estimatedMinutes: 90,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-groceries',
      title: 'Pick up fresh groceries & coffee beans',
      description: 'Milk, apples, whole bean coffee, sourdough bread.',
      completed: false,
      dueDate: today,
      projectId: 'groceries',
      priority: 'low',
      complexity: 'low',
      estimatedMinutes: 30,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-walk',
      title: 'Evening 30-min walk in the park',
      description: 'Daily outdoor exercise and fitness goal.',
      completed: true,
      dueDate: today,
      projectId: 'personal',
      priority: 'low',
      complexity: 'low',
      estimatedMinutes: 30,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function seedInitialData(db: IDBPDatabase<TodoDBSchema>): Promise<void> {
  const projectCount = await db.count('projects');
  if (projectCount === 0) {
    const tx = db.transaction(['projects', 'tasks', 'settings'], 'readwrite');
    for (const project of DEFAULT_PROJECTS) {
      await tx.objectStore('projects').put(project);
    }
    const sampleTasks = getSampleTasks();
    for (const task of sampleTasks) {
      await tx.objectStore('tasks').put(task);
    }
    await tx.objectStore('settings').put({ key: 'seeded', value: true });
    await tx.done;
  }
}
