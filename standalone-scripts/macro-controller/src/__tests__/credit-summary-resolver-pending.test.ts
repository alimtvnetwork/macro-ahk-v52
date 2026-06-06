import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCredit } from '../types';

vi.mock('../settings-store', () => ({
    onSettingsChange: () => () => undefined,
}));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../credit-balance-update/credit-balance-fetcher', () => ({
    fetchWorkspaceCreditBalance: vi.fn(),
}));

import { resolveCreditSummary } from '../credit-balance-update/credit-summary-resolver';
import { clearCreditBalanceUpdateMemoryCache } from '../credit-balance-update/credit-balance-cache';

function ws(partial: Partial<WorkspaceCredit>): WorkspaceCredit {
    return {
        id: 'ws_pending', name: 'ws', fullName: 'workspace',
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

beforeEach(() => {
    clearCreditBalanceUpdateMemoryCache();
});

describe('resolveCreditSummary — Pending state (RCA 2026-06-06)', () => {
    it('returns Pending+renderDash for new-free workspace with no inline credits and no cache', () => {
        const summary = resolveCreditSummary(ws({ plan: 'ktlo', limit: 0, rawApi: { grant_type_balances: [] } }));
        expect(summary.source).toBe('Pending');
        expect(summary.renderDash).toBe(true);
        expect(summary.available).toBe(0);
        expect(summary.total).toBe(0);
    });

    it('returns Pending for all-zero grant_type_balances rows', () => {
        const summary = resolveCreditSummary(ws({
            plan: 'free',
            limit: 0,
            rawApi: { grant_type_balances: [{ total_granted: 0, total_remaining: 0, daily_limit: 0 }] },
        }));
        expect(summary.source).toBe('Pending');
        expect(summary.renderDash).toBe(true);
    });

    it('returns Inline (no dash) when inline credits are present', () => {
        const summary = resolveCreditSummary(ws({ limit: 50, available: 45, totalCredits: 50 }));
        expect(summary.source).toBe('Inline');
        expect(summary.renderDash).toBe(false);
        expect(summary.available).toBe(45);
    });

    it('does not flip to Pending for plans that do not require /credit-balance', () => {
        // pro_3 has inline-only credits — should be Inline/Missing, never Pending
        const summary = resolveCreditSummary(ws({ plan: 'pro_3', limit: 0, available: 0, totalCredits: 0 }));
        expect(summary.source).not.toBe('Pending');
        expect(summary.renderDash).toBe(false);
    });
});
