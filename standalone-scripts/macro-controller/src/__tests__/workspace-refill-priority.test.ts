/**
 * Tests for workspace-refill-priority.ts (v3.10.0)
 */

import { describe, it, expect } from 'vitest';
import {
  computeRefillScore,
  daysToRefillForWs,
  sortByRefillPriority,
} from '../workspace-refill-priority';
import type { WorkspaceCredit } from '../types';

const NOW = Date.parse('2026-05-24T00:00:00Z');

function makeWs(partial: Partial<WorkspaceCredit>): WorkspaceCredit {
  return {
    id: 'ws-1',
    name: 'n', fullName: 'n',
    used: 0, limit: 0, rolloverUsed: 0, rolloverLimit: 0,
    dailyUsed: 0, dailyLimit: 0, freeGranted: 0, freeRemaining: 0,
    topupLimit: 0,
    available: 0, totalCredits: 0, totalCreditsUsed: 0,
    billingAvailable: 0, rollover: 0, dailyFree: 0,
    tier: 'FREE',
    ...partial,
  } as WorkspaceCredit;
}

function daysFromNow(d: number): string {
  return new Date(NOW + d * 86_400_000).toISOString();
}

describe('daysToRefillForWs', () => {
  it('returns null when no date present', () => {
    expect(daysToRefillForWs(makeWs({}), NOW)).toBeNull();
  });
  it('uses nextRefillAt when set', () => {
    const ws = makeWs({ nextRefillAt: daysFromNow(3) });
    expect(daysToRefillForWs(ws, NOW)).toBe(3);
  });
  it('falls back to billingPeriodEndAt', () => {
    const ws = makeWs({ billingPeriodEndAt: daysFromNow(5) });
    expect(daysToRefillForWs(ws, NOW)).toBe(5);
  });
  it('returns null for past refill dates', () => {
    const ws = makeWs({ nextRefillAt: daysFromNow(-2) });
    expect(daysToRefillForWs(ws, NOW)).toBeNull();
  });
});

describe('computeRefillScore', () => {
  it('multiplies urgency × available', () => {
    const ws = makeWs({ nextRefillAt: daysFromNow(2), available: 50 });
    // urgency = 10 - 2 = 8; score = 8 * 50 = 400
    expect(computeRefillScore(ws, 10, NOW)).toBe(400);
  });
  it('clamps urgency to 0 when refill is beyond window', () => {
    const ws = makeWs({ nextRefillAt: daysFromNow(20), available: 100 });
    expect(computeRefillScore(ws, 10, NOW)).toBe(0);
  });
  it('returns 0 when no refill date', () => {
    expect(computeRefillScore(makeWs({ available: 100 }), 10, NOW)).toBe(0);
  });
  it('returns 0 when available is non-positive', () => {
    const ws = makeWs({ nextRefillAt: daysFromNow(1), available: 0 });
    expect(computeRefillScore(ws, 10, NOW)).toBe(0);
  });
});

describe('sortByRefillPriority', () => {
  it('orders high score before low score, ties break by available then id', () => {
    const rows = [
      { ws: makeWs({ id: 'a', nextRefillAt: daysFromNow(8), available: 100 }) }, // 2*100=200
      { ws: makeWs({ id: 'b', nextRefillAt: daysFromNow(1), available: 50 }) },  // 9*50=450
      { ws: makeWs({ id: 'c', available: 999 }) },                                // 0
      { ws: makeWs({ id: 'd', nextRefillAt: daysFromNow(1), available: 50 }) },  // 9*50=450 tie with b
    ];
    const sorted = sortByRefillPriority(rows, 10, NOW);
    expect(sorted.map(function (r) { return r.ws.id; })).toEqual(['b', 'd', 'a', 'c']);
  });
});
