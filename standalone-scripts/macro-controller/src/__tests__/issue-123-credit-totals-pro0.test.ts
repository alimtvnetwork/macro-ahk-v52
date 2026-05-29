/**
 * Issue 123 — Step 3/5: pro_0 plan (enriched /credit-balance branch).
 *
 * pro_0 totals are sourced from the authoritative /credit-balance API
 * (total_granted / total_remaining / total_billing_period_used) which
 * `applyProZeroEnrichment` writes onto ws.totalCredits / available /
 * totalCreditsUsed. The aggregator reads THOSE fields for pro_0 only —
 * NEVER the billing-period fields (limit/used) which represent a
 * different concept on pro_0.
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
    plan: 'pro_0', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false,
    nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
    membershipRole: 'owner', planType: 'monthly',
    ...partial,
  };
}

describe('Issue 123 — pro_0 enriched credit totals', () => {
  it('fresh pro_0 (60-credit grant, nothing used) → 60/0/60', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'p0', totalCredits: 60, available: 60, totalCreditsUsed: 0 }),
    ]);
    expect(r.granted).toBe(60);
    expect(r.remaining).toBe(60);
    expect(r.used).toBe(0);
  });

  it('partial pro_0 (45/60 used) → 45/15/60', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'p0', totalCredits: 60, available: 15, totalCreditsUsed: 45 }),
    ]);
    expect(r.used).toBe(45);
    expect(r.remaining).toBe(15);
    expect(r.granted).toBe(60);
  });

  it('exhausted pro_0 (60/60) → remaining=0', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'p0', totalCredits: 60, available: 0, totalCreditsUsed: 60 }),
    ]);
    expect(r.remaining).toBe(0);
    expect(r.granted).toBe(60);
  });

  it('NEGATIVE: pro_0 IGNORES ws.limit/ws.used (billing-period fields)', () => {
    // pro_0 must read enriched fields, not the misleading billing values.
    const r = aggregateCreditTotals([
      ws({
        id: 'p0',
        totalCredits: 60, available: 15, totalCreditsUsed: 45,
        used: 99999, billingAvailable: 99999, limit: 99999,
      }),
    ]);
    expect(r.granted).toBe(60);
    expect(r.remaining).toBe(15);
    expect(r.used).toBe(45);
    expect(r.granted).not.toBe(99999);
  });

  it('missing all enriched fields → counted as missing (not summed)', () => {
    const broken = ws({ id: 'broken' });
    (broken as unknown as Record<string, number>).totalCredits = Number.NaN;
    (broken as unknown as Record<string, number>).available = Number.NaN;
    (broken as unknown as Record<string, number>).totalCreditsUsed = Number.NaN;
    const r = aggregateCreditTotals([broken]);
    expect(r.granted).toBe(0);
    expect(r.missingCount).toBe(1);
    expect(r.totalCount).toBe(1);
  });

  it('multiple pro_0 workspaces sum independently', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'a', totalCredits: 60, available: 10, totalCreditsUsed: 50 }),
      ws({ id: 'b', totalCredits: 30, available: 30, totalCreditsUsed: 0 }),
      ws({ id: 'c', totalCredits: 90, available: 45, totalCreditsUsed: 45 }),
    ]);
    expect(r.granted).toBe(180);
    expect(r.remaining).toBe(85);
    expect(r.used).toBe(95);
    expect(r.totalCount).toBe(3);
  });

  it('mixed pro_0 + pro_1 reads each plan via correct branch', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'p0', plan: 'pro_0', totalCredits: 60, available: 20, totalCreditsUsed: 40 }),
      ws({ id: 'p1', plan: 'pro_1', used: 50, billingAvailable: 50, limit: 100 }),
    ]);
    expect(r.granted).toBe(160);   // 60 + 100
    expect(r.remaining).toBe(70);  // 20 + 50
    expect(r.used).toBe(90);       // 40 + 50
  });

  it('pro_0 with fractional remaining (server returns fractions) is rounded', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'frac', totalCredits: 60.4, available: 14.6, totalCreditsUsed: 45.5 }),
    ]);
    expect(r.granted).toBe(60);
    expect(r.remaining).toBe(15);
    expect(r.used).toBe(46);
  });

  it('case-insensitive plan match: "PRO_0" still hits enriched branch', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'cap', plan: 'PRO_0', totalCredits: 60, available: 10, totalCreditsUsed: 50, limit: 9999 }),
    ]);
    expect(r.granted).toBe(60); // enriched branch, NOT limit=9999
  });

  it('pro_0 with whitespace-padded plan ("  pro_0 ") hits enriched branch', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'pad', plan: '  pro_0 ', totalCredits: 30, available: 5, totalCreditsUsed: 25, limit: 9999 }),
    ]);
    expect(r.granted).toBe(30);
    expect(r.granted).not.toBe(9999);
  });
});
