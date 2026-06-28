import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCredit } from '../types';
import { CreditFetchOutcome } from '../credit-balance-update/credit-fetch-outcome';
import { Plan } from '../credit-balance-update/plan';
import type { CreditFetchResult } from '../credit-balance-update/credit-balance-types';

const { fetchWorkspaceCreditBalanceSpy, settingsListeners } = vi.hoisted(() => ({
    fetchWorkspaceCreditBalanceSpy: vi.fn(),
    settingsListeners: [] as Array<(overrides: { creditFetchDelayMs?: number }) => void>,
}));

vi.mock('../credit-balance-update/credit-balance-fetcher', () => ({
    fetchWorkspaceCreditBalance: fetchWorkspaceCreditBalanceSpy,
}));

vi.mock('../settings-store', () => ({
    onSettingsChange: (fn: (overrides: { creditFetchDelayMs?: number }) => void) => {
        settingsListeners.push(fn);
        return () => {
            const idx = settingsListeners.indexOf(fn);
            if (idx >= 0) settingsListeners.splice(idx, 1);
        };
    },
}));

vi.mock('../error-utils', () => ({
    logError: vi.fn(),
}));

import {
    __resetCreditFetchControllerForTests,
    getTimeoutMs,
    hasInlineCredits,
    requestCredits,
    setTimeoutMs,
    subscribeCreditFetchSettings,
} from '../credit-balance-update/credit-fetch-controller';
import { clearCreditBalanceUpdateMemoryCache } from '../credit-balance-update/credit-balance-cache';

function ws(partial: Partial<WorkspaceCredit>): WorkspaceCredit {
    return {
        id: 'ws_1', name: 'ws', fullName: 'workspace',
        dailyFree: 0, dailyUsed: 0, dailyLimit: 0,
        rolloverUsed: 0, rolloverLimit: 0,
        freeGranted: 0, freeRemaining: 0,
        used: 0, limit: 0, topupLimit: 0,
        totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
        hasFree: false, totalCreditsUsed: 0,
        subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
        plan: 'ktlo', role: 'owner', tier: 'LITE',
        raw: {}, rawApi: {},
        numProjects: 0, gitSyncEnabled: false,
        nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
        membershipRole: 'owner', planType: 'monthly',
        ...partial,
    };
}

function apiResult(outcome = CreditFetchOutcome.ApiHit): CreditFetchResult {
    return {
        outcome,
        balance: outcome === CreditFetchOutcome.ApiHit ? {
            totalRemaining: 5,
            totalGranted: 5,
            dailyRemaining: 5,
            dailyLimit: 5,
            totalBillingPeriodUsed: 0,
            expiringGrants: [],
            grantTypeBalances: [],
        } : null,
        fetchedAt: Date.now(),
        sourceUrl: 'https://api.example.test/workspaces/ws_1/credit-balance',
        errorDetail: null,
    };
}

beforeEach(() => {
    fetchWorkspaceCreditBalanceSpy.mockReset();
    clearCreditBalanceUpdateMemoryCache();
    settingsListeners.splice(0, settingsListeners.length);
    __resetCreditFetchControllerForTests();
});

