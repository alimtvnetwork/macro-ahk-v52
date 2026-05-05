import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { launchExtension, getExtensionId, openOptions, optionsUrl } from './fixtures';

/**
 * E2E-02 — Project CRUD Lifecycle
 *
 * Create, read, update, and delete a project through the Options page.
 *
 * Implementation notes
 * --------------------
 * - The Options page renders <OnboardingFlow /> when
 *   `marco_onboarding_complete` is not set in `chrome.storage.local`. Every
 *   CRUD test must seed that flag *before* the Options page loads, otherwise
 *   the dashboard never mounts and queries like `getByRole('button',
 *   { name: /new project/i })` time out.
 * - The "New Project" trigger comes from `ProjectsListView` (button label
 *   "New Project"). The form lives in `ProjectCreateForm` (placeholder
 *   "Project name", save button "Create") — see those components if
 *   selectors drift.
 * - Default sidebar section is "projects" (see Options.tsx parseHash), but we
 *   force `#projects` in the URL hash so a stale persisted hash from the
 *   service worker session can never land us on a different section.
 *
 * Priority: P0 | Auto: ✅ | Est: 3 min
 */

const SETUP_TIMEOUT_MS = 30_000;

/**
 * Seed the onboarding-complete flag via the extension's service worker so the
 * write commits BEFORE we open any Options page. Opening a page first (the
 * previous approach) raced against `useOnboarding`'s 400ms storage timeout
 * and intermittently left the UI stuck on `<OnboardingFlow />`, which is the
 * direct cause of the 60s "New Project" button waits we saw on CI.
 */
async function seedOnboardingComplete(context: BrowserContext): Promise<void> {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ marco_onboarding_complete: true });
  });
}

/**
 * Open the Options page on the projects section and wait until the
 * "New Project" CTA is visible. This collapses every "page never loaded" /
 * "wrong section" / "still in onboarding" failure into one clear assertion
 * instead of a generic 60s test-level timeout.
 */
async function openProjectsView(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage();
  // Force #projects in the initial URL so parseHash never picks up a stale
  // section from a prior in-context navigation.
  await page.goto(`${optionsUrl(extensionId)}#projects`);
  await page.waitForLoadState('domcontentloaded');
  const newProjectBtn = page.getByRole('button', { name: /^new project$/i });
  await expect(newProjectBtn).toBeVisible({ timeout: SETUP_TIMEOUT_MS });
  return page;
}

async function createProject(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: /^new project$/i }).click();
  const nameInput = page.getByPlaceholder(/^project name$/i);
  await expect(nameInput).toBeVisible({ timeout: 10_000 });
  await nameInput.fill(name);
  await page.getByRole('button', { name: /^create$/i }).click();
  // Wait for the form to unmount (back on the list view).
  await expect(page.getByRole('button', { name: /^new project$/i })).toBeVisible({ timeout: 10_000 });
}

/**
 * Reuse a single persistent context across all three CRUD tests. Launching
 * a fresh Chromium + loading the unpacked extension takes 8–15s on CI, and
 * doing it three times was eating most of our 60s budget BEFORE the actual
 * UI assertions even started. Tests are serialized so storage state from
 * one step (e.g. a created project) is naturally available to the next.
 */
test.describe.serial('E2E-02 — Project CRUD Lifecycle', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    context = await launchExtension(chromium);
    extensionId = await getExtensionId(context);
    await seedOnboardingComplete(context);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('create a new project', async () => {
    const options = await openProjectsView(context, extensionId);
    try {
      await createProject(options, 'Test Automation');
      await expect(options.getByText('Test Automation').first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await options.close();
    }
  });

  test('update project name', async () => {
    const options = await openProjectsView(context, extensionId);
    try {
      // Reuses the project created by the previous test (serial order).
      const card = options.getByText('Test Automation').first();
      await expect(card).toBeVisible({ timeout: 10_000 });
      await card.click();

      // ProjectDetailView renders the name as a click-to-edit <h2>; click it
      // to mount the underlying <Input placeholder="Project name">.
      const heading = options.getByRole('heading', { name: 'Test Automation' });
      await expect(heading).toBeVisible({ timeout: 10_000 });
      await heading.click();

      const nameInput = options.getByPlaceholder(/^project name$/i);
      await expect(nameInput).toBeVisible({ timeout: 5_000 });
      await nameInput.fill('Test Automation v2');

      // The save button is icon-only; its accessible name comes from
      // aria-label="Save project" on IconButtonWithTooltip and only mounts
      // once the form is dirty. We must click it BEFORE the input loses
      // focus (which would close the editor) so we use Locator.click()
      // directly without first blurring the input.
      const saveBtn = options.getByRole('button', { name: /^save project$/i });
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click();

      await expect(options.getByText('Test Automation v2').first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await options.close();
    }
  });

  test('delete project cleans up storage', async () => {
    const options = await openProjectsView(context, extensionId);
    try {
      // Create a fresh disposable project so this test is independent of
      // whatever state the update test left behind.
      await createProject(options, 'Delete Me');

      const card = options.getByText('Delete Me').first();
      await expect(card).toBeVisible({ timeout: 10_000 });
      await card.click();

      // Icon-only delete trigger; aria-label="Delete project".
      const deleteTrigger = options.getByRole('button', { name: /^delete project$/i });
      await expect(deleteTrigger).toBeVisible({ timeout: 10_000 });
      await deleteTrigger.click();

      // AlertDialog confirm action — exact text is "Delete".
      const confirmBtn = options.getByRole('button', { name: /^delete$/i });
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
      await confirmBtn.click();

      await expect(options.getByText('Delete Me')).not.toBeVisible({ timeout: 10_000 });
    } finally {
      await options.close();
    }
  });
});
