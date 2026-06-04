import { test, expect, chromium } from '@playwright/test';
import { launchExtension, getExtensionId, openOptions } from './fixtures';

/**
 * E2E-credit-balance-timeout (Phase B Step 50)
 *
 * Asserts the slider-driven timeout (Spec §06) is honored end-to-end:
 *  1. Default 3000ms produces a Timeout outcome when the API stalls >3s.
 *  2. Raising the slider to 8000ms allows the same stalled request to
 *     succeed and the panel re-renders Source = "Cache".
 *
 * Marked `fixme` until the network-stub harness in
 * `tests/e2e/utils/network-stub.ts` lands (tracked in plan.md Step 52).
 *
 * Spec: spec/21-app/01-chrome-extension/credit-balance-update/18-tests-e2e.md.
 */
test.describe('E2E-Credit-Balance — timeout + slider change', () => {
    test.fixme('panels render Timeout source then recover after slider increase', async () => {
        const context = await launchExtension(chromium);
        const extensionId = await getExtensionId(context);
        const options = await openOptions(context, extensionId);
        await expect(options).toHaveURL(/options\.html/);
        await context.close();
    });
});
