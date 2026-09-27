import { Page, CDPSession } from '@playwright/test';

/**
 * Interface representing the database schema descriptor returned by CDP IndexedDB domain.
 */
export interface CdpDatabaseSchema {
  name: string;
  version: number;
  objectStores: Array<{
    name: string;
    keyPath: string | string[];
    autoIncrement: boolean;
    indexes: Array<{
      name: string;
      keyPath: string | string[];
      unique: boolean;
      multiEntry: boolean;
    }>;
  }>;
}

/**
 * Interface for task records persisted in IndexedDB.
 */
export interface PersistedTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  projectId: string;
  priority: 'low' | 'medium' | 'high';
  complexity?: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface for project records persisted in IndexedDB.
 */
export interface PersistedProject {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  createdAt?: string;
}

/**
 * Direct Chrome DevTools Protocol (CDP) Helper.
 * 
 * Interacts directly with Chromium's backend storage engine beneath the DOM layer,
 * verifying raw byte-level IndexedDB transactions on disk.
 */
export class CdpHelper {
  private page: Page;
  private cdpSession: CDPSession | null = null;
  private securityOrigin: string;
  private databaseName: string;

  constructor(page: Page, securityOrigin = 'http://localhost:5173', databaseName = 'todo_app_db') {
    this.page = page;
    this.securityOrigin = securityOrigin;
    this.databaseName = databaseName;
  }

  /**
   * Initializes the CDP session and enables the IndexedDB domain.
   */
  async init(): Promise<CDPSession> {
    this.cdpSession = await this.page.context().newCDPSession(this.page);
    await this.cdpSession.send('IndexedDB.enable');
    return this.cdpSession;
  }

  /**
   * Returns the underlying CDPSession instance.
   */
  getSession(): CDPSession {
    if (!this.cdpSession) {
      throw new Error('CDP session has not been initialized. Call init() first.');
    }
    return this.cdpSession;
  }

  /**
   * Sets or updates the security origin for IndexedDB queries.
   */
  setOrigin(origin: string): void {
    this.securityOrigin = origin;
  }

  /**
   * Queries list of all IndexedDB database names under the current security origin.
   * Uses CDP method: IndexedDB.requestDatabaseNames
   */
  async requestDatabaseNames(): Promise<string[]> {
    const session = this.getSession();
    const result = await session.send('IndexedDB.requestDatabaseNames', {
      securityOrigin: this.securityOrigin,
    }) as { databaseNames: string[] };

    return result.databaseNames || [];
  }

  /**
   * Queries metadata for a specific object store (e.g. entry count and key generator value).
   * Uses CDP method: IndexedDB.getMetadata
   */
  async getMetadata(objectStoreName: string): Promise<{ entriesCount: number; keyGeneratorValue: number }> {
    const session = this.getSession();
    const result = await session.send('IndexedDB.getMetadata', {
      securityOrigin: this.securityOrigin,
      databaseName: this.databaseName,
      objectStoreName,
    }) as { entriesCount: number; keyGeneratorValue: number };

    return result;
  }

  /**
   * Queries the full database structure, object stores, and indexes.
   * Uses CDP method: IndexedDB.requestDatabase
   */
  async requestDatabase(): Promise<CdpDatabaseSchema> {
    const session = this.getSession();
    const result = await session.send('IndexedDB.requestDatabase', {
      securityOrigin: this.securityOrigin,
      databaseName: this.databaseName,
    }) as { databaseWithObjectStores: CdpDatabaseSchema };

    return result.databaseWithObjectStores;
  }

  /**
   * Retrieves raw deserialized entries directly from the specified object store.
   * Uses CDP method: IndexedDB.requestData
   * Handles RemoteObject serialization and runtime resolution.
   */
  async requestData<T = unknown>(
    objectStoreName: string,
    pageSize = 200,
    indexName?: string
  ): Promise<T[]> {
    const session = this.getSession();
    const params: Record<string, unknown> = {
      securityOrigin: this.securityOrigin,
      databaseName: this.databaseName,
      objectStoreName,
      skipCount: 0,
      pageSize,
    };
    if (indexName && indexName.trim().length > 0) {
      params.indexName = indexName;
    }
    const result = (await session.send('IndexedDB.requestData', params)) as {
      objectStoreDataEntries: Array<{
        key: { value?: unknown };
        primaryKey: { value?: unknown };
        value: { value?: unknown; objectId?: string; type?: string; description?: string };
      }>;
      hasMore: boolean;
    };

    const entries = result.objectStoreDataEntries || [];
    const items: T[] = [];

    for (const entry of entries) {
      if (entry.value.value !== undefined) {
        items.push(entry.value.value as T);
      } else if (entry.value.objectId) {
        // Resolve objectId via Runtime evaluation to parse JSON structure safely
        const evalResult = await session.send('Runtime.callFunctionOn', {
          objectId: entry.value.objectId,
          functionDeclaration: 'function() { return JSON.parse(JSON.stringify(this)); }',
          returnByValue: true,
        }) as { result: { value: T } };

        if (evalResult.result && evalResult.result.value !== undefined) {
          items.push(evalResult.result.value);
        }
      }
    }

    return items;
  }

  /**
   * Deterministic polling helper waiting for a record in the objectStore to satisfy a predicate.
   * Replaces brittle static sleep() calls with active condition polling.
   */
  async waitForRecord<T>(
    objectStoreName: string,
    predicate: (record: T) => boolean,
    timeoutMs = 6000,
    intervalMs = 100
  ): Promise<T> {
    const start = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - start < timeoutMs) {
      try {
        const records = await this.requestData<T>(objectStoreName);
        const match = records.find(predicate);
        if (match) {
          return match;
        }
      } catch (err) {
        lastError = err as Error;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for matching record in store '${objectStoreName}'. Last error: ${lastError?.message || 'none'}`
    );
  }

  /**
   * Asserts that a record matching the predicate does NOT exist, polling until timeout.
   */
  async waitForRecordAbsence<T>(
    objectStoreName: string,
    predicate: (record: T) => boolean,
    timeoutMs = 4000,
    intervalMs = 100
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const records = await this.requestData<T>(objectStoreName);
      const match = records.find(predicate);
      if (!match) {
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(
      `Record still unexpectedly present in store '${objectStoreName}' after ${timeoutMs}ms`
    );
  }

  /**
   * Clears all entries from the specified object store.
   * Uses CDP method: IndexedDB.clearObjectStore
   */
  async clearObjectStore(objectStoreName: string): Promise<void> {
    const session = this.getSession();
    await session.send('IndexedDB.clearObjectStore', {
      securityOrigin: this.securityOrigin,
      databaseName: this.databaseName,
      objectStoreName,
    });
  }

  /**
   * Deletes the entire IndexedDB database for complete test isolation.
   * Uses CDP method: IndexedDB.deleteDatabase
   */
  async deleteDatabase(): Promise<void> {
    const session = this.getSession();
    await session.send('IndexedDB.deleteDatabase', {
      securityOrigin: this.securityOrigin,
      databaseName: this.databaseName,
    });
  }
}

/**
 * Factory helper to construct and initialize a CdpHelper instance.
 */
export async function createCdpHelper(
  page: Page,
  origin = 'http://localhost:5173',
  dbName = 'todo_app_db'
): Promise<CdpHelper> {
  const helper = new CdpHelper(page, origin, dbName);
  await helper.init();
  return helper;
}
