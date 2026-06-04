/**
 * Phase B Step 52 — network-count assertion.
 *
 * Asserts the `requestCredits()` controller fires AT MOST one /credit-balance
 * HTTP call per workspace per cache window. The check is invariant of cache
 * hits (Inline / Cache short-circuit) and survives the single-flight join.
 *
 * Spec: spec/21-app/01-chrome-extension/credit-balance-update/10-caching-single-flight.md.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WorkspaceCredit } from '../types';

const hoisted = vi.hoisted(() => ({ fetchSpy: vi.fn() }));

vi.mock('../credit-balance-update/credit-balance-fetcher', () => ({
    fetchWorkspaceCreditBalance: hoisted.fetchSpy,
}));

const fetchSpy = hoisted.fetchSpy;

function ws(id: string): WorkspaceCredit {
    return {
        id, name: id, fullName: id, plan: 'ktlo', role: 'owner', tier: 'KTLO',
        dailyFree: 0, dailyUsed: 0, dailyLimit: 0,
        rolloverUsed: 0, rolloverLimit: 0,
        freeGranted: 0, freeRemaining: 0,
        used: 0, limit: 0, topupLimit: 0,
        totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
        hasFree: false, totalCreditsUsed: 0,
        subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
        raw: {}, rawApi: {},
        numProjects: 0, gitSyncEnabled: false,
        nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
        membershipRole: 'owner', planType: 'monthly',
    } as unknown as WorkspaceCredit;
}

beforeEach(async () => {
    const { CreditFetchOutcome } = await import('../credit-balance-update/credit-fetch-outcome');
    fetchSpy.mockReset();
    fetchSpy.mockImplementation(async () => ({
        outcome: CreditFetchOutcome.ApiHit,
        balance: {
            totalRemaining: 50, totalGranted: 100,
            dailyRemaining: 5, dailyLimit: 10,
            totalBillingPeriodUsed: 50,
            expiringGrants: [], grantTypeBalances: [],
        },
        fetchedAt: Date.now(),
        sourceUrl: '/workspaces/x/credit-balance',
        errorDetail: null,
    }));
    const ctrl = await import('../credit-balance-update/credit-fetch-controller');
    ctrl.__resetCreditFetchControllerForTests();
    const cache = await import('../credit-balance-update/credit-balance-cache');
    cache.clearCreditBalanceUpdateMemoryCache();
    try { await cache.invalidateCreditBalanceUpdateCache('ws_net_1'); } catch (_e) { /* allow-swallow: jsdom may lack IDB */ }
    try { await cache.invalidateCreditBalanceUpdateCache('ws_net_2'); } catch (_e) { /* allow-swallow: jsdom may lack IDB */ }
});

describe('credit-balance network-count contract', () => {
    it('issues at most ONE /credit-balance call per workspace within the cache window', async () => {
        const ctrl = await import('../credit-balance-update/credit-fetch-controller');
        ctrl.__resetCreditFetchControllerForTests();
        const w = ws('ws_net_1');
        await ctrl.requestCredits(w);
        await ctrl.requestCredits(w);
        await ctrl.requestCredits(w);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        ctrl.__resetCreditFetchControllerForTests();
    });

    it('joins concurrent calls via single-flight (no duplicate network)', async () => {
        const ctrl = await import('../credit-balance-update/credit-fetch-controller');
        ctrl.__resetCreditFetchControllerForTests();
        const w = ws('ws_net_2');
        await Promise.all([ctrl.requestCredits(w), ctrl.requestCredits(w), ctrl.requestCredits(w)]);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        ctrl.__resetCreditFetchControllerForTests();
    });
});
