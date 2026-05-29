/**
 * Issue 123 — Step 2/5: pro_3, lite, ktlo plan credit-total cases.
 *
 * These plans share the same aggregator branch as pro_1 — billing-period
 * fields only. Verifies the branch covers higher-tier and lite/ktlo plans.
 */

import { describe, it, expect } from 'vitest';
import { aggregateCreditTotals } from '../credit-totals';
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

describe('Issue 123 — pro_3 / lite / ktlo credit totals', () => {
  it('pro_3 fresh (1500 cap) → granted=1500, remaining=1500', () => {
    const r = aggregateCreditTotals([
      ws({ plan: 'pro_3', used: 0, billingAvailable: 1500, limit: 1500 }),
    ]);
    expect(r.granted).toBe(1500);
    expect(r.remaining).toBe(1500);
  });

  it('pro_3 partial (320/400) → 320 used, 80 remaining, 400 granted', () => {
    const r = aggregateCreditTotals([
      ws({ plan: 'pro_3', used: 320, billingAvailable: 80, limit: 400 }),
    ]);
    expect(r.used).toBe(320);
    expect(r.remaining).toBe(80);
    expect(r.granted).toBe(400);
  });

  it('pro_3 fully consumed (1500/1500) → remaining=0', () => {
    const r = aggregateCreditTotals([
      ws({ plan: 'pro_3', used: 1500, billingAvailable: 0, limit: 1500 }),
    ]);
    expect(r.remaining).toBe(0);
    expect(r.granted).toBe(1500);
  });

  it('lite plan reads billing-period fields (no pro_0 enrichment)', () => {
    const r = aggregateCreditTotals([
      ws({ plan: 'lite', tier: 'LITE', used: 120, billingAvailable: 80, limit: 200 }),
    ]);
    expect(r.granted).toBe(200);
    expect(r.remaining).toBe(80);
    expect(r.used).toBe(120);
  });

  it('ktlo plan reads billing-period fields', () => {
    const r = aggregateCreditTotals([
      ws({ plan: 'ktlo', tier: 'LITE', used: 5, billingAvailable: 45, limit: 50 }),
    ]);
    expect(r.granted).toBe(50);
    expect(r.remaining).toBe(45);
    expect(r.used).toBe(5);
  });

  it('mixed pro_3 + lite + ktlo sums correctly', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'a', plan: 'pro_3', used: 500, billingAvailable: 1000, limit: 1500 }),
      ws({ id: 'b', plan: 'lite', tier: 'LITE', used: 100, billingAvailable: 100, limit: 200 }),
      ws({ id: 'c', plan: 'ktlo', tier: 'LITE', used: 50, billingAvailable: 0, limit: 50 }),
    ]);
    expect(r.used).toBe(650);
    expect(r.remaining).toBe(1100);
    expect(r.granted).toBe(1750);
    expect(r.totalCount).toBe(3);
  });

  it('NEGATIVE: pro_3 with stale totalCredits=99999 does not leak into granted', () => {
    const r = aggregateCreditTotals([
      ws({ plan: 'pro_3', used: 0, billingAvailable: 1500, limit: 1500, totalCredits: 99999 }),
    ]);
    expect(r.granted).toBe(1500);
    expect(r.granted).not.toBe(99999);
  });

  it('NEGATIVE: lite plan never reads the pro_0 enrichment fields', () => {
    // available / totalCreditsUsed should be ignored.
    const r = aggregateCreditTotals([
      ws({
        plan: 'lite', tier: 'LITE',
        used: 10, billingAvailable: 40, limit: 50,
        available: 777, totalCreditsUsed: 777, totalCredits: 777,
      }),
    ]);
    expect(r.used).toBe(10);
    expect(r.remaining).toBe(40);
    expect(r.granted).toBe(50);
  });

  it('fractional pro_3 values are rounded after summing', () => {
    const r = aggregateCreditTotals([
      ws({ plan: 'pro_3', used: 333.33, billingAvailable: 666.67, limit: 1000 }),
      ws({ plan: 'pro_3', used: 0.4, billingAvailable: 99.6, limit: 100 }),
    ]);
    expect(r.used).toBe(334);
    expect(r.remaining).toBe(766);
    expect(r.granted).toBe(1100);
  });

  it('zero-limit lite (mis-provisioned) is counted as missing data', () => {
    const broken = ws({ plan: 'lite', tier: 'LITE' });
    (broken as unknown as Record<string, number>).used = Number.NaN;
    (broken as unknown as Record<string, number>).billingAvailable = Number.NaN;
    (broken as unknown as Record<string, number>).limit = Number.NaN;
    const r = aggregateCreditTotals([broken]);
    expect(r.missingCount).toBe(1);
    expect(r.totalCount).toBe(1);
    expect(r.granted).toBe(0);
  });
});
