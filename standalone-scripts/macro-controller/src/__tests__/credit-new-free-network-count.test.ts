/**
 * Plan 01 — Step 8a + 8d regression.
 *
 * Asserts the network-count contract that protects RCA #1 + #3 + #4 from
 * `.lovable/plans/completed/01-task-next-queue-sequential.md` (v3.82.0–v3.84.0):
 *
 *   8a — new-free fixture (limit=0, grant_type_balances=[{available:0,total:0}])
 *        MUST trigger exactly ONE /credit-balance call.
 *   8d — Pro_1 workspace with inline credits (limit>0) MUST trigger ZERO
 *        /credit-balance calls within the cache window.
 *
 * If either invariant flips, the credit progress bar regresses to the empty /
 * 0-0 state for free accounts or burns a redundant HTTP call for Pro accounts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import type { WorkspaceCredit } from '../types';

const hoisted = vi.hoisted(() => ({ fetchSpy: vi.fn() }));

vi.mock('../credit-balance-update/credit-balance-fetcher', () => ({
    fetchWorkspaceCreditBalance: hoisted.fetchSpy,
}));

const fetchSpy = hoisted.fetchSpy;

function baseWs(id: string, plan: string): WorkspaceCredit {
    return {
        id, name: id, fullName: id, plan, role: 'owner', tier: plan.toUpperCase(),
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

function newFreeWs(id: string): WorkspaceCredit {
    const ws = baseWs(id, 'free');
    // RCA #3 fixture: zero-row grant_type_balances must NOT be treated as InlineHit.
    ws.rawApi = {
        daily_credits_limit: 0,
        billing_period_credits_limit: 0,
        grant_type_balances: [{ available: 0, total: 0, grant_type: 'free' }],
    };
    return ws;
}

function proWsWithInline(id: string): WorkspaceCredit {
    const ws = baseWs(id, 'pro_1');
    ws.limit = 100;
    ws.totalCredits = 100;
    ws.available = 80;
    return ws;
}

beforeEach(async () => {
    const { CreditFetchOutcome } = await import('../credit-balance-update/credit-fetch-outcome');
    fetchSpy.mockReset();
    fetchSpy.mockImplementation(async () => ({
        outcome: CreditFetchOutcome.ApiHit,
        balance: {
            totalRemaining: 25, totalGranted: 50,
            dailyRemaining: 3, dailyLimit: 5,
            totalBillingPeriodUsed: 25,
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
    for (const id of ['ws_newfree_1', 'ws_pro_inline_1']) {
        try { await cache.invalidateCreditBalanceUpdateCache(id); } catch (_e) { /* allow-swallow: jsdom may lack IDB */ }
    }
});

describe('credit-balance — new-free + Pro-inline network contract (plan 01 step 8a/8d)', () => {
    it('new-free workspace with all-zero grant rows triggers exactly ONE /credit-balance call', async () => {
        const ctrl = await import('../credit-balance-update/credit-fetch-controller');
        const { CreditFetchOutcome } = await import('../credit-balance-update/credit-fetch-outcome');

        const ws = newFreeWs('ws_newfree_1');
        expect(ctrl.hasInlineCredits(ws)).toBe(false);

        const result = await ctrl.requestCredits(ws);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(result.outcome).toBe(CreditFetchOutcome.ApiHit);
        expect(result.balance?.totalRemaining).toBe(25);
    });

    it('Pro_1 workspace with inline credits triggers ZERO /credit-balance calls', async () => {
        const ctrl = await import('../credit-balance-update/credit-fetch-controller');
        const { CreditFetchOutcome } = await import('../credit-balance-update/credit-fetch-outcome');

        const ws = proWsWithInline('ws_pro_inline_1');
        const result = await ctrl.requestCredits(ws);

        expect(fetchSpy).not.toHaveBeenCalled();
        // Pro_1 short-circuits at `shouldFetchCreditBalanceForPlan` BEFORE the
        // inline check, so the outcome is Skipped — not InlineHit.
        expect(result.outcome).toBe(CreditFetchOutcome.Skipped);
    });
});
