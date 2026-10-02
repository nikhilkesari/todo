import { test, expect } from '@playwright/test';

test.describe('Voice Conversational Task Creator (One-Click Human-like AI)', () => {
  test.beforeEach(async ({ page }) => {
    // Stub SpeechSynthesis and SpeechRecognition in headless environment for fast, deterministic execution
    await page.addInitScript(() => {
      if (typeof window !== 'undefined') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
            setTimeout(() => {
              if (typeof utterance.onstart === 'function') {
                utterance.onstart(new Event('start') as SpeechSynthesisEvent);
              }
              setTimeout(() => {
                if (typeof utterance.onend === 'function') {
                  utterance.onend(new Event('end') as SpeechSynthesisEvent);
                }
              }, 50);
            }, 10);
          };
        }

        // Mock navigator.mediaDevices.getUserMedia in test environment
        if (navigator.mediaDevices) {
          navigator.mediaDevices.getUserMedia = async () => ({
            getTracks: () => [{ stop: () => {} }],
          } as any);
        }

        class MockSpeechRecognition {
          continuous = true;
          interimResults = true;
          lang = 'en-US';
          onstart: (() => void) | null = null;
          onend: (() => void) | null = null;
          onerror: ((e: unknown) => void) | null = null;
          onresult: ((e: unknown) => void) | null = null;
          start() {
            setTimeout(() => {
              this.onstart?.();
            }, 10);
          }
          stop() {
            setTimeout(() => {
              this.onend?.();
            }, 10);
          }
          abort() {
            setTimeout(() => {
              this.onend?.();
            }, 10);
          }
        }
        (window as any).SpeechRecognition = MockSpeechRecognition;
        (window as any).webkitSpeechRecognition = MockSpeechRecognition;
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('VOICE-01: Opens voice task creator via one-click header mic and quick-add mic', async ({ page }) => {
    // 1. Click header voice button
    const headerVoiceBtn = page.locator('[data-testid="voice-task-trigger"]');
    await expect(headerVoiceBtn).toBeVisible();
    await headerVoiceBtn.click();

    // Verify modal appears
    const modal = page.locator('[data-testid="voice-task-modal"]');
    await expect(modal).toBeVisible();

    // Close modal
    const closeBtn = page.locator('[data-testid="close-voice-modal-btn"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    // 2. Click quick-add voice button
    const quickAddVoiceBtn = page.locator('[data-testid="quick-add-voice-btn"]');
    await expect(quickAddVoiceBtn).toBeVisible();
    await quickAddVoiceBtn.click();
    await expect(modal).toBeVisible();

    // Close again
    await page.click('[data-testid="close-voice-modal-btn"]');
    await expect(modal).not.toBeVisible();
  });

  test('VOICE-02: Displays visualizer, greeting message, and controls', async ({ page }) => {
    await page.click('[data-testid="voice-task-trigger"]');
    const modal = page.locator('[data-testid="voice-task-modal"]');
    await expect(modal).toBeVisible();

    // Messages container should contain greeting
    const messages = page.locator('[data-testid="voice-messages-container"]');
    await expect(messages).toBeVisible();
    await expect(messages).toContainText('What can I help you add', { timeout: 5000 });

    // Central mic toggle button
    const micToggle = page.locator('[data-testid="toggle-voice-mic-btn"]');
    await expect(micToggle).toBeVisible();

    // Reset button
    const resetBtn = page.locator('[data-testid="reset-voice-btn"]');
    await expect(resetBtn).toBeVisible();

    // Text input fallback
    const input = page.locator('[data-testid="voice-modal-text-input"]');
    await expect(input).toBeVisible();
  });

  test('VOICE-03: Creates task conversationally and verifies immediate IndexedDB persistence & UI update', async ({ page }) => {
    const uniqueTitle = `Voice Task ${Date.now()}`;

    // Open voice modal
    await page.click('[data-testid="voice-task-trigger"]');
    await expect(page.locator('[data-testid="voice-task-modal"]')).toBeVisible();

    // Send initial task request via conversational input
    const input = page.locator('[data-testid="voice-modal-text-input"]');
    await input.fill(`I want to ${uniqueTitle} tomorrow under Personal`);
    await input.press('Enter');

    // Assistant responds and extracted task preview card appears
    const preview = page.locator('[data-testid="voice-task-preview"]');
    await expect(preview).toBeVisible({ timeout: 10000 });
    await expect(preview).toContainText(uniqueTitle);

    // Assistant asks for confirmation, user confirms via text
    await input.fill('Yes, sounds good, please add it!');
    await input.press('Enter');

    // Verify completion status badge
    await expect(page.locator('text=Task Saved!')).toBeVisible({ timeout: 10000 });

    // Close modal
    await page.click('[data-testid="close-voice-modal-btn"]');
    await expect(page.locator('[data-testid="voice-task-modal"]')).not.toBeVisible();

    // Task must appear reactively in the task list
    const taskItem = page.locator('[data-testid^="task-title-"]', { hasText: uniqueTitle });
    await expect(taskItem).toBeVisible({ timeout: 5000 });

    // Wait for async IndexedDB write to settle
    await page.waitForTimeout(300);

    // Reload page and confirm task persists from IndexedDB
    await page.reload();
    await page.waitForSelector('[data-testid="app-root"]');
    const persistedTask = page.locator('[data-testid^="task-title-"]', { hasText: uniqueTitle });
    await expect(persistedTask).toBeVisible({ timeout: 5000 });
  });

  test('VOICE-04: Multi-turn conversation clarifies missing due date & project, then creates task', async ({ page }) => {
    const taskTitle = `Multi Turn Project ${Date.now()}`;

    await page.click('[data-testid="voice-task-trigger"]');
    const input = page.locator('[data-testid="voice-modal-text-input"]');

    // Turn 1: User gives title only without date or project
    await input.fill(`Please create a task to ${taskTitle}`);
    await input.press('Enter');

    // Assistant should ask a clarifying question about when to do it
    const messages = page.locator('[data-testid="voice-messages-container"]');
    await expect(messages).toContainText('When would you like to get that done', { timeout: 10000 });

    // Turn 2: User responds to clarification with date and project
    await input.fill('Tomorrow under Work with high priority');
    await input.press('Enter');

    // Task preview should show updated project and date
    const preview = page.locator('[data-testid="voice-task-preview"]');
    await expect(preview).toBeVisible({ timeout: 10000 });
    await expect(preview).toContainText(taskTitle);

    // One-click confirmation button in preview
    const confirmBtn = page.locator('[data-testid="confirm-voice-task-btn"]');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Wait for saved indicator
    await expect(page.locator('text=Task Saved!')).toBeVisible({ timeout: 10000 });

    // Close modal
    await page.click('[data-testid="close-voice-modal-btn"]');

    // Task must appear in task list
    const createdTask = page.locator('[data-testid^="task-title-"]', { hasText: taskTitle });
    await expect(createdTask).toBeVisible({ timeout: 5000 });
  });

  test('VOICE-05: Handles cancellation without creating task', async ({ page }) => {
    const cancelTitle = `Never Add This Task ${Date.now()}`;

    await page.click('[data-testid="voice-task-trigger"]');
    const input = page.locator('[data-testid="voice-modal-text-input"]');

    // Step 1: Propose task
    await input.fill(`Remind me to ${cancelTitle} tomorrow`);
    await input.press('Enter');

    // Step 2: Cancel
    await input.fill('Actually never mind, cancel it');
    await input.press('Enter');

    // Assistant confirms cancellation
    const messages = page.locator('[data-testid="voice-messages-container"]');
    await expect(messages).toContainText('cancelled that', { timeout: 10000 });

    // Close modal
    await page.click('[data-testid="close-voice-modal-btn"]');

    // Ensure task was NOT added to the task list
    const unaddedTask = page.locator('[data-testid^="task-title-"]', { hasText: cancelTitle });
    await expect(unaddedTask).toHaveCount(0);
  });

  test('VOICE-06: Verifies voice button is persistent (starts listening when pressed, stays listening across silence/pauses, and stops when pressed again)', async ({ page }) => {
    // Open voice modal
    await page.click('[data-testid="voice-task-trigger"]');
    const modal = page.locator('[data-testid="voice-task-modal"]');
    await expect(modal).toBeVisible();

    const micBtn = page.locator('[data-testid="toggle-voice-mic-btn"]');
    await expect(micBtn).toBeVisible();

    // Verify it is in persistent listening mode
    await expect(page.locator('text=Tap to stop')).toBeVisible();

    // Wait 500ms simulating pause in user speech — verify it does NOT drop or stop listening
    await page.waitForTimeout(500);
    await expect(page.locator('text=Tap to stop')).toBeVisible();

    // Click mic button to stop listening
    await micBtn.click();
    await expect(page.locator('text=Tap to talk')).toBeVisible();

    // Click mic button again to start listening persistently
    await micBtn.click();
    await expect(page.locator('text=Tap to stop')).toBeVisible();

    // Click to stop again
    await micBtn.click();
    await expect(page.locator('text=Tap to talk')).toBeVisible();

    await page.click('[data-testid="close-voice-modal-btn"]');
    await expect(modal).not.toBeVisible();
  });

  test('VOICE-07: Microphone permission request flow and guidance', async ({ page }) => {
    // Open voice modal
    await page.click('[data-testid="voice-task-trigger"]');
    const modal = page.locator('[data-testid="voice-task-modal"]');
    await expect(modal).toBeVisible();

    // Verify mic toggle button is visible and operable
    const micBtn = page.locator('[data-testid="toggle-voice-mic-btn"]');
    await expect(micBtn).toBeVisible();

    // Initially in listening mode
    await expect(page.locator('text=Tap to stop')).toBeVisible();

    // Stop listening
    await micBtn.click();
    await expect(page.locator('text=Tap to talk')).toBeVisible();

    // Trigger permission request / start listening by clicking mic button
    await micBtn.click();
    await expect(page.locator('text=Tap to stop')).toBeVisible();

    await page.click('[data-testid="close-voice-modal-btn"]');
    await expect(modal).not.toBeVisible();
  });
});

