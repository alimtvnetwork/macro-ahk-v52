/**
 * Verify CreditSummary preserves the wire fields added 2026-06:
 *   - available_balance → summary.availableBalance
 *   - cloud_remaining   → summary.cloudRemaining
 *   - ai_remaining      → summary.aiRemaining
 *
 * Covers both paths through credit-summary-resolver:
 *   1. buildCachedSummary  — populated from CreditBalance cache hit
 *   2. zeroSummary         — Pending/Timeout sentinel
 *   3. inline (non-cache)  — workspace has no /credit-balance cache row
 *
 * Plus an end-to-end parser check so the resolver receives the new fields
 * when the wire response includes them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCredit } from '../types';

vi.mock('../settings-store', () => ({ onSettingsChange: () => () => undefined }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../credit-balance-update/credit-balance-fetcher', () => ({
    fetchWorkspaceCreditBalance: vi.fn(),
}));

import { resolveCreditSummary } from '../credit-balance-update/credit-summary-resolver';
import {
    __writeCreditBalanceUpdateMemoryCacheForTests,
    clearCreditBalanceUpdateMemoryCache,
} from '../credit-balance-update/credit-balance-cache';
import { CreditFetchOutcome } from '../credit-balance-update/credit-fetch-outcome';
import { parseCreditBalance } from '../credit-balance-update/credit-balance-parser';

function ws(partial: Partial<WorkspaceCredit>): WorkspaceCredit {
    return {
        id: 'ws_new_fields', name: 'ws', fullName: 'workspace',
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

beforeEach(() => { clearCreditBalanceUpdateMemoryCache(); });

describe('CreditSummary — wire fields available_balance / cloud_remaining / ai_remaining', () => {
    it('buildCachedSummary surfaces the three fields from the cached balance', () => {
        __writeCreditBalanceUpdateMemoryCacheForTests('ws_cached', {
            outcome: CreditFetchOutcome.ApiHit,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: null,
            balance: {
                totalRemaining: 300, totalGranted: 310,
                dailyRemaining: 5, dailyLimit: 5,
                totalBillingPeriodUsed: 10,
                availableBalance: 300,
                cloudRemaining: 120,
                aiRemaining: 180,
                expiringGrants: [],
                grantTypeBalances: [],
            },
        });
        const s = resolveCreditSummary(ws({ id: 'ws_cached' }));
        expect(s.source).toBe('Cache');
        expect(s.availableBalance).toBe(300);
        expect(s.cloudRemaining).toBe(120);
        expect(s.aiRemaining).toBe(180);
    });

    it('buildCachedSummary rounds and floors at 0', () => {
        __writeCreditBalanceUpdateMemoryCacheForTests('ws_round', {
            outcome: CreditFetchOutcome.ApiHit,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: null,
            balance: {
                totalRemaining: 1, totalGranted: 1,
                dailyRemaining: 0, dailyLimit: 0,
                totalBillingPeriodUsed: 0,
                availableBalance: 12.6,
                cloudRemaining: -4,
                aiRemaining: 7.4,
                expiringGrants: [],
                grantTypeBalances: [],
            },
        });
        const s = resolveCreditSummary(ws({ id: 'ws_round' }));
        expect(s.availableBalance).toBe(13);
        expect(s.cloudRemaining).toBe(0);
        expect(s.aiRemaining).toBe(7);
    });

    it('zeroSummary (Pending) reports 0 for all three fields', () => {
        const s = resolveCreditSummary(ws({ id: 'ws_pending', plan: 'ktlo', limit: 0 }));
        expect(s.source).toBe('Pending');
        expect(s.availableBalance).toBe(0);
        expect(s.cloudRemaining).toBe(0);
        expect(s.aiRemaining).toBe(0);
    });

    it('zeroSummary (Timeout) reports 0 for all three fields', () => {
        __writeCreditBalanceUpdateMemoryCacheForTests('ws_timeout', {
            outcome: CreditFetchOutcome.Timeout,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: 'timeout',
            balance: null,
        });
        const s = resolveCreditSummary(ws({ id: 'ws_timeout' }));
        expect(s.source).toBe('Timeout');
        expect(s.availableBalance).toBe(0);
        expect(s.cloudRemaining).toBe(0);
        expect(s.aiRemaining).toBe(0);
    });

    it('inline (non-cache) path reports 0 for all three fields', () => {
        const s = resolveCreditSummary(ws({ id: 'ws_inline', limit: 50, available: 45, totalCredits: 50 }));
        expect(s.source).toBe('Inline');
        expect(s.availableBalance).toBe(0);
        expect(s.cloudRemaining).toBe(0);
        expect(s.aiRemaining).toBe(0);
    });

    it('parser → resolver round-trip preserves the wire fields end-to-end', () => {
        const balance = parseCreditBalance({
            total_remaining: 300, total_granted: 310,
            daily_remaining: 5, daily_limit: 5,
            total_billing_period_used: 10,
            available_balance: 295,
            cloud_remaining: 100,
            ai_remaining: 195,
            expiring_grants: [],
            grant_type_balances: [],
        });
        __writeCreditBalanceUpdateMemoryCacheForTests('ws_roundtrip', {
            outcome: CreditFetchOutcome.ApiHit,
            fetchedAt: Date.now(),
            sourceUrl: 'test',
            errorDetail: null,
            balance,
        });
        const s = resolveCreditSummary(ws({ id: 'ws_roundtrip' }));
        expect(s.availableBalance).toBe(295);
        expect(s.cloudRemaining).toBe(100);
        expect(s.aiRemaining).toBe(195);
    });

    it('parser defaults missing wire fields to 0 (backwards compatible)', () => {
        const balance = parseCreditBalance({
            total_remaining: 0, total_granted: 0,
            daily_remaining: 0, daily_limit: 0,
            total_billing_period_used: 0,
            expiring_grants: [],
            grant_type_balances: [],
        });
        expect(balance.availableBalance).toBe(0);
        expect(balance.cloudRemaining).toBe(0);
        expect(balance.aiRemaining).toBe(0);
    });
});
