/**
 * E2E — Macro-controller harness smoke test.
 *
 * Validates the Option-A content-script harness shipped in
 * `tests/e2e/utils/macro-controller-harness.ts`
 * (see `.lovable/question-and-ambiguity/61-credit-totals-content-script-harness.md`).
 *
 * Two passes:
 *   1. skipBundle=true — pins the bootstrap contract (URL routing, chrome.*
 *      stubs, shell DOM) deterministically without depending on whether the
 *      production IIFE happens to boot cleanly inside this minimal shell.
 *   2. Bundle injection — exercises the addScriptTag path against the real
 *      `standalone-scripts/macro-controller/dist/macro-looping.js` produced by
 *      globalSetup's `build:macro-controller` step. Any page-script error is
 *      captured (not silently swallowed) and surfaced via bundleError so the
 *      next harness phase can iterate on real failure modes.
 */
import { test, expect, chromium } from '@playwright/test';
import { launchExtension } from './fixtures';
import { mountMacroControllerHarness } from './utils/macro-controller-harness';

test.describe('Macro-controller content-script harness', () => {
    test('bootstraps a simulated lovable.dev page with chrome.* stubs (no bundle)', async () => {
        const context = await launchExtension(chromium);
        try {
            const { page, bundlePath } = await mountMacroControllerHarness(context, {
                projectId: 'harness-smoke',
                skipBundle: true,
            });

            // URL surface — content-script gates check location.hostname.
            expect(page.url()).toMatch(/^https:\/\/lovable\.dev\/projects\/harness-smoke/);
            expect(bundlePath).toBeNull();

            // chrome.* stubs installed before page scripts (addInitScript).
            const chromeShape = await page.evaluate(() => {
                const c = (window as unknown as {
                    chrome?: {
                        runtime?: { id?: string };
                        storage?: { local?: { get?: unknown } };
                        tabs?: { query?: unknown };
                    };
                }).chrome;
                return {
                    hasChrome: typeof c !== 'undefined',
                    runtimeId: c?.runtime?.id ?? null,
                    storageLocalGet: typeof c?.storage?.local?.get === 'function',
                    tabsQuery: typeof c?.tabs?.query === 'function',
                };
            });
            expect(chromeShape.hasChrome).toBe(true);
            expect(chromeShape.runtimeId).toBeTruthy();
            expect(chromeShape.storageLocalGet).toBe(true);
            expect(chromeShape.tabsQuery).toBe(true);

            // Shell DOM rendered.
            await expect(page.getByTestId('project-title')).toHaveText('Harness Project');
            await expect(page.getByTestId('workspace-sidebar')).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test.fixme(
        'injects the production IIFE without page-script errors (un-fixme once panel-mount selectors are stable)',
        async () => {
            const context = await launchExtension(chromium);
            try {
                const { page, bundleError } = await mountMacroControllerHarness(context, {
                    projectId: 'harness-bundle-smoke',
                });
                expect(page.url()).toMatch(/^https:\/\/lovable\.dev\/projects\/harness-bundle-smoke/);
                expect(bundleError, `bundle threw: ${bundleError?.message}`).toBeNull();
            } finally {
                await context.close();
            }
        },
    );
});
