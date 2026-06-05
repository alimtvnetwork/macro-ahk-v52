import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { launchExtension, getExtensionId, optionsUrl } from './fixtures';

const ONBOARDING_KEY = 'marco_onboarding_complete';
const PROJECT_ALPHA_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_BRAVO_ID = '22222222-2222-4222-8222-222222222222';

type StoredProjectSeed = {
  id: string;
  schemaVersion: number;
  slug: string;
  codeName: string;
  name: string;
  version: string;
  description: string;
  targetUrls: Array<{ pattern: string; matchType: 'prefix' }>;
  scripts: [];
  configs: [];
  settings: { logLevel: 'info'; retryOnNavigate: false };
  createdAt: string;
  updatedAt: string;
};

test.describe('E2E-24 — Cross-Project Sync Chrome pass', () => {
  test.setTimeout(180_000);

  test('creates a project group, drag-assigns a project, and cascades shared settings', async () => {
    const context = await launchExtension(chromium);
    try {
      const extensionId = await getExtensionId(context);
      await seedCrossProjectSyncState(context);

      const options = await context.newPage();
      await options.goto(`${optionsUrl(extensionId)}#library`);
      await options.waitForLoadState('domcontentloaded');
      await waitForReadyOptions(options);

      await expect(options.getByRole('heading', { name: 'Shared Library' })).toBeVisible();
      await options.getByTestId('library-tab-groups').click();

      const groupName = `E2E Sync Group ${Date.now()}`;
      await options.getByTestId('project-group-new-button').click();
      await options.getByTestId('project-group-name-input').fill(groupName);
      await options.getByTestId('project-group-settings-input').fill('{"logLevel":"warn","retryOnNavigate":true}');
      await options.getByTestId('project-group-save-button').click();

      await expect(options.getByText(groupName)).toBeVisible({ timeout: 20_000 });
      const groupId = await readGroupId(options, groupName);
      expect(groupId).not.toBeNull();
      await options.getByTestId(`project-group-card-${groupId}`).click();
      await expect(options.getByTestId(`project-group-drag-source-${PROJECT_ALPHA_ID}`)).toBeVisible();

      await dragProjectIntoMembers(options, PROJECT_ALPHA_ID);
      await expect(options.getByTestId(`project-group-member-${PROJECT_ALPHA_ID}`)).toBeVisible({ timeout: 20_000 });
      await expect(options.getByText('Alpha Automation')).toBeVisible();

      await options.getByTestId('project-group-cascade-button').click();
      await expect(options.getByText(/Settings pushed to 1 project\(s\)/)).toBeVisible({ timeout: 20_000 });

      const persisted = await readGroupMembers(options, groupName);
      expect(persisted).toContain(PROJECT_ALPHA_ID);
      expect(persisted).not.toContain(PROJECT_BRAVO_ID);
    } finally {
      await context.close();
    }
  });
});

async function seedCrossProjectSyncState(context: BrowserContext): Promise<void> {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker');
  const projects = [
    makeProject(PROJECT_ALPHA_ID, 'alpha-automation', 'AlphaAutomation', 'Alpha Automation'),
    makeProject(PROJECT_BRAVO_ID, 'bravo-automation', 'BravoAutomation', 'Bravo Automation'),
  ];
  // Wait for chrome.storage to be available in the service worker context.
  // On cold start, the SW may evaluate before chrome.* APIs are exposed.
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const ready = await serviceWorker.evaluate(() => {
      const c = (globalThis as { chrome?: { storage?: { local?: unknown } } }).chrome;
      return Boolean(c?.storage?.local);
    });
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  await serviceWorker.evaluate(
    async ({ onboardingKey, seededProjects }) => {
      await chrome.storage.local.set({
        [onboardingKey]: true,
        marco_projects: seededProjects,
      });
    },
    { onboardingKey: ONBOARDING_KEY, seededProjects: projects },
  );
}

function makeProject(id: string, slug: string, codeName: string, name: string): StoredProjectSeed {
  const timestamp = '2026-06-04T00:00:00.000Z';
  return {
    id,
    schemaVersion: 1,
    slug,
    codeName,
    name,
    version: '1.0.0',
    description: `${name} seeded for Cross-Project Sync E2E`,
    targetUrls: [{ pattern: `https://example.com/${slug}`, matchType: 'prefix' }],
    scripts: [],
    configs: [],
    settings: { logLevel: 'info', retryOnNavigate: false },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function waitForReadyOptions(page: Page): Promise<void> {
  const marker = page.locator('[data-testid="options-state-marker"]');
  await expect(marker).toHaveAttribute('data-branch', 'ready', { timeout: 30_000 });
}

async function dragProjectIntoMembers(page: Page, projectId: string): Promise<void> {
  const sourceTestId = `project-group-drag-source-${projectId}`;
  await page.evaluate((sourceId) => {
    const source = document.querySelector(`[data-testid="${sourceId}"]`);
    const target = document.querySelector('[data-testid="project-group-member-drop-target"]');
    if (!source || !target) {
      throw new Error(`CODE RED: Cross-Project Sync drag failed. Path: tests/e2e/e2e-24-cross-project-sync.spec.ts. Missing: ${!source ? sourceId : 'project-group-member-drop-target'}. Reason: drag source/drop target not rendered.`);
    }
    const dataTransfer = new DataTransfer();
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  }, sourceTestId);
}

async function readGroupMembers(page: Page, groupName: string): Promise<string[]> {
  return await page.evaluate(async (name) => {
    const groupsResponse = await chrome.runtime.sendMessage({ type: 'LIBRARY_GET_GROUPS' });
    const group = groupsResponse.groups.find((candidate: { Name: string }) => candidate.Name === name);
    if (!group) return [];
    const membersResponse = await chrome.runtime.sendMessage({ type: 'LIBRARY_GET_GROUP_MEMBERS', groupId: group.Id });
    return membersResponse.members.map((member: { ProjectIdUuid: string }) => member.ProjectIdUuid);
  }, groupName);
}

async function readGroupId(page: Page, groupName: string): Promise<number | null> {
  return await page.evaluate(async (name) => {
    const groupsResponse = await chrome.runtime.sendMessage({ type: 'LIBRARY_GET_GROUPS' });
    const group = groupsResponse.groups.find((candidate: { Name: string }) => candidate.Name === name);
    return group?.Id ?? null;
  }, groupName);
}
