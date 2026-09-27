import { test, expect } from '@playwright/test';

test.describe('Tier 4: End-to-End Real-World Application Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('Scenario 1: Busy Professional Workday Overload, AI Guidance & Rebalancing', async ({ page }) => {
    const timestamp = Date.now();
    const tasks = [
      `Prepare Q3 board deck ${timestamp}`,
      `Review budget spreadsheet ${timestamp}`,
      `Team 1-on-1 performance review ${timestamp}`,
      `Client incident post-mortem ${timestamp}`,
    ];

    // 1. Create multiple high-priority work tasks for today
    for (const title of tasks) {
      await page.fill('[data-testid="quick-add-input"]', title);
      await page.press('[data-testid="quick-add-input"]', 'Enter');
      await page.waitForTimeout(100);
    }

    // 2. Verify all tasks render in UI
    for (const title of tasks) {
      await expect(page.locator('[data-testid^="task-title-"]', { hasText: title })).toBeVisible();
    }

    // 3. Inspect AI Assistant drawer for workload guidance
    const aiDrawerTrigger = page.locator('[data-testid="ai-drawer-trigger"]');
    if (await aiDrawerTrigger.isVisible()) {
      await aiDrawerTrigger.click();
      const drawer = page.locator('[data-testid="ai-drawer-panel"]');
      await expect(drawer).toBeVisible();

      // 4. Accept rescheduling recommendation if available
      const applyBtn = page.locator('[data-testid="ai-apply-reschedule-btn"], [data-testid^="recommendation-accept-"]').first();
      if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await applyBtn.click();
      }

      // Close drawer
      const closeBtn = page.locator('[data-testid="ai-drawer-close"], [aria-label="Close"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    // 5. Hard reload page to verify persistent schedule state
    await page.reload();
    await page.waitForSelector('[data-testid="app-root"]');

    // 6. Verify tasks are still intact
    for (const title of tasks) {
      await expect(page.locator('[data-testid^="task-title-"]', { hasText: title })).toBeVisible();
    }
  });

  test('Scenario 2: Project-Based Grocery & Personal Errands with Persistence', async ({ page }) => {
    const timestamp = Date.now();
    const groceryItems = [
      `Organic whole milk ${timestamp}`,
      `Sourdough bread ${timestamp}`,
      `Free-range eggs ${timestamp}`,
      `Fresh ground coffee ${timestamp}`,
    ];

    // 1. Create groceries project if custom project button exists
    const addProjectBtn = page.locator('[data-testid="add-project-btn"]');
    if (await addProjectBtn.isVisible()) {
      await addProjectBtn.click();
      const nameInput = page.locator('[data-testid="project-name-input"]');
      await nameInput.fill(`Groceries ${timestamp}`);
      await page.click('[data-testid="project-submit-btn"]');
      await expect(page.locator('[data-testid="project-name-input"]')).not.toBeVisible();
    }

    // 2. Add grocery items
    const quickInput = page.locator('[data-testid="quick-add-input"]');
    for (const item of groceryItems) {
      await expect(quickInput).toHaveValue('');
      await quickInput.fill(item);
      await quickInput.press('Enter');
      await expect(page.locator('[data-testid^="task-title-"]', { hasText: item })).toBeVisible();
    }

    // 3. Mark first two items as purchased (completed)
    for (let i = 0; i < 2; i++) {
      const itemTitle = groceryItems[i]!;
      const titleLoc = page.locator('[data-testid^="task-title-"]', { hasText: itemTitle });
      const itemRow = page.locator('[data-testid^="task-item-"]', { has: titleLoc });
      const checkbox = itemRow.locator('[data-testid^="task-checkbox-"]');
      await checkbox.click();
      await expect(titleLoc).toHaveClass(/line-through/);
    }

    // Wait for asynchronous IndexedDB transactions to persist to disk
    await page.waitForTimeout(500);

    // 4. Hard reload page (simulating browser close while in store)
    await page.reload();
    await page.waitForSelector('[data-testid="app-root"]');

    // 5. Verify completed items remain checked and incomplete items remain unchecked
    for (let i = 0; i < groceryItems.length; i++) {
      const itemTitle = groceryItems[i]!;
      const titleLoc = page.locator('[data-testid^="task-title-"]', { hasText: itemTitle });
      await expect(titleLoc).toBeVisible();

      if (i < 2) {
        await expect(titleLoc).toHaveClass(/line-through/);
      } else {
        await expect(titleLoc).not.toHaveClass(/line-through/);
      }
    }
  });

  test('Scenario 3: Bulk Task Lifecycle: Creation, Filter Inspection, Completion Spree, & Cleanup', async ({ page }) => {
    const timestamp = Date.now();
    const batchTasks = [
      `Sprint Task Alpha ${timestamp}`,
      `Sprint Task Beta ${timestamp}`,
      `Sprint Task Gamma ${timestamp}`,
    ];

    // 1. Add batch
    for (const t of batchTasks) {
      await page.fill('[data-testid="quick-add-input"]', t);
      await page.press('[data-testid="quick-add-input"]', 'Enter');
      await page.waitForTimeout(100);
    }

    // 2. Switch to All filter
    const filterAll = page.locator('[data-testid="filter-all"]');
    if (await filterAll.isVisible()) {
      await filterAll.click();
    }

    // 3. Complete all batch tasks
    for (const t of batchTasks) {
      const titleLoc = page.locator('[data-testid^="task-title-"]', { hasText: t });
      const itemRow = page.locator('[data-testid^="task-item-"]', { has: titleLoc });
      await itemRow.locator('[data-testid^="task-checkbox-"]').click();
      await expect(titleLoc).toHaveClass(/line-through/);
    }

    // 4. Delete the first completed task
    const firstTitleLoc = page.locator('[data-testid^="task-title-"]', { hasText: batchTasks[0]! });
    const firstRow = page.locator('[data-testid^="task-item-"]', { has: firstTitleLoc });
    await firstRow.locator('[data-testid^="task-delete-btn-"]').click();

    const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]');
    if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // 5. Verify first is gone, remaining two are still visible and completed
    await expect(firstTitleLoc).not.toBeVisible();
    await expect(page.locator('[data-testid^="task-title-"]', { hasText: batchTasks[1]! })).toBeVisible();
    await expect(page.locator('[data-testid^="task-title-"]', { hasText: batchTasks[2]! })).toBeVisible();
  });
});
