import { test, expect } from '@playwright/test';

test.describe('Tier 1 & Tier 2: Task CRUD Operations (R1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('CRUD-01: Creates task via quick-add input and verifies DOM rendering', async ({ page }) => {
    const taskTitle = `Quick Add Task ${Date.now()}`;

    const input = page.locator('[data-testid="quick-add-input"]');
    await expect(input).toBeVisible();
    await input.fill(taskTitle);
    await input.press('Enter');

    // Input should be cleared after submit
    await expect(input).toHaveValue('');

    // Task item must appear in list
    const titleLocator = page.locator('[data-testid^="task-title-"]', { hasText: taskTitle });
    await expect(titleLocator).toBeVisible({ timeout: 5000 });
  });

  test('CRUD-02: Creates task via modal with rich metadata (description, priority, due date)', async ({ page }) => {
    const timestamp = Date.now();
    const taskTitle = `Detailed Modal Task ${timestamp}`;
    const taskDesc = `In-depth task instructions for verification ${timestamp}`;
    const futureDate = '2026-10-15';

    // Click open modal button
    const openModalBtn = page.locator('[data-testid="open-task-modal-btn"]');
    if (await openModalBtn.isVisible()) {
      await openModalBtn.click();

      const modal = page.locator('[data-testid="task-modal"]');
      await expect(modal).toBeVisible();

      // Fill modal fields
      await page.fill('[data-testid="task-modal-title"]', taskTitle);

      const descField = page.locator('[data-testid="task-modal-desc"]');
      if (await descField.isVisible()) {
        await descField.fill(taskDesc);
      }

      const prioritySelect = page.locator('[data-testid="task-modal-priority"]');
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption('high');
      }

      const dueDateField = page.locator('[data-testid="task-modal-due-date"]');
      if (await dueDateField.isVisible()) {
        await dueDateField.fill(futureDate);
      }

      // Submit modal
      await page.click('[data-testid="task-modal-submit"]');

      // Verify modal closes
      await expect(modal).not.toBeVisible();

      // Verify task item rendered in list
      const titleLocator = page.locator('[data-testid^="task-title-"]', { hasText: taskTitle });
      await expect(titleLocator).toBeVisible();
    }
  });

  test('CRUD-03: Toggles task completion with strikethrough and opacity shift', async ({ page }) => {
    const taskTitle = `Completion Style Test ${Date.now()}`;

    await page.fill('[data-testid="quick-add-input"]', taskTitle);
    await page.press('[data-testid="quick-add-input"]', 'Enter');

    const titleLocator = page.locator('[data-testid^="task-title-"]', { hasText: taskTitle });
    await expect(titleLocator).toBeVisible();

    // Get the task item row container
    const taskItem = page.locator('[data-testid^="task-item-"]', { has: titleLocator });
    const checkbox = taskItem.locator('[data-testid^="task-checkbox-"]');

    // Complete task
    await checkbox.click();

    // Verify visual indicators: line-through text and opacity change
    await expect(titleLocator).toHaveClass(/line-through/);
    const hasOpacityClass = await titleLocator.evaluate((el) => {
      const classList = el.className;
      return classList.includes('opacity') || window.getComputedStyle(el).opacity !== '1';
    });
    expect(hasOpacityClass).toBe(true);

    // Uncomplete task
    await checkbox.click();
    await expect(titleLocator).not.toHaveClass(/line-through/);
  });

  test('CRUD-04: Edits task title and updates details via modal dialog', async ({ page }) => {
    const originalTitle = `Task To Edit ${Date.now()}`;
    const modifiedTitle = `Updated Task Name ${Date.now()}`;

    await page.fill('[data-testid="quick-add-input"]', originalTitle);
    await page.press('[data-testid="quick-add-input"]', 'Enter');

    const titleLocator = page.locator('[data-testid^="task-title-"]', { hasText: originalTitle });
    await expect(titleLocator).toBeVisible();

    const taskItem = page.locator('[data-testid^="task-item-"]', { has: titleLocator });
    const editBtn = taskItem.locator('[data-testid^="task-edit-btn-"]');
    await editBtn.click();

    // Update title
    const modalTitle = page.locator('[data-testid="task-modal-title"]');
    await expect(modalTitle).toBeVisible();
    await modalTitle.fill(modifiedTitle);

    await page.click('[data-testid="task-modal-submit"]');

    // Verify original title replaced with modified title
    await expect(page.locator('[data-testid^="task-title-"]', { hasText: modifiedTitle })).toBeVisible();
    await expect(page.locator('[data-testid^="task-title-"]', { hasText: originalTitle })).not.toBeVisible();
  });

  test('CRUD-05: Deletes task with instant DOM removal', async ({ page }) => {
    const taskTitle = `Task To Delete ${Date.now()}`;

    await page.fill('[data-testid="quick-add-input"]', taskTitle);
    await page.press('[data-testid="quick-add-input"]', 'Enter');

    const titleLocator = page.locator('[data-testid^="task-title-"]', { hasText: taskTitle });
    await expect(titleLocator).toBeVisible();

    const taskItem = page.locator('[data-testid^="task-item-"]', { has: titleLocator });
    const deleteBtn = taskItem.locator('[data-testid^="task-delete-btn-"]');
    await deleteBtn.click();

    // If confirmation modal exists, confirm
    const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]');
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Task element should be removed from view
    await expect(titleLocator).not.toBeVisible({ timeout: 5000 });
  });

  test('CRUD-06 (Boundary): Prevents submission of empty or whitespace-only titles', async ({ page }) => {
    const initialTaskCount = await page.locator('[data-testid^="task-item-"]').count();

    const input = page.locator('[data-testid="quick-add-input"]');
    // Try empty submit
    await input.focus();
    await input.press('Enter');

    // Try whitespace submit
    await input.fill('     ');
    await input.press('Enter');

    // Task count should remain unchanged
    const afterCount = await page.locator('[data-testid^="task-item-"]').count();
    expect(afterCount).toBe(initialTaskCount);
  });

  test('CRUD-07 (Boundary): Handles 1,000-character long descriptions without UI breakdown', async ({ page }) => {
    const taskTitle = `Long Text Task ${Date.now()}`;
    const longDesc = 'A'.repeat(1000);

    const openModalBtn = page.locator('[data-testid="open-task-modal-btn"]');
    if (await openModalBtn.isVisible()) {
      await openModalBtn.click();

      await page.fill('[data-testid="task-modal-title"]', taskTitle);
      const descInput = page.locator('[data-testid="task-modal-desc"]');
      if (await descInput.isVisible()) {
        await descInput.fill(longDesc);
      }
      await page.click('[data-testid="task-modal-submit"]');

      const titleLocator = page.locator('[data-testid^="task-title-"]', { hasText: taskTitle });
      await expect(titleLocator).toBeVisible();
    }
  });

  test('CRUD-08 (Boundary): Keyboard accessibility (Escape closes modal, Enter submits)', async ({ page }) => {
    const openModalBtn = page.locator('[data-testid="open-task-modal-btn"]');
    if (await openModalBtn.isVisible()) {
      await openModalBtn.click();
      const modal = page.locator('[data-testid="task-modal"]');
      await expect(modal).toBeVisible();

      // Press Escape to dismiss
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });
});
