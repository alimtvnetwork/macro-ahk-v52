/**
 * E2E — Credit Totals modal (Plan 20-step, Step 16 — fixtures wired in Phase B Step 52)
 *
 * Coverage (target): open modal → sort by Rem asc → drag row 3 above row 1 →
 * filter "Refill-soon" → click CSV → assert downloaded CSV contains exactly
 * the filtered + reordered rows.
 *
 * Status: executable through the content-script harness. The original note
 * named a "Refill-soon" modal filter, but the Credit Totals modal exposes
 * Low / Empty / Free chips; this spec uses the real modal filter surface.
 *
 * Spec: spec/21-app/01-chrome-extension/credit-balance-update/18-tests-e2e.md.
 */
import { test, expect, chromium } from '@playwright/test';
import { launchExtension } from './fixtures';
import { installCreditBalanceStub } from './utils/credit-balance-stub';
import { mountMacroControllerHarness } from './utils/macro-controller-harness';
import {
    KTLO_WORKSPACE,
    FREE_WORKSPACE,
    CANCELLED_WORKSPACE,
    KTLO_CREDIT_BALANCE,
    FREE_CREDIT_BALANCE,
    CANCELLED_CREDIT_BALANCE,
} from './fixtures/credit-balance/workspaces';

test.describe('Credit Totals modal — sort → drag → filter → CSV export round-trip', () => {
    test('round-trip via macro-controller panel', async () => {
        const context = await launchExtension(chromium);
        try {
            // Network half — stubs /credit-balance for all three fixtures.
            const creditStub = await installCreditBalanceStub(context, {
                workspaces: [KTLO_WORKSPACE, FREE_WORKSPACE, CANCELLED_WORKSPACE],
                creditBalances: {
                    [KTLO_WORKSPACE.id]: KTLO_CREDIT_BALANCE,
                    [FREE_WORKSPACE.id]: FREE_CREDIT_BALANCE,
                    [CANCELLED_WORKSPACE.id]: CANCELLED_CREDIT_BALANCE,
                },
            });

            // Page half — fake lovable.dev shell + chrome.* stubs + IIFE inject.
            const { page, bundleError } = await mountMacroControllerHarness(context, {
                projectId: 'credit-totals-e2e',
            });
            expect(page.url()).toMatch(/^https:\/\/lovable\.dev\/projects\/credit-totals-e2e/);
            // Surface (not swallow) any boot-time bundle error so the next
            // harness iteration sees the real failure mode immediately.
            expect(bundleError, `macro-controller bundle threw on inject: ${bundleError?.message}`).toBeNull();

            await page.getByText('💰 Credits').click();
            await expect.poll(() => creditStub.counts.userWorkspaces, { timeout: 20_000 }).toBeGreaterThan(0);

            await page.getByText('☰').click();
            await page.getByText('Credit Totals').click();
            const modal = page.locator('#marco-credit-totals-modal');
            await expect(modal).toBeVisible();

            const rows = modal.locator('[data-credit-totals-row]');
            await modal.locator('[data-sort-key="rem"]').click();
            await modal.locator('[data-sort-key="rem"]').click();
            await expect(rows.nth(0).locator('[data-cell="name"]')).toContainText('Cancelled Pro Workspace');

            await modal.locator('[data-sort-key="rem"]').click();
            await rows.nth(2).dragTo(rows.nth(0));
            await expect(rows.nth(0).locator('[data-cell="name"]')).toContainText('Cancelled Pro Workspace');

            await modal.locator('[data-chip="free"]').click();
            await expect(rows).toHaveCount(1);
            await expect(rows.nth(0).locator('[data-cell="name"]')).toContainText('Free Workspace');

            const downloadPromise = page.waitForEvent('download');
            await modal.locator('[data-credit-totals-csv]').click();
            const download = await downloadPromise;
            const stream = await download.createReadStream();
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
                stream.on('data', (chunk: Buffer) => { chunks.push(chunk); });
                stream.on('end', resolve);
                stream.on('error', reject);
            });
            const csv = Buffer.concat(chunks).toString('utf8');
            expect(csv).toContain('Workspace,Plan,Projects,Used,Remaining,Total,Daily,DailyLimit,Source');
            expect(csv).toContain('Free Workspace');
        } finally {
            await context.close();
        }
    });
});

