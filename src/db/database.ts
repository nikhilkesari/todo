import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, Project } from '../types';

export interface TodoDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-projectId': string;
      'by-dueDate': string;
      'by-completed': number | string;
      'by-createdAt': string;
      'by-priority': string;
    };
  };
  projects: {
    key: string;
    value: Project;
    indexes: {
      'by-name': string;
      'by-createdAt': string;
    };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
}

export const DB_NAME = 'todo_app_db';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TodoDBSchema>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<TodoDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<TodoDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create tasks store if not exists
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-projectId', 'projectId', { unique: false });
          taskStore.createIndex('by-dueDate', 'dueDate', { unique: false });
          taskStore.createIndex('by-completed', 'completed', { unique: false });
          taskStore.createIndex('by-createdAt', 'createdAt', { unique: false });
          taskStore.createIndex('by-priority', 'priority', { unique: false });
        }

        // Create projects store if not exists
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-name', 'name', { unique: false });
          projectStore.createIndex('by-createdAt', 'createdAt', { unique: false });
        }

        // Create settings store if not exists
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export function closeDatabase(): void {
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {});
    dbPromise = null;
  }
}
