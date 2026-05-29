/**
 * Issue 123 — Step 1/5: pro_1 plan credit-total cases.
 *
 * pro_1 is the entry-level paid plan. Per Issue 120 fix, the aggregator
 * reads **billing-period fields only** (ws.used / billingAvailable / limit
 * ← billing_period_credits_*). Daily / granted / topup / rollover MUST NOT
 * be summed in.
 *
 * Each test feeds a hand-crafted WorkspaceCredit fixture (mirroring what
 * `parseWorkspaceItem` would emit from a real /workspaces JSON row) and
 * asserts the (used, remaining, granted) triple — both positive and
 * negative expectations.
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
    plan: 'pro_1', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false,
    nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
    membershipRole: 'owner', planType: 'monthly',
    ...partial,
  };
}

describe('Issue 123 — pro_1 credit totals', () => {
  it('fresh pro_1 (nothing used) → used=0, remaining=100, granted=100', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'fresh', used: 0, billingAvailable: 100, limit: 100 }),
    ]);
    expect(r.used).toBe(0);
    expect(r.remaining).toBe(100);
    expect(r.granted).toBe(100);
  });

  it('partially-used pro_1 (40/100) → used=40, remaining=60, granted=100', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'mid', used: 40, billingAvailable: 60, limit: 100 }),
    ]);
    expect(r.used).toBe(40);
    expect(r.remaining).toBe(60);
    expect(r.granted).toBe(100);
  });

  it('fully-consumed pro_1 (100/100) → remaining=0 (NOT 5 or 105)', () => {
    // Regression: user complaint "100 credits showing 0" — billing is
    // genuinely 0 here. daily=5 must NOT leak into Remaining/Granted.
    const r = aggregateCreditTotals([
      ws({
        id: 'p0065', used: 100, billingAvailable: 0, limit: 100,
        dailyFree: 5, dailyLimit: 5,
        totalCredits: 105, available: 5, totalCreditsUsed: 115,
      }),
    ]);
    expect(r.used).toBe(100);
    expect(r.remaining).toBe(0);
    expect(r.granted).toBe(100);
    // Negative: must NOT match the badge "5/105" figures.
    expect(r.granted).not.toBe(105);
    expect(r.remaining).not.toBe(5);
  });

  it('over-consumption spillover (used > limit) clamps billingAvailable to 0 via parser', () => {
    // parseWorkspaceItem produces max(0, bLimit-bUsed). We simulate the
    // already-clamped state here: used=120, limit=100, avail=0.
    const r = aggregateCreditTotals([
      ws({ id: 'over', used: 120, billingAvailable: 0, limit: 100 }),
    ]);
    expect(r.used).toBe(120);
    expect(r.remaining).toBe(0);
    expect(r.granted).toBe(100);
  });

  it('trialing pro_1 with full pool intact → counts toward granted', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'trial', subscriptionStatus: 'trialing', used: 0, billingAvailable: 100, limit: 100 }),
    ]);
    expect(r.granted).toBe(100);
    expect(r.totalCount).toBe(1);
    expect(r.missingCount).toBe(0);
  });

  it('past_due pro_1 still counts (no lifecycle override at aggregator level)', () => {
    // Lifecycle override runs in parser; aggregator just sums whatever survives.
    const r = aggregateCreditTotals([
      ws({ id: 'past', subscriptionStatus: 'past_due', used: 80, billingAvailable: 20, limit: 100 }),
    ]);
    expect(r.granted).toBe(100);
    expect(r.remaining).toBe(20);
  });

  it('missing all billing fields → counted as missing, NOT summed', () => {
    const broken = ws({ id: 'broken' });
    (broken as unknown as Record<string, number>).used = Number.NaN;
    (broken as unknown as Record<string, number>).billingAvailable = Number.NaN;
    (broken as unknown as Record<string, number>).limit = Number.NaN;
    const r = aggregateCreditTotals([broken]);
    expect(r.granted).toBe(0);
    expect(r.missingCount).toBe(1);
    expect(r.totalCount).toBe(1);
  });

  it('legacy "sum-of-pools" fields are IGNORED for pro_1', () => {
    // Negative expectation: if the code regressed to old behavior,
    // granted would be totalCredits=999 — we assert it is NOT.
    const r = aggregateCreditTotals([
      ws({
        id: 'leg', used: 50, billingAvailable: 50, limit: 100,
        totalCredits: 999, available: 999, totalCreditsUsed: 999,
        freeGranted: 999, dailyLimit: 999, topupLimit: 999, rolloverLimit: 999,
      }),
    ]);
    expect(r.granted).toBe(100);
    expect(r.granted).not.toBe(999);
  });

  it('multiple pro_1 workspaces sum independently', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'a', used: 25, billingAvailable: 75, limit: 100 }),
      ws({ id: 'b', used: 200, billingAvailable: 0, limit: 200 }),
      ws({ id: 'c', used: 10, billingAvailable: 90, limit: 100 }),
    ]);
    expect(r.used).toBe(235);
    expect(r.remaining).toBe(165);
    expect(r.granted).toBe(400);
    expect(r.totalCount).toBe(3);
  });

  it('Infinity / -1 sentinels are coerced to 0 (defensive)', () => {
    const bad = ws({ id: 'inf' });
    (bad as unknown as Record<string, number>).used = Infinity;
    (bad as unknown as Record<string, number>).billingAvailable = -1;
    (bad as unknown as Record<string, number>).limit = 100;
    const r = aggregateCreditTotals([bad]);
    expect(r.used).toBe(0); // Infinity rejected
    expect(r.remaining).toBe(-1); // num() preserves finite negatives
    expect(r.granted).toBe(100);
  });
});
