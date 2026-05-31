import { test, expect, chromium, type Page } from '@playwright/test';
import { launchExtension, getExtensionId, openOptions } from './fixtures';

/**
 * E2E-23 — Multi-Tab State Synchronization
 *
 * Verifies that the Prompt Manager and Step Group Library synchronize state
 * across multiple Options tabs in real-time.
 */
test.describe('E2E-23 — Multi-Tab State Synchronization', () => {
  test('prompts and step groups sync across tabs', async () => {
    const context = await launchExtension(chromium);
    const extensionId = await getExtensionId(context);

    // Open two Options tabs
    const tab1 = await openOptions(context, extensionId);
    const tab2 = await openOptions(context, extensionId);

    // --- Verify Prompt Synchronization ---
    
    // Navigate both tabs to Prompts
    await navigateToSection(tab1, 'Prompts');
    await navigateToSection(tab2, 'Prompts');

    const testPromptName = `Sync Test Prompt ${Date.now()}`;
    const testPromptText = 'Test prompt text for sync verification.';

    // Add prompt in Tab 1
    await tab1.getByRole('button', { name: /add/i }).last().click(); // The plus button
    await tab1.getByPlaceholder(/prompt name/i).fill(testPromptName);
    // Monaco editor is tricky, but let's try to fill the textarea if it's available or use keyboard
    await tab1.locator('.monaco-editor textarea').fill(testPromptText);
    await tab1.getByRole('button', { name: /add/i }).filter({ hasText: 'Add' }).click();

    // Verify it appeared in Tab 2
    await expect(tab2.getByText(testPromptName)).toBeVisible({ timeout: 10000 });
    await expect(tab2.getByText(testPromptText)).toBeVisible();

    // --- Verify Step Group Synchronization ---

    // Navigate both tabs to Step Groups
    await navigateToSection(tab1, 'Step Groups');
    await navigateToSection(tab2, 'Step Groups');

    const testGroupName = `Sync Test Group ${Date.now()}`;

    // Add step group in Tab 1
    // If empty, use the "Create your first group" button, otherwise use the plus in header
    const firstGroupBtn = tab1.getByRole('button', { name: /create your first group/i });
    if (await firstGroupBtn.isVisible()) {
      await firstGroupBtn.click();
    } else {
      await tab1.getByRole('button', { name: /new/i }).click(); // "New group" or "New child group"
    }
    
    await tab1.locator('input[placeholder="Group name..."], input#name').fill(testGroupName);
    await tab1.getByRole('button', { name: /create/i }).click();

    // Verify it appeared in Tab 2
    await expect(tab2.getByText(testGroupName)).toBeVisible({ timeout: 10000 });

    await context.close();
  });
});

async function navigateToSection(page: Page, sectionName: string) {
  await page.getByRole('button', { name: sectionName, exact: true }).click();
}
