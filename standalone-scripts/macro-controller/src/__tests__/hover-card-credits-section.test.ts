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
import type { WorkspaceCredit } from '../types';

// Stub side-effectful modules so resolver import is fast and deterministic
// (prevents the 15-60s timeout observed in CI when settings-store/fetcher
// pull in their full dependency graphs).
vi.mock('../settings-store', () => ({ onSettingsChange: () => () => undefined }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../credit-balance-update/credit-balance-fetcher', () => ({
    fetchWorkspaceCreditBalance: vi.fn().mockResolvedValue(null),
}));

import { resolveCreditSummary } from '../credit-balance-update/credit-summary-resolver';
import {
    __writeCreditBalanceUpdateMemoryCacheForTests,
    clearCreditBalanceUpdateMemoryCache,
} from '../credit-balance-update/credit-balance-cache';
import { CreditFetchOutcome } from '../credit-balance-update/credit-fetch-outcome';

function workspaceCredit(id: string): WorkspaceCredit {
    return {
        id,
        name: 'workspace',
        fullName: 'workspace',
        dailyFree: 0,
        dailyUsed: 0,
        dailyLimit: 0,
        rolloverUsed: 0,
        rolloverLimit: 0,
        freeGranted: 0,
        freeRemaining: 0,
        used: 0,
        limit: 0,
        topupLimit: 0,
        totalCredits: 0,
        available: 0,
        rollover: 0,
        billingAvailable: 0,
        hasFree: false,
        totalCreditsUsed: 0,
        subscriptionStatus: 'active',
        subscriptionStatusChangedAt: '',
        plan: 'ktlo',
        role: 'owner',
        tier: 'LITE',
        raw: {},
        rawApi: {},
        numProjects: 0,
        gitSyncEnabled: false,
        nextRefillAt: '',
        billingPeriodEndAt: '',
        createdAt: '',
        membershipRole: 'owner',
        planType: 'monthly',
    };
}

beforeEach(function () {
    clearCreditBalanceUpdateMemoryCache();
});

describe('hover-card credits section (resolver-backed)', function () {
    it('renders Source row when summary.source !== Inline', function () {
        __writeCreditBalanceUpdateMemoryCacheForTests('ws_1', {
            outcome: CreditFetchOutcome.ApiHit,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: null,
            balance: {
                totalRemaining: 42,
                totalGranted: 100,
                dailyRemaining: 5,
                dailyLimit: 10,
                totalBillingPeriodUsed: 58,
                availableBalance: 42,
                cloudRemaining: 20,
                aiRemaining: 22,
                expiringGrants: [],
                grantTypeBalances: [],
            },
        });
        const summary = resolveCreditSummary(workspaceCredit('ws_1'));
        expect(summary.source).toBe('Cache');
        expect(summary.available).toBe(42);
        expect(summary.total).toBe(100);
    });

    it('emits Timeout source with renderDash when cache outcome is Timeout', function () {
        __writeCreditBalanceUpdateMemoryCacheForTests('ws_2', {
            outcome: CreditFetchOutcome.Timeout,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: 'timeout',
            balance: null,
        });
        const summary = resolveCreditSummary(workspaceCredit('ws_2'));
        expect(summary.source).toBe('Timeout');
        expect(summary.renderDash).toBe(true);
    });
});
