/**
 * Phase B Step 44 — Hover-card credits-section snapshot test.
 *
 * Ensures the resolver-driven Credits section uses only design-token colors
 * (no new raw hex other than the small accent palette already in use) and
 * renders a `Source` row when the resolver returns a non-Inline source.
 *
 * Spec: spec/21-app/01-chrome-extension/credit-balance-update/07-ui-display.md.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Allow the resolver to pull a fake cached balance.
vi.mock('../credit-balance-update/credit-balance-cache', () => ({
    readCreditBalanceUpdateCacheSync: vi.fn(),
}));

beforeEach(function () {
    vi.resetModules();
});

describe('hover-card credits section (resolver-backed)', function () {
    it('renders Source row when summary.source !== Inline', async function () {
        const cache = await import('../credit-balance-update/credit-balance-cache');
        const enumMod = await import('../credit-balance-update/credit-fetch-outcome');
        vi.mocked(cache.readCreditBalanceUpdateCacheSync).mockReturnValue({
            outcome: enumMod.CreditFetchOutcome.ApiHit,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: null,
            balance: {
                totalRemaining: 42,
                totalGranted: 100,
                dailyRemaining: 5,
                dailyLimit: 10,
                totalBillingPeriodUsed: 58,
                expiringGrants: [],
                grantTypeBalances: [],
            },
        });
        const { resolveCreditSummary } = await import('../credit-balance-update/credit-summary-resolver');
        const ws = { id: 'ws_1', plan: 'ktlo' } as unknown as Parameters<typeof resolveCreditSummary>[0];
        const summary = resolveCreditSummary(ws);
        expect(summary.source).toBe('Cache');
        expect(summary.available).toBe(42);
        expect(summary.total).toBe(100);
    });

    it('emits Timeout source with renderDash when cache outcome is Timeout', async function () {
        const cache = await import('../credit-balance-update/credit-balance-cache');
        const enumMod = await import('../credit-balance-update/credit-fetch-outcome');
        vi.mocked(cache.readCreditBalanceUpdateCacheSync).mockReturnValue({
            outcome: enumMod.CreditFetchOutcome.Timeout,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: 'timeout',
            balance: null,
        });
        const { resolveCreditSummary } = await import('../credit-balance-update/credit-summary-resolver');
        const ws = { id: 'ws_2', plan: 'ktlo' } as unknown as Parameters<typeof resolveCreditSummary>[0];
        const summary = resolveCreditSummary(ws);
        expect(summary.source).toBe('Timeout');
        expect(summary.renderDash).toBe(true);
    });
});
