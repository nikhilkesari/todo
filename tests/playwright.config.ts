import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E and Chrome DevTools Protocol (CDP) Test Configuration.
 * 
 * Configured specifically for:
 * 1. Headless Chromium / Chrome with direct CDP session access
 * 2. Sequential single-worker execution (workers: 1) to prevent IndexedDB multi-context lock collisions
 * 3. Vite development / preview server lifecycle automation
 */
export default defineConfig({
  testDir: './',
  testMatch: ['**/*.spec.ts'],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker avoids database lock contention in browser IndexedDB
  reporter: [
    ['list'],
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-cdp',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
        launchOptions: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--headless=new',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