describe('credit-fetch-controller', () => {
    it('returns InlineHit when target plan already has inline credits', async () => {
        const workspace = ws({ limit: 50, billingAvailable: 45, totalCredits: 50, available: 45 });

        const result = await requestCredits(workspace);

        expect(result.outcome).toBe(CreditFetchOutcome.InlineHit);
        expect(result.balance?.availableBalance).toBe(45);
        expect(result.balance?.cloudRemaining).toBe(0);
        expect(result.balance?.aiRemaining).toBe(0);
        expect(fetchWorkspaceCreditBalanceSpy).not.toHaveBeenCalled();
    });

    it('skips plans that do not require credit-balance fetch', async () => {
        const result = await requestCredits(ws({ plan: 'business' }));

        expect(result.outcome).toBe(CreditFetchOutcome.Skipped);
        expect(fetchWorkspaceCreditBalanceSpy).not.toHaveBeenCalled();
    });

    it('fetches and overlays API credit balance for ktlo without inline credits', async () => {
        fetchWorkspaceCreditBalanceSpy.mockResolvedValueOnce(apiResult());
        const workspace = ws({ plan: 'ktlo' });

        const result = await requestCredits(workspace);

        expect(result.outcome).toBe(CreditFetchOutcome.ApiHit);
        expect(fetchWorkspaceCreditBalanceSpy).toHaveBeenCalledWith({ workspaceId: 'ws_1', plan: Plan.Ktlo, timeoutMs: 3000 });
        expect(workspace.available).toBe(5);
        expect(workspace.dailyFree).toBe(5);
    });

    it('keeps daily-only credit-balance rows visible when aggregate totals are zero', async () => {
        fetchWorkspaceCreditBalanceSpy.mockResolvedValueOnce({
            ...apiResult(),
            balance: {
                totalRemaining: 0,
                totalGranted: 0,
                dailyRemaining: 5,
                dailyLimit: 5,
                totalBillingPeriodUsed: 0,
                expiringGrants: [],
                grantTypeBalances: [],
            },
        });
        const workspace = ws({ plan: 'free' });

        await requestCredits(workspace);

        expect(workspace.available).toBe(5);
        expect(workspace.totalCredits).toBe(5);
    });

    it('returns ApiCacheHit on a second request inside the cache window', async () => {
        fetchWorkspaceCreditBalanceSpy.mockResolvedValueOnce(apiResult());
        const workspace = ws({ plan: 'free' });

        await requestCredits(workspace);
        const cached = await requestCredits(workspace);

        expect(cached.outcome).toBe(CreditFetchOutcome.ApiCacheHit);
        expect(fetchWorkspaceCreditBalanceSpy).toHaveBeenCalledTimes(1);
    });

    it('caches timeout negative result without hammering the endpoint', async () => {
        fetchWorkspaceCreditBalanceSpy.mockResolvedValueOnce(apiResult(CreditFetchOutcome.Timeout));
        const workspace = ws({ plan: 'cancelled' });

        const first = await requestCredits(workspace);
        const second = await requestCredits(workspace);

        expect(first.outcome).toBe(CreditFetchOutcome.Timeout);
        expect(second.outcome).toBe(CreditFetchOutcome.Timeout);
        expect(fetchWorkspaceCreditBalanceSpy).toHaveBeenCalledTimes(1);
    });

    it('performs one forced-token retry after AuthError', async () => {
        fetchWorkspaceCreditBalanceSpy
            .mockResolvedValueOnce(apiResult(CreditFetchOutcome.AuthError))
            .mockResolvedValueOnce(apiResult(CreditFetchOutcome.ApiHit));

        const result = await requestCredits(ws({ plan: 'ktlo' }));

        expect(result.outcome).toBe(CreditFetchOutcome.ApiHit);
        expect(fetchWorkspaceCreditBalanceSpy).toHaveBeenCalledTimes(2);
        expect(fetchWorkspaceCreditBalanceSpy.mock.calls[1][0]).toEqual({
            workspaceId: 'ws_1',
            plan: Plan.Ktlo,
            timeoutMs: 3000,
            forceTokenRefresh: true,
        });
    });

    it('joins concurrent requests into one single-flight call', async () => {
        let resolveFetch: (result: CreditFetchResult) => void = () => {};
        fetchWorkspaceCreditBalanceSpy.mockReturnValueOnce(new Promise<CreditFetchResult>(resolve => { resolveFetch = resolve; }));
        const workspace = ws({ plan: 'ktlo' });

        const first = requestCredits(workspace);
        const second = requestCredits(workspace);
        resolveFetch(apiResult());
        const results = await Promise.all([first, second]);

        expect(results[0].outcome).toBe(CreditFetchOutcome.ApiHit);
        expect(results[1].outcome).toBe(CreditFetchOutcome.ApiHit);
        expect(fetchWorkspaceCreditBalanceSpy).toHaveBeenCalledTimes(1);
    });

    it('clamps timeout and subscribes to settings changes', () => {
        setTimeoutMs(99);
        expect(getTimeoutMs()).toBe(500);
        setTimeoutMs(99_999);
        expect(getTimeoutMs()).toBe(15_000);
        subscribeCreditFetchSettings();
        settingsListeners[0]({ creditFetchDelayMs: 4500 });
        expect(getTimeoutMs()).toBe(4500);
    });

    /**
     * Regression — `.lovable/plan.md` 2026-06-06 RCA #3.
     *
     * New free / Lite (ktlo) / Cancelled accounts return zero-valued grant
     * rows. The legacy `length > 0` check classified them as InlineHit and
     * suppressed the /credit-balance fetch, so the panel kept rendering
     * 0/0 forever. hasInlineCredits() must now look at the row values.
     */
    it('treats grant_type_balances with non-zero totals as inline data', () => {
        const workspace = ws({
            rawApi: {
                grant_type_balances: [{ grant_type: 'monthly_subscription', total_granted: 100, total_remaining: 42 }],
            },
        });
        expect(hasInlineCredits(workspace)).toBe(true);
    });

    it('treats all-zero grant_type_balances rows as missing inline data', () => {
        const workspace = ws({
            rawApi: {
                grant_type_balances: [{
                    grant_type: 'free_daily',
                    total_granted: 0,
                    total_remaining: 0,
                    total_billing_period_used: 0,
                    daily_limit: 0,
                    daily_remaining: 0,
                }],
            },
        });
        expect(hasInlineCredits(workspace)).toBe(false);
    });

    it('treats empty grant_type_balances array as missing inline data', () => {
        const workspace = ws({ rawApi: { grant_type_balances: [] } });
        expect(hasInlineCredits(workspace)).toBe(false);
    });
});
