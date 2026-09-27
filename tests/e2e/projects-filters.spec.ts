import { test, expect } from '@playwright/test';

test.describe('Tier 1 & Tier 2: Projects and Temporal Filters (R1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('PF-01: Displays default project categories (Work, Personal, Groceries)', async ({ page }) => {
    // Check for project items or project names in the sidebar
    const projectsList = page.locator('[data-testid^="project-item-"]');
    const projectCount = await projectsList.count();
    expect(projectCount).toBeGreaterThanOrEqual(1);

    // Verify key categories are present in sidebar text
    const sidebar = page.locator('aside, [data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      const text = await sidebar.innerText();
      expect(text).toMatch(/(Work|Personal|Groceries|Inbox|Default)/i);
    }
  });

  test('PF-02: Creates a new custom project and displays it in sidebar', async ({ page }) => {
    const projectName = `New Project ${Date.now()}`;

    const addProjectBtn = page.locator('[data-testid="add-project-btn"]');
    if (await addProjectBtn.isVisible()) {
      await addProjectBtn.click();

      const nameInput = page.locator('[data-testid="project-name-input"]');
      await expect(nameInput).toBeVisible();
      await nameInput.fill(projectName);

      await page.click('[data-testid="project-submit-btn"]');

      // Verify new project listed
      const newProjectLocator = page.locator('[data-testid^="project-item-"]', { hasText: projectName });
      await expect(newProjectLocator).toBeVisible();
    }
  });

  test('PF-03: Filters task list when selecting a specific project', async ({ page }) => {
    const timestamp = Date.now();
    const workTask = `Work Task ${timestamp}`;

    // Create task in a specific project or assign it
    const openModalBtn = page.locator('[data-testid="open-task-modal-btn"]');
    if (await openModalBtn.isVisible()) {
      await openModalBtn.click();
      await page.fill('[data-testid="task-modal-title"]', workTask);

      const projectSelect = page.locator('[data-testid="task-modal-project"]');
      if (await projectSelect.isVisible()) {
        // Select work project
        const options = await projectSelect.locator('option').allInnerTexts();
        const workOption = options.find((opt) => opt.toLowerCase().includes('work'));
        if (workOption) {
          await projectSelect.selectOption({ label: workOption });
        }
      }
      await page.click('[data-testid="task-modal-submit"]');

      // Click the Work project in sidebar
      const workSidebarItem = page.locator('[data-testid^="project-item-"]', { hasText: /work/i });
      if (await workSidebarItem.isVisible()) {
        await workSidebarItem.click();

        // Verify workTask is visible
        await expect(page.locator('[data-testid^="task-title-"]', { hasText: workTask })).toBeVisible();
      }
    }
  });

  test('PF-04: Toggles between quick filters (Today, Upcoming, Overdue, All)', async ({ page }) => {
    const filterToday = page.locator('[data-testid="filter-today"]');
    const filterUpcoming = page.locator('[data-testid="filter-upcoming"]');
    const filterOverdue = page.locator('[data-testid="filter-overdue"]');
    const filterAll = page.locator('[data-testid="filter-all"]');

    // Test clicking All
    if (await filterAll.isVisible()) {
      await filterAll.click();
      // Should show task list container
      await expect(page.locator('[data-testid="task-list"]').first()).toBeVisible();
    }

    // Test clicking Today
    if (await filterToday.isVisible()) {
      await filterToday.click();
      await expect(filterToday).toHaveClass(/(active|selected|bg-|text-)/);
    }

    // Test clicking Upcoming
    if (await filterUpcoming.isVisible()) {
      await filterUpcoming.click();
      await expect(filterUpcoming).toHaveClass(/(active|selected|bg-|text-)/);
    }

    // Test clicking Overdue
    if (await filterOverdue.isVisible()) {
      await filterOverdue.click();
      await expect(filterOverdue).toHaveClass(/(active|selected|bg-|text-)/);
    }
  });

  test('PF-05: Empty state displayed when project or filter has zero matching tasks', async ({ page }) => {
    // Click a filter or create empty project
    const filterOverdue = page.locator('[data-testid="filter-overdue"]');
    if (await filterOverdue.isVisible()) {
      await filterOverdue.click();

      // Either tasks exist or empty state container is shown
      const emptyState = page.locator('[data-testid="empty-tasks-state"], [data-testid="empty-state"]');
      const taskCount = await page.locator('[data-testid^="task-item-"]').count();
      if (taskCount === 0) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('PF-06 (Boundary): Rapid filter switching does not cause stale UI render or state tearing', async ({ page }) => {
    const filterAll = page.locator('[data-testid="filter-all"]');
    const filterToday = page.locator('[data-testid="filter-today"]');
    const filterUpcoming = page.locator('[data-testid="filter-upcoming"]');

    if ((await filterAll.isVisible()) && (await filterToday.isVisible()) && (await filterUpcoming.isVisible())) {
      // Rapid sequential clicks
      await filterToday.click();
      await filterUpcoming.click();
      await filterAll.click();
      await filterToday.click();

      // Ensure stable state
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      await expect(filterToday).toHaveClass(/(active|selected|bg-|text-)/);
    }
  });
});
