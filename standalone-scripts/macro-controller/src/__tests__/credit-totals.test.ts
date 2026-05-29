/**
 * Issue 116 + Issue 120 — Credit Totals aggregator tests.
 *
 * Covers: empty list, single workspace, multi-workspace sum, missing-data
 * exclusion, daily MAX, MYT-midnight reset, FREE_DAILY_CAP clamp,
 * pro_1/pro_3 billing-period-only Total, pro_0 enriched-field Total,
 * and FREE-tier exclusion.
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateCreditTotals,
  computeNextMytMidnight,
  FREE_DAILY_CAP,
} from '../credit-totals';
import type { WorkspaceCredit } from '../types';

function ws(partial: Partial<WorkspaceCredit>): WorkspaceCredit {
  return {
    id: 'w', name: 'w', fullName: 'w',
    dailyFree: 0, dailyUsed: 0, dailyLimit: 5,
    rolloverUsed: 0, rolloverLimit: 0,
    freeGranted: 0, freeRemaining: 0,
    used: 0, limit: 0, topupLimit: 0,
    totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
    hasFree: false, totalCreditsUsed: 0,
    subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
    plan: 'pro_3', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false,
    nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
    membershipRole: 'owner', planType: 'monthly',
    ...partial,
  };
}

describe('aggregateCreditTotals', () => {
  it('returns zeros for an empty workspace list', () => {
    const result = aggregateCreditTotals([], new Date('2026-05-25T12:00:00Z'));
    expect(result.used).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.granted).toBe(0);
    expect(result.freeDailyRemaining).toBe(0);
    expect(result.freeDailyCap).toBe(FREE_DAILY_CAP);
    expect(result.missingCount).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it('sums billing-period fields for non-pro_0 plans and enriched fields for pro_0', () => {
    const result = aggregateCreditTotals([
      // pro_3: read ws.used / billingAvailable / limit
      ws({ id: 'a', plan: 'pro_3', used: 320, billingAvailable: 80, limit: 400 }),
      // pro_0 (enriched): read totalCreditsUsed / available / totalCredits
      ws({ id: 'b', plan: 'pro_0', totalCreditsUsed: 45, available: 15, totalCredits: 60 }),
      // pro_3: billing fields
      ws({ id: 'c', plan: 'pro_3', used: 1000, billingAvailable: 500, limit: 1500 }),
    ]);
    expect(result.used).toBe(1365);
    expect(result.remaining).toBe(595);
    expect(result.granted).toBe(1960);
    expect(result.totalCount).toBe(3);
    expect(result.missingCount).toBe(0);
  });

  it('Issue 120: pro_1 Total equals billing_period_credits_limit ONLY (no granted/daily/topup/rollover added)', () => {
    // Real-world pro_1 row: billing 200/100 used, with daily=5, granted=100,
    // topup=50, rollover=10 ALSO present on the raw record. Legacy aggregator
    // would have produced Total = 100+5+200+50+10 = 365. Correct value is 200.
    const proOne = ws({
      id: 'p1', plan: 'pro_1', tier: 'PRO',
      used: 100, billingAvailable: 100, limit: 200,
      // Legacy "sum-of-pools" fields — MUST be ignored for non-pro_0:
      totalCredits: 365, available: 165, totalCreditsUsed: 100,
      dailyFree: 5, dailyLimit: 5,
      freeGranted: 100, freeRemaining: 100,
      rollover: 10, rolloverLimit: 10, topupLimit: 50,
    });
    const result = aggregateCreditTotals([proOne]);
    expect(result.granted).toBe(200);
    expect(result.used).toBe(100);
    expect(result.remaining).toBe(100);
  });

  it('excludes FREE-tier workspaces from billing totals but still surfaces daily free', () => {
    const result = aggregateCreditTotals([
      ws({ id: 'free1', plan: 'free', tier: 'FREE', used: 0, billingAvailable: 0, limit: 0, dailyFree: 3 }),
      ws({ id: 'pro', plan: 'pro_1', tier: 'PRO', used: 50, billingAvailable: 150, limit: 200, dailyFree: 5 }),
    ]);
    expect(result.used).toBe(50);
    expect(result.remaining).toBe(150);
    expect(result.granted).toBe(200);
    expect(result.totalCount).toBe(1); // FREE excluded
    expect(result.freeDailyRemaining).toBe(5);
  });

  it('excludes workspaces with no billing-period fields and reports missingCount', () => {
    const broken = ws({ id: 'broken', plan: 'pro_1' });
    (broken as unknown as Record<string, number>).used = Number.NaN;
    (broken as unknown as Record<string, number>).billingAvailable = Number.NaN;
    (broken as unknown as Record<string, number>).limit = Number.NaN;

    const result = aggregateCreditTotals([
      ws({ id: 'ok', plan: 'pro_1', used: 10, billingAvailable: 20, limit: 30 }),
      broken,
    ]);
    expect(result.used).toBe(10);
    expect(result.remaining).toBe(20);
    expect(result.granted).toBe(30);
    expect(result.missingCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  it('takes the MAX of dailyFree across workspaces (per-account semantics)', () => {
    const result = aggregateCreditTotals([
      ws({ id: 'a', plan: 'pro_1', limit: 1, dailyFree: 2 }),
      ws({ id: 'b', plan: 'pro_1', limit: 1, dailyFree: 4 }),
      ws({ id: 'c', plan: 'pro_1', limit: 1, dailyFree: 1 }),
    ]);
    expect(result.freeDailyRemaining).toBe(4);
  });

  it('clamps freeDailyRemaining to FREE_DAILY_CAP', () => {
    const result = aggregateCreditTotals([
      ws({ id: 'a', plan: 'pro_1', limit: 1, dailyFree: 99 }),
    ]);
    expect(result.freeDailyRemaining).toBe(FREE_DAILY_CAP);
  });

  it('rounds non-integer sums (defensive — server sometimes returns fractions)', () => {
    const result = aggregateCreditTotals([
      ws({ id: 'a', plan: 'pro_1', used: 10.4, billingAvailable: 20.6, limit: 31 }),
      ws({ id: 'b', plan: 'pro_1', used: 5.1, billingAvailable: 0.4, limit: 5.5 }),
    ]);
    expect(result.used).toBe(16);
    expect(result.remaining).toBe(21);
    expect(result.granted).toBe(37);
  });
});

describe('computeNextMytMidnight', () => {
  it('returns next MYT midnight as ISO when now is mid-day UTC', () => {
    const result = computeNextMytMidnight(new Date('2026-05-25T12:00:00Z'));
    expect(result).toBe('2026-05-25T16:00:00.000Z');
  });

  it('rolls to the next calendar day in MYT when now is just before MYT midnight', () => {
    const result = computeNextMytMidnight(new Date('2026-05-25T15:30:00Z'));
    expect(result).toBe('2026-05-25T16:00:00.000Z');
  });

  it('rolls forward when now is just past MYT midnight', () => {
    const result = computeNextMytMidnight(new Date('2026-05-25T16:30:00Z'));
    expect(result).toBe('2026-05-26T16:00:00.000Z');
  });
});
