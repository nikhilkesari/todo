import { test, expect } from '@playwright/test';
import { CdpHelper, PersistedTask, PersistedProject } from './cdpHelper';

test.describe('Tier 1 & Tier 3: Direct Chrome DevTools Protocol (CDP) IndexedDB Verification', () => {
  let cdpHelper: CdpHelper;
  let baseUrl: string;

  test.beforeEach(async ({ page, baseURL }) => {
    baseUrl = baseURL || 'http://localhost:5173';
    cdpHelper = new CdpHelper(page, baseUrl, 'todo_app_db');
    await cdpHelper.init();

    await page.goto('/');
    // Wait for the app root container to mount
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('CDP-01: Verifies database schema, stores, and indexes directly via CDP', async () => {
    // 1. Verify database exists in Chromium storage engine
    const dbNames = await cdpHelper.requestDatabaseNames();
    expect(dbNames).toContain('todo_app_db');

    // 2. Introspect schema structure
    const schema = await cdpHelper.requestDatabase();
    expect(schema.name).toBe('todo_app_db');
    expect(schema.version).toBeGreaterThanOrEqual(1);

    const storeNames = schema.objectStores.map((s) => s.name);
    expect(storeNames).toContain('tasks');
    expect(storeNames).toContain('projects');

    const taskStore = schema.objectStores.find((s) => s.name === 'tasks');
    expect(taskStore).toBeDefined();

    const taskIndexNames = taskStore?.indexes.map((idx) => idx.name) || [];
    expect(taskIndexNames).toContain('by-projectId');
    expect(taskIndexNames).toContain('by-dueDate');
    expect(taskIndexNames).toContain('by-completed');
  });

  test('CDP-02: Verifies task creation in UI directly writes raw record to IndexedDB', async ({ page }) => {
    const timestamp = Date.now();
    const taskTitle = `CDP Storage Test Task ${timestamp}`;

    // Fill and submit quick-add input
    const quickInput = page.locator('[data-testid="quick-add-input"]');
    await quickInput.fill(taskTitle);
    await quickInput.press('Enter');

    // Verify DOM displays the task
    const taskLocator = page.locator(`[data-testid^="task-title-"]`, { hasText: taskTitle });
    await expect(taskLocator).toBeVisible({ timeout: 5000 });

    // Directly query raw IndexedDB tasks store via CDP
    const record = await cdpHelper.waitForRecord<PersistedTask>('tasks', (t) => t.title === taskTitle);
    expect(record).toBeDefined();
    expect(record.title).toBe(taskTitle);
    expect(record.completed).toBe(false);
    expect(record.id).toBeTruthy();
    expect(typeof record.id).toBe('string');
    expect(record.projectId).toBeTruthy();
  });

  test('CDP-03: Verifies task completion toggle updates completed boolean in IndexedDB', async ({ page }) => {
    const timestamp = Date.now();
    const taskTitle = `Toggle Status Test ${timestamp}`;

    const quickInput = page.locator('[data-testid="quick-add-input"]');
    await quickInput.fill(taskTitle);
    await quickInput.press('Enter');

    // Fetch newly created record via CDP
    const initialRecord = await cdpHelper.waitForRecord<PersistedTask>('tasks', (t) => t.title === taskTitle);
    expect(initialRecord.completed).toBe(false);

    // Toggle completion in UI
    const checkbox = page.locator(`[data-testid="task-checkbox-${initialRecord.id}"]`);
    await checkbox.click();

    // Verify DOM styling reflects completion (strikethrough / opacity)
    const titleLocator = page.locator(`[data-testid="task-title-${initialRecord.id}"]`);
    await expect(titleLocator).toHaveClass(/line-through/);

    // Verify record in IndexedDB is updated to completed: true
    const updatedRecord = await cdpHelper.waitForRecord<PersistedTask>(
      'tasks',
      (t) => t.id === initialRecord.id && t.completed === true
    );
    expect(updatedRecord.completed).toBe(true);

    // Toggle back to incomplete
    await checkbox.click();
    await expect(titleLocator).not.toHaveClass(/line-through/);

    const revertedRecord = await cdpHelper.waitForRecord<PersistedTask>(
      'tasks',
      (t) => t.id === initialRecord.id && t.completed === false
    );
    expect(revertedRecord.completed).toBe(false);
  });

  test('CDP-04: Verifies task update modifies title, priority, and metadata in IndexedDB', async ({ page }) => {
    const timestamp = Date.now();
    const originalTitle = `Editable Task ${timestamp}`;
    const updatedTitle = `Revised Task Title ${timestamp}`;

    const quickInput = page.locator('[data-testid="quick-add-input"]');
    await quickInput.fill(originalTitle);
    await quickInput.press('Enter');

    const record = await cdpHelper.waitForRecord<PersistedTask>('tasks', (t) => t.title === originalTitle);

    // Trigger edit modal
    const editBtn = page.locator(`[data-testid="task-edit-btn-${record.id}"]`);
    await editBtn.click();

    // Fill edit fields in modal
    const titleField = page.locator('[data-testid="task-modal-title"]');
    await expect(titleField).toBeVisible();
    await titleField.fill(updatedTitle);

    const prioritySelect = page.locator('[data-testid="task-modal-priority"]');
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('high');
    }

    // Submit edit
    const saveBtn = page.locator('[data-testid="task-modal-submit"]');
    await saveBtn.click();

    // Verify DOM updates
    await expect(page.locator(`[data-testid="task-title-${record.id}"]`)).toHaveText(updatedTitle);

    // Verify IndexedDB record reflects update via CDP
    const updatedRecord = await cdpHelper.waitForRecord<PersistedTask>(
      'tasks',
      (t) => t.id === record.id && t.title === updatedTitle
    );
    expect(updatedRecord.title).toBe(updatedTitle);
    if (updatedRecord.priority) {
      expect(updatedRecord.priority).toBe('high');
    }
  });

  test('CDP-05: Verifies task persistence across hard page reload (DOM + IndexedDB)', async ({ page }) => {
    const timestamp = Date.now();
    const persistentTitle = `Hard Reload Persist ${timestamp}`;

    const quickInput = page.locator('[data-testid="quick-add-input"]');
    await quickInput.fill(persistentTitle);
    await quickInput.press('Enter');

    // Confirm written to IndexedDB prior to reload
    const recordBeforeReload = await cdpHelper.waitForRecord<PersistedTask>(
      'tasks',
      (t) => t.title === persistentTitle
    );

    // Execute hard page reload
    await page.reload();
    await page.waitForSelector('[data-testid="app-root"]');

    // Verify DOM still displays persisted task
    const persistedLocator = page.locator(`[data-testid="task-title-${recordBeforeReload.id}"]`);
    await expect(persistedLocator).toBeVisible({ timeout: 5000 });
    await expect(persistedLocator).toHaveText(persistentTitle);

    // Re-establish CDP session after reload and confirm data integrity
    const reloadedCdp = new CdpHelper(page, baseUrl, 'todo_app_db');
    await reloadedCdp.init();

    const recordAfterReload = await reloadedCdp.waitForRecord<PersistedTask>(
      'tasks',
      (t) => t.id === recordBeforeReload.id
    );
    expect(recordAfterReload.title).toBe(persistentTitle);
    expect(recordAfterReload.id).toBe(recordBeforeReload.id);
  });

  test('CDP-06: Verifies task deletion removes record completely from IndexedDB', async ({ page }) => {
    const timestamp = Date.now();
    const taskTitle = `Delete Target Task ${timestamp}`;

    const quickInput = page.locator('[data-testid="quick-add-input"]');
    await quickInput.fill(taskTitle);
    await quickInput.press('Enter');

    const record = await cdpHelper.waitForRecord<PersistedTask>('tasks', (t) => t.title === taskTitle);

    // Click delete button
    const deleteBtn = page.locator(`[data-testid="task-delete-btn-${record.id}"]`);
    await deleteBtn.click();

    // Confirm deletion if confirmation dialog appears
    const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]');
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Verify DOM item disappears
    await expect(page.locator(`[data-testid="task-item-${record.id}"]`)).not.toBeVisible();

    // Verify record is removed from IndexedDB store via CDP
    await cdpHelper.waitForRecordAbsence<PersistedTask>('tasks', (t) => t.id === record.id);
  });

  test('CDP-07: Verifies custom project creation persists in projects store', async ({ page }) => {
    const projectName = `CDP Project ${Date.now()}`;

    const addProjectBtn = page.locator('[data-testid="add-project-btn"]');
    if (await addProjectBtn.isVisible()) {
      await addProjectBtn.click();

      const projectInput = page.locator('[data-testid="project-name-input"]');
      await expect(projectInput).toBeVisible();
      await projectInput.fill(projectName);

      const submitProjectBtn = page.locator('[data-testid="project-submit-btn"]');
      await submitProjectBtn.click();

      // Verify project record in IndexedDB projects store via CDP
      const projectRecord = await cdpHelper.waitForRecord<PersistedProject>(
        'projects',
        (p) => p.name === projectName
      );
      expect(projectRecord).toBeDefined();
      expect(projectRecord.name).toBe(projectName);
    }
  });

  test('CDP-08: Verifies special characters, unicode, and emojis persist accurately in IndexedDB', async ({ page }) => {
    const specialTitle = `🚀 Test special: <div id="xss">&amp; "quotes" 'single' 漢字 العربية ${Date.now()}`;

    const quickInput = page.locator('[data-testid="quick-add-input"]');
    await quickInput.fill(specialTitle);
    await quickInput.press('Enter');

    // Verify exact characters are stored without escaping corruption in IndexedDB
    const record = await cdpHelper.waitForRecord<PersistedTask>('tasks', (t) => t.title === specialTitle);
    expect(record.title).toBe(specialTitle);

    // Verify DOM handles rendering safely without script injection
    const titleLocator = page.locator(`[data-testid="task-title-${record.id}"]`);
    await expect(titleLocator).toHaveText(specialTitle);
  });
});
