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
let closePromise: Promise<void> | null = null;

export async function getDatabase(): Promise<IDBPDatabase<TodoDBSchema>> {
  // If a database shutdown is currently underway, wait for it to complete
  if (closePromise) {
    await closePromise;
  }

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
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function closeDatabase(): Promise<void> {
  // If already closing, return the in-flight close promise
  if (closePromise) {
    return closePromise;
  }

  if (!dbPromise) {
    return;
  }

  const currentDbPromise = dbPromise;
  dbPromise = null;

  closePromise = (async () => {
    try {
      const db = await currentDbPromise;
      db.close();
    } catch {
      // Ignore open or abort errors during teardown
    } finally {
      closePromise = null;
    }
  })();

  return closePromise;
}
