// Plan 01 follow-up (post-Step-10): regression locks that the refill-priority
// sort recomputes the moment a CreditResolved cache write lands — i.e. the
// onCreditResolved → invalidateWsDropdownHash → populateLoopWorkspaceDropdown
// chain in ws-list-renderer.ts (lines 1143-1145) feeds fresh resolver data
// into sortByRefillPriority (line 783). Without this test, the next refactor
// of either the resolver cache or the refill scorer can silently re-introduce
// the v3.83.0 bug where workspaces with newly-resolved credits stayed pinned
// at score=0 until the next manual /user/workspaces poll.
import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearCreditBalanceUpdateMemoryCache,
    __writeCreditBalanceUpdateMemoryCacheForTests,
} from '../credit-balance-update/credit-balance-cache';
import { CreditFetchOutcome } from '../credit-balance-update/credit-fetch-outcome';
import type { CreditFetchResult } from '../credit-balance-update/credit-balance-types';
import { sortByRefillPriority } from '../workspace-refill-priority';
import type { WorkspaceCredit } from '../types';

const NOW = Date.parse('2026-06-21T00:00:00Z');
const TOMORROW = new Date(NOW + 1 * 86_400_000).toISOString();

function makeWs(id: string, available: number): WorkspaceCredit {
    return {
        id,
        name: id, fullName: id,
        used: 0, limit: 0, rolloverUsed: 0, rolloverLimit: 0,
        dailyUsed: 0, dailyLimit: 0, freeGranted: 0, freeRemaining: 0,
        topupLimit: 0,
        available, totalCredits: available, totalCreditsUsed: 0,
        billingAvailable: 0, rollover: 0, dailyFree: 0,
        tier: 'KTLO', plan: 'ktlo',
        nextRefillAt: TOMORROW,
    } as unknown as WorkspaceCredit;
}

function makeCachedResult(available: number): CreditFetchResult {
    return {
        outcome: CreditFetchOutcome.ApiHit,
        balance: {
            totalRemaining: available,
            totalGranted: available,
            dailyRemaining: 0,
            dailyLimit: 0,
            totalBillingPeriodUsed: 0,
            expiringGrants: [],
            grantTypeBalances: [],
        },
        fetchedAt: NOW,
        sourceUrl: 'https://api.example.test/workspaces/x/credit-balance',
        errorDetail: null,
    };
}

beforeEach(() => {
    clearCreditBalanceUpdateMemoryCache();
});

describe('refill-priority — CreditResolved repaint integration', () => {
    it('inline available=0 ranks last; same workspace floats to top after cache write', () => {
        const ktloEmpty = makeWs('ws-ktlo', 0);
        const proSmall = makeWs('ws-pro', 50);
        // Tag pro as inline-resolvable plan so resolver skips the cache path.
        (proSmall as unknown as { plan: string }).plan = 'pro_1';
        (proSmall as unknown as { limit: number }).limit = 50;

        const rows = [{ ws: ktloEmpty }, { ws: proSmall }];

        // Before CreditResolved: ktlo has 0 available → score 0 → falls behind pro.
        const before = sortByRefillPriority(rows, 10, NOW).map(r => r.ws.id);
        expect(before[0]).toBe('ws-pro');
        expect(before[1]).toBe('ws-ktlo');

        // Simulate resolver completing /credit-balance for ws-ktlo with 500 credits.
        __writeCreditBalanceUpdateMemoryCacheForTests('ws-ktlo', makeCachedResult(500), 600_000, NOW);

        // After CreditResolved: resolver now returns 500 → ws-ktlo's score
        // (9 * 500 = 4500) beats ws-pro (9 * 50 = 450). Order MUST flip.
        const after = sortByRefillPriority(rows, 10, NOW).map(r => r.ws.id);
        expect(after[0]).toBe('ws-ktlo');
        expect(after[1]).toBe('ws-pro');
    });
});
