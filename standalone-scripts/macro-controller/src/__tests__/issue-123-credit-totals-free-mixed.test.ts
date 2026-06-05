/**
 * Issue 123 — Step 4/5: FREE-tier exclusion + mixed-plan edge cases.
 *
 * FREE workspaces (plan='free' OR tier='FREE') are excluded from
 * Used/Remaining/Granted sums. Their `dailyFree` value still feeds the
 * Free-Daily card (per-account semantics).
 */

import { describe, it, expect } from 'vitest';
import { aggregateCreditTotals, FREE_DAILY_CAP } from '../credit-totals';
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
    plan: 'free', role: 'owner', tier: 'FREE',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false,
    nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
    membershipRole: 'owner', planType: 'monthly',
    ...partial,
  };
}

describe('Issue 123 — FREE-tier exclusion + mixed lists', () => {
  it('all-FREE list → granted=0, totalCount=0, but daily surfaces', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'f1', dailyFree: 5 }),
      ws({ id: 'f2', dailyFree: 3 }),
    ]);
    expect(r.granted).toBe(0);
    expect(r.used).toBe(0);
    expect(r.remaining).toBe(0);
    expect(r.totalCount).toBe(0);
    expect(r.freeDailyRemaining).toBe(5);
  });

  it('FREE with bogus billing fields stays excluded', () => {
    // Even if a FREE row has stray billing numbers, never sum them.
    const r = aggregateCreditTotals([
      ws({ id: 'f', used: 999, billingAvailable: 999, limit: 999 }),
    ]);
    expect(r.granted).toBe(0);
    expect(r.used).toBe(0);
    expect(r.totalCount).toBe(0);
  });

  it('plan="free" alone (no tier) triggers exclusion', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'f', plan: 'free', tier: '', limit: 100, used: 0, billingAvailable: 100 }),
    ]);
    expect(r.granted).toBe(0);
    expect(r.totalCount).toBe(0);
  });

  it('tier="FREE" alone (plan empty) also triggers exclusion', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'f', plan: '', tier: 'FREE', limit: 100, used: 0, billingAvailable: 100 }),
    ]);
    expect(r.granted).toBe(0);
    expect(r.totalCount).toBe(0);
  });

  it('mixed FREE + pro_1 + pro_0 → only paid rows in totals', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'f', plan: 'free', tier: 'FREE', dailyFree: 4 }),
      ws({ id: 'p1', plan: 'pro_1', tier: 'PRO', used: 30, billingAvailable: 70, limit: 100 }),
      ws({ id: 'p0', plan: 'pro_0', tier: 'PRO', totalCredits: 60, available: 20, totalCreditsUsed: 40 }),
    ]);
    expect(r.granted).toBe(160);
    expect(r.remaining).toBe(90);
    expect(r.used).toBe(70);
    expect(r.totalCount).toBe(2); // FREE excluded
    expect(r.freeDailyRemaining).toBe(4);
  });

  it('dailyFree is MAX across all rows (incl. FREE) — per-account semantics', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'a', plan: 'pro_1', limit: 100, dailyFree: 2 }),
      ws({ id: 'b', plan: 'free', tier: 'FREE', dailyFree: 5 }),
      ws({ id: 'c', plan: 'pro_3', limit: 200, dailyFree: 1 }),
    ]);
    expect(r.freeDailyRemaining).toBe(5);
  });

  it('dailyFree is clamped at FREE_DAILY_CAP=5 even when a row reports more', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'a', plan: 'pro_1', limit: 1, dailyFree: 999 }),
    ]);
    expect(r.freeDailyRemaining).toBe(FREE_DAILY_CAP);
    expect(FREE_DAILY_CAP).toBe(5);
  });

  it('NEGATIVE: FREE row never increases totalCount', () => {
    const r = aggregateCreditTotals([
      ws({ id: 'f1', plan: 'free', tier: 'FREE' }),
      ws({ id: 'f2', plan: 'free', tier: 'FREE' }),
      ws({ id: 'f3', plan: 'free', tier: 'FREE' }),
    ]);
    expect(r.totalCount).toBe(0);
    expect(r.missingCount).toBe(0);
  });

  it('empty workspace list returns all-zero result with valid reset timestamp', () => {
    const r = aggregateCreditTotals([], new Date('2026-05-29T12:00:00Z'));
    expect(r.used).toBe(0);
    expect(r.remaining).toBe(0);
    expect(r.granted).toBe(0);
    expect(r.totalCount).toBe(0);
    expect(r.missingCount).toBe(0);
    expect(r.resetAtLocal).toMatch(/T00:00:00\.000Z$/);
  });

  it('FREE row with NaN billing fields does not pollute missingCount', () => {
    const broken = ws({ id: 'f', plan: 'free', tier: 'FREE' });
    (broken as unknown as Record<string, number>).used = Number.NaN;
    (broken as unknown as Record<string, number>).billingAvailable = Number.NaN;
    (broken as unknown as Record<string, number>).limit = Number.NaN;
    const r = aggregateCreditTotals([broken]);
    expect(r.missingCount).toBe(0); // FREE excluded BEFORE missing check
    expect(r.totalCount).toBe(0);
  });
});
