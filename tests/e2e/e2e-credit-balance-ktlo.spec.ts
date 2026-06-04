import { test, expect, chromium } from '@playwright/test';
import { launchExtension, getExtensionId, openOptions } from './fixtures';

/**
 * E2E-credit-balance-ktlo (Phase B Step 49)
 *
 * Verifies the happy-path Ktlo workspace fetch: when /user/workspaces returns
 * no inline credits and /workspaces/{id}/credit-balance is reachable, the
 * Macro Controller panel paints Available + Daily values from the cached API
 * response (resolver source = "Cache").
 *
 * Marked `fixme` until the lovable.dev fixture project ships sample Ktlo data
 * (tracked in `.lovable/question-and-ambiguity/` under credit-balance-update).
 *
 * Spec: spec/21-app/01-chrome-extension/credit-balance-update/18-tests-e2e.md.
 */
test.describe('E2E-Credit-Balance — Ktlo happy path', () => {
    test.fixme('renders /credit-balance values for a Ktlo workspace', async () => {
        const context = await launchExtension(chromium);
        const extensionId = await getExtensionId(context);
        const options = await openOptions(context, extensionId);
        await expect(options).toHaveURL(/options\.html/);
        await context.close();
    });
});
