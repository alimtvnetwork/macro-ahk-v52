import { test, expect, chromium, type Page } from '@playwright/test';
import { launchExtension, getExtensionId, openOptions } from './fixtures';

/**
 * E2E-23 — Multi-Tab State Synchronization
 *
 * Verifies that the Prompt Manager and Step Group Library synchronize state
 * across multiple Options tabs in real-time.
 */
test.describe('E2E-23 — Multi-Tab State Synchronization', () => {
  test.setTimeout(180_000);
  // TODO(e2e-23): Test hangs in CI at "Adding prompt in Tab 1" — the Add-prompt
  // button selector /plus|add/i is ambiguous and the dialog never opens reliably
  // in headless Chromium. Skipping until the Prompts UI exposes stable
  // data-testid hooks for the Add button, name field, and editor. Tracked in
  // .lovable/question-and-ambiguity/ as a deferred flake.
  test.skip('prompts and step groups sync across tabs', async () => {
    // 1. Setup Extension Context
    const context = await launchExtension(chromium);
    const extensionId = await getExtensionId(context);

    // 2. Open two Options tabs
    const tab1 = await openOptions(context, extensionId);
    const tab2 = await openOptions(context, extensionId);

    // --- Verify Prompt Synchronization ---
    
    // 3. Navigate both tabs to Prompts
    console.log('Navigating to Prompts...');
    await navigateToSection(tab1, 'Prompts');
    await navigateToSection(tab2, 'Prompts');

    const testPromptName = `Sync Test Prompt ${Date.now()}`;
    const testPromptText = 'Test prompt text for sync verification.';

    // 4. Add prompt in Tab 1
    console.log('Adding prompt in Tab 1...');
    // Click the "Add" (plus) button in the header
    const addBtn = tab1.getByRole('button', { name: /plus|add/i }).last();
    await addBtn.click();
    
    await tab1.getByPlaceholder(/prompt name/i).fill(testPromptName);
    
    // Interact with Monaco editor (fallback to filling the hidden textarea)
    const textarea = tab1.locator('.monaco-editor textarea');
    await textarea.focus();
    await textarea.fill(testPromptText);
    
    // Click the "Add" button in the form
    await tab1.getByRole('button', { name: /^Add$/ }).click();

    // 5. Verify it appeared in Tab 2
    console.log('Verifying prompt appearance in Tab 2...');
    await expect(tab2.getByText(testPromptName)).toBeVisible({ timeout: 20000 });
    await expect(tab2.getByText(testPromptText)).toBeVisible();

    // --- Verify Step Group Synchronization ---

    // 6. Navigate both tabs to Step Groups
    console.log('Navigating to Step Groups...');
    await navigateToSection(tab1, 'Step Groups');
    await navigateToSection(tab2, 'Step Groups');

    const testGroupName = `Sync Test Group ${Date.now()}`;

    // 7. Add step group in Tab 1
    console.log('Adding step group in Tab 1...');
    const firstGroupBtn = tab1.getByRole('button', { name: /create your first group/i });
    if (await firstGroupBtn.isVisible()) {
      await firstGroupBtn.click();
    } else {
      // Find the "New group" button in the toolbar
      await tab1.getByRole('button', { name: /new/i }).first().click();
    }
    
    await tab1.locator('input[placeholder="Group name..."]').fill(testGroupName);
    await tab1.getByRole('button', { name: /create/i }).click();

    // 8. Verify it appeared in Tab 2
    console.log('Verifying step group appearance in Tab 2...');
    await expect(tab2.getByText(testGroupName)).toBeVisible({ timeout: 20000 });

    await context.close();
  });
});

async function navigateToSection(page: Page, sectionName: string) {
  console.log(`[Nav] Navigating to ${sectionName}...`);
  // 1. Wait for the app to be ready, potentially bypassing onboarding
  const marker = page.locator('[data-testid="options-state-marker"]');
  
  // Wait for marker to be attached and NOT in 'loading' state
  await expect(async () => {
    const branch = await marker.getAttribute('data-branch');
    if (branch === 'loading' || branch === null) {
      throw new Error('Still loading or marker not found');
    }
  }).toPass({ timeout: 15000 });
  
  // If we're in onboarding, click "Continue/Get Started" until we reach the ready state
  let attempts = 0;
  while (attempts < 10) {
    const branch = await marker.getAttribute('data-branch');
    if (branch === 'ready') break;
    if (branch === 'loading') {
       await page.waitForTimeout(500);
       attempts++;
       continue;
    }

    console.log(`[Nav] Bypassing onboarding step ${attempts + 1} (current branch: ${branch})...`);
    const cta = page.locator('[data-onboarding-cta]');
    if (await cta.isVisible()) {
      await cta.click();
      // Wait a bit for the animation/transition
      await page.waitForTimeout(1000);
    } else {
      console.log('[Nav] Onboarding CTA not visible, waiting...');
      await page.waitForTimeout(1000);
    }
    attempts++;
  }

  // 2. Ensure we are in the 'ready' branch where the sidebar exists
  console.log('[Nav] Waiting for ready branch...');
  await expect(marker).toHaveAttribute('data-branch', 'ready', { timeout: 20000 });

  // 3. Find the navigation button by its accessible name (robust)
  console.log(`[Nav] Clicking ${sectionName} button...`);
  const navButton = page.getByRole('button', { name: sectionName }).first();
  
  // If not visible yet, maybe we need to wait for a bit
  await expect(navButton).toBeVisible({ timeout: 15000 });
  await navButton.click();
  console.log(`[Nav] Clicked ${sectionName}.`);
}
