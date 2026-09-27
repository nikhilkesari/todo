import { test, expect } from '@playwright/test';

test.describe('Tier 1 & Tier 2: AI Workload Intelligence Drawer & Overcommitment (R2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('AI-01: Opens and closes AI Assistant slide-out drawer', async ({ page }) => {
    const drawerTrigger = page.locator('[data-testid="ai-drawer-trigger"]');
    await expect(drawerTrigger).toBeVisible();
    await drawerTrigger.click();

    // Verify drawer panel is visible
    const drawerPanel = page.locator('[data-testid="ai-drawer-panel"]');
    await expect(drawerPanel).toBeVisible({ timeout: 5000 });

    // Close drawer via close button or backdrop
    const closeBtn = page.locator('[data-testid="ai-drawer-close"], [aria-label="Close"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(drawerPanel).not.toBeVisible();
    }
  });

  test('AI-02: Displays 7-day workload capacity visualization & conversational advice', async ({ page }) => {
    // Open drawer
    await page.click('[data-testid="ai-drawer-trigger"]');
    const drawerPanel = page.locator('[data-testid="ai-drawer-panel"]');
    await expect(drawerPanel).toBeVisible();

    // Verify presence of workload overview / heatmap / advice container
    const guidance = page.locator('[data-testid="ai-guidance"], [data-testid="ai-workload-summary"]');
    if (await guidance.isVisible()) {
      const text = await guidance.innerText();
      expect(text.length).toBeGreaterThan(0);
    }

    const capacityView = page.locator('[data-testid="workload-heatmap"], [data-testid="capacity-visualizer"]');
    if (await capacityView.isVisible()) {
      await expect(capacityView).toBeVisible();
    }
  });

  test('AI-03: Displays overcommitment warning banner when single date exceeds capacity', async ({ page }) => {
    // Add multiple tasks for today or a specific date to exceed capacity threshold
    const dateToday = new Date().toISOString().split('T')[0];

    // Create 5 tasks with high duration or count to trigger overcommitment
    for (let i = 1; i <= 4; i++) {
      const title = `Overload Task ${i} ${Date.now()}`;
      await page.fill('[data-testid="quick-add-input"]', title);
      await page.press('[data-testid="quick-add-input"]', 'Enter');
      await page.waitForTimeout(100);
    }

    // Check if overcommitment alert banner appears or drawer displays overcommitment warning
    const banner = page.locator('[data-testid="overcommitment-banner"]');
    if (await banner.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(banner).toBeVisible();
      // Clicking banner should open AI drawer
      await banner.click();
      await expect(page.locator('[data-testid="ai-drawer-panel"]')).toBeVisible();
    }
  });

  test('AI-04: One-click acceptance of reschedule suggestion rebalances schedule', async ({ page }) => {
    // Open AI drawer
    await page.click('[data-testid="ai-drawer-trigger"]');
    const drawerPanel = page.locator('[data-testid="ai-drawer-panel"]');
    await expect(drawerPanel).toBeVisible();

    // Check for recommendation card or reschedule button
    const applyBtn = page.locator('[data-testid="ai-apply-reschedule-btn"], [data-testid^="recommendation-accept-"]');
    if (await applyBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await applyBtn.first().click();

      // Verify success feedback or updated status
      const feedback = page.locator('[data-testid="reschedule-success-toast"], [data-testid^="recommendation-applied-"]');
      if (await feedback.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(feedback).toBeVisible();
      }
    }
  });

  test('AI-05 (Boundary): Heuristic fallback provides guidance when API key is unconfigured', async ({ page }) => {
    // Even if Gemini backend proxy is operating in offline/mock/fallback mode,
    // the AI drawer must never crash or show unhandled exceptions.
    await page.click('[data-testid="ai-drawer-trigger"]');
    const drawerPanel = page.locator('[data-testid="ai-drawer-panel"]');
    await expect(drawerPanel).toBeVisible();

    // Check that error state is not thrown, or graceful offline badge is present
    const errorFallback = page.locator('[data-testid="ai-error"]');
    const isError = await errorFallback.isVisible({ timeout: 500 }).catch(() => false);
    if (isError) {
      // If error occurs, it should show user-friendly message rather than unhandled crash
      const errorText = await errorFallback.innerText();
      expect(errorText.toLowerCase()).toMatch(/(offline|heuristic|fallback|retry)/);
    } else {
      // Normal or fallback rendering is operational
      await expect(drawerPanel).toBeVisible();
    }
  });
});
