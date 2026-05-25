/**
 * Unit tests — Group B: wiring & invariants (8 tests)
 *
 * Spec: spec/22-app-issues/114-pro-zero-credit-balance-calculation.md §6 Group B, §5 Step 2
 *
 * IDs anonymized: ws-001, owner-uid-001, owner@sample.com.
 */

import { describe, it, expect } from 'vitest';
import { buildSummary } from '../pro-zero/pro-zero-credit-summary';
import { calculateProZeroCreditSummary } from '../pro-zero/pro-zero-credit-calculator';
import {
    applySummaryToRow,
    PRO_ZERO_BILLING_REMAINING_FIELD,
    PRO_ZERO_TOPUP_REMAINING_FIELD,
    PRO_ZERO_BONUS_REMAINING_FIELD,
    PRO_ZERO_ROLLOVER_REMAINING_FIELD,
    PRO_ZERO_DAILY_REMAINING_FIELD,
} from '../pro-zero/pro-zero-enrichment';
import { calcTotalCredits, calcAvailableCredits } from '../credit-api';
import { CreditGrantType } from '../pro-zero/credit-grant-type';
import type { CreditBalanceResponseTyped } from '../pro-zero/credit-balance-response-typed';
import type { WorkspaceCredit } from '../types';

function refBalance(): CreditBalanceResponseTyped {
    return {
        ledger_enabled: false,
        total_remaining: 76,
        total_granted: 205,
        daily_remaining: 5,
        daily_limit: 5,
        total_billing_period_used: 144,
        expiring_grants: [],
        grant_type_balances: [
            { grant_type: CreditGrantType.DAILY, granted: 5, remaining: 5 },
            { grant_type: CreditGrantType.BILLING, granted: 200, remaining: 71 },
        ],
    };
}

function emptyWs(): WorkspaceCredit {
    const ws: WorkspaceCredit = {
        id: 'ws-001', name: 'ws-001', fullName: 'ws-001 / owner@sample.com',
        dailyFree: 0, dailyUsed: 0, dailyLimit: 0,
        rolloverUsed: 0, rolloverLimit: 0,
        freeGranted: 0, freeRemaining: 0,
        used: 0, limit: 0, topupLimit: 0,
        totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
        hasFree: false, totalCreditsUsed: 0,
        subscriptionStatus: '', subscriptionStatusChangedAt: '',
        plan: 'pro_0', role: 'owner', tier: 'PRO_ZERO',
        raw: {}, rawApi: {},
        numProjects: 0, gitSyncEnabled: false,
        nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
        membershipRole: 'owner', planType: 'monthly',
    };

    return ws;
}

describe('Group B — wiring & invariants', () => {
    it('B13: buildSummary returns same object as calculateProZeroCreditSummary', () => {
        const balance = refBalance();
        const a = buildSummary(balance);
        const b = calculateProZeroCreditSummary(balance, 0);
        // Ignore ExpiringSoonCredits which depends on nowMs (no expiring grants here anyway)
        expect({ ...a, ExpiringSoonCredits: 0 }).toEqual({ ...b, ExpiringSoonCredits: 0 });
    });

    it('B14: applySummaryToRow copies Total/Available/TotalUsed verbatim (no recompute)', () => {
        const ws = emptyWs();
        const summary = calculateProZeroCreditSummary(refBalance(), 0);
        applySummaryToRow(ws, summary, '{}');
        expect(ws.totalCredits).toBe(205);
        expect(ws.available).toBe(76);
        expect(ws.totalCreditsUsed).toBe(144);
    });

    it('B15: applySummaryToRow writes all 5 sub-bucket fields onto WorkspaceCredit', () => {
        const ws = emptyWs();
        const balance = refBalance();
        balance.grant_type_balances.push(
            { grant_type: CreditGrantType.TOPUP, granted: 20, remaining: 10 },
            { grant_type: CreditGrantType.BONUS, granted: 15, remaining: 8 },
            { grant_type: CreditGrantType.ROLLOVER, granted: 30, remaining: 12 },
        );
        applySummaryToRow(ws, calculateProZeroCreditSummary(balance, 0), '{}');
        expect(ws[PRO_ZERO_BILLING_REMAINING_FIELD]).toBe(71);
        expect(ws[PRO_ZERO_TOPUP_REMAINING_FIELD]).toBe(10);
        expect(ws[PRO_ZERO_BONUS_REMAINING_FIELD]).toBe(8);
        expect(ws[PRO_ZERO_ROLLOVER_REMAINING_FIELD]).toBe(12);
        expect(ws[PRO_ZERO_DAILY_REMAINING_FIELD]).toBe(5);
    });

    it('B16: calcTotalCredits throws when called with plan=pro_0', () => {
        expect(() => calcTotalCredits(5, 5, 200, 0, 0, 'pro_0')).toThrow(/CODE RED.*calcTotalCredits/);
    });

    it('B17: calcAvailableCredits throws when called with plan=pro_0', () => {
        expect(() => calcAvailableCredits(205, 0, 0, 0, 0, 'pro_0')).toThrow(/CODE RED.*calcAvailableCredits/);
    });

    it('B18: non-pro_0 plan flows through legacy calcTotalCredits unchanged', () => {
        expect(calcTotalCredits(100, 10, 50, 5, 5, 'pro')).toBe(170);
        expect(calcTotalCredits(100, 10, 50, 5, 5)).toBe(170); // no plan param
        expect(calcAvailableCredits(170, 1, 2, 3, 4, 'pro')).toBe(160);
    });

    it('B19: applySummaryToRow sets billingAvailable to BillingRemaining (NOT Total-TotalUsed)', () => {
        const ws = emptyWs();
        const summary = calculateProZeroCreditSummary(refBalance(), 0);
        applySummaryToRow(ws, summary, '{}');
        // Total-TotalUsed = 205-144 = 61. BillingRemaining = 71. Must use BillingRemaining.
        expect(ws.billingAvailable).toBe(71);
        expect(ws.billingAvailable).not.toBe(61);
    });

    it('B20: missing grant_type_balances → all sub-buckets default to 0, no throw', () => {
        const balance = refBalance();
        balance.grant_type_balances = [];
        const summary = calculateProZeroCreditSummary(balance, 0);
        expect(summary.BillingRemaining).toBe(0);
        expect(summary.TopupRemaining).toBe(0);
        expect(summary.BonusRemaining).toBe(0);
        expect(summary.RolloverRemaining).toBe(0);
    });
});
