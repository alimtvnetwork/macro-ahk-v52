/**
 * Issue 118 — Integration coverage for past-due workspace lifecycle UI.
 *
 * Builds on the unit coverage in `issue-118-past-due.test.ts` with end-to-end
 * checks for the hover card sections, sort order, tone-ramp boundaries, and
 * priority of past_due / unpaid over refill/cancel.
 */

import { describe, it, expect } from 'vitest';
import { getEffectiveStatus } from '../workspace-status';
import {
  classifyWorkspaceDisplayStatus,
  pickPastDueTone,
} from '../workspace-display-status';
import { buildWorkspaceHoverHtml } from '../ws-hover-card';
import {
  SubscriptionStatus,
  WsTierValue,
  isPastDueStatus,
  isCanceledStatus,
} from '../types/subscription-status';
import type { WorkspaceCredit } from '../types';
import type { WorkspaceLifecycleConfig } from '../workspace-lifecycle-config';

const CFG: WorkspaceLifecycleConfig = {
  expiryGracePeriodDays: 30,
  refillWarningThresholdDays: 7,
  enableWorkspaceStatusLabels: true,
  enableWorkspaceHoverDetails: true,
};

const NOW = Date.parse('2026-04-22T00:00:00Z');

function makeWs(overrides: Partial<WorkspaceCredit> = {}): WorkspaceCredit {
  return {
    id: 'ws_test', name: 'WS', fullName: 'WS Full',
    dailyFree: 0, dailyUsed: 0, dailyLimit: 0,
    rolloverUsed: 0, rolloverLimit: 0,
    freeGranted: 0, freeRemaining: 0,
    used: 0, limit: 0, topupLimit: 0,
    totalCredits: 100, available: 50, rollover: 20, billingAvailable: 30,
    hasFree: false, totalCreditsUsed: 0,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscriptionStatusChangedAt: '',
    plan: 'pro_1', role: 'owner', tier: WsTierValue.PRO,
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false, nextRefillAt: '',
    billingPeriodEndAt: '', createdAt: '', membershipRole: '', planType: 'monthly',
    ...overrides,
  };
}

function pastDueWs(daysSince: number, extra: Partial<WorkspaceCredit> = {}): WorkspaceCredit {
  return makeWs({
    subscriptionStatus: SubscriptionStatus.PAST_DUE,
    subscriptionStatusChangedAt: new Date(NOW - daysSince * 86_400_000).toISOString(),
    ...extra,
  });
}

describe('Issue 118 integration — tone-ramp boundary precision', () => {
  it('day 2 → muted (last muted day)', () => {
    expect(pickPastDueTone(2)).toBe('muted');
  });

  it('day 3 → warning (first warning day)', () => {
    expect(pickPastDueTone(3)).toBe('warning');
  });

  it('day 9 → warning (last warning day)', () => {
    expect(pickPastDueTone(9)).toBe('warning');
  });

  it('day 10 → danger (first danger day)', () => {
    expect(pickPastDueTone(10)).toBe('danger');
  });

  it('classifyWorkspaceDisplayStatus mirrors tone ramp at boundary days', () => {
    expect(classifyWorkspaceDisplayStatus(pastDueWs(2), CFG, NOW).tone).toBe('muted');
    expect(classifyWorkspaceDisplayStatus(pastDueWs(3), CFG, NOW).tone).toBe('warning');
    expect(classifyWorkspaceDisplayStatus(pastDueWs(9), CFG, NOW).tone).toBe('warning');
    expect(classifyWorkspaceDisplayStatus(pastDueWs(10), CFG, NOW).tone).toBe('danger');
  });
});

describe('Issue 118 integration — past_due priority', () => {
  it('past_due beats nearby refill date (Issue 117 supersession)', () => {
    const ws = pastDueWs(2, { nextRefillAt: new Date(NOW + 2 * 86_400_000).toISOString() });
    expect(getEffectiveStatus(ws, CFG, NOW).kind).toBe('past-due-expiring');
  });

  it('unpaid resolves like past_due', () => {
    const ws = makeWs({
      subscriptionStatus: SubscriptionStatus.UNPAID,
      subscriptionStatusChangedAt: new Date(NOW - 7 * 86_400_000).toISOString(),
    });
    expect(getEffectiveStatus(ws, CFG, NOW).kind).toBe('past-due-expiring');
  });

  it('canceled status still wins over past_due-shaped data (canceled is terminal)', () => {
    const ws = makeWs({
      subscriptionStatus: SubscriptionStatus.CANCELED,
      subscriptionStatusChangedAt: new Date(NOW - 60 * 86_400_000).toISOString(),
      tier: WsTierValue.EXPIRED,
    });
    const status = getEffectiveStatus(ws, CFG, NOW);
    expect(status.kind).not.toBe('past-due-expiring');
  });
});

describe('Issue 118 integration — hover card past-due section', () => {
  it('renders "Grants remain active" + "Credits will be lost if unpaid" lines', () => {
    const ws = pastDueWs(3, { billingPeriodEndAt: '2026-06-22T00:00:00Z' });
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildWorkspaceHoverHtml(ws, status, CFG);
    expect(html).toContain('Past Due');
    expect(html).toContain('Grants remain active');
    expect(html).toContain('Credits will be lost if unpaid');
  });

  it('hover card omits past-due section when workspace is healthy', () => {
    const ws = makeWs({ subscriptionStatus: SubscriptionStatus.ACTIVE });
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildWorkspaceHoverHtml(ws, status, CFG);
    expect(html).not.toContain('Grants remain active');
    expect(html).not.toContain('Credits will be lost if unpaid');
  });

  it('hover card header includes the compact "past due Nd — pay to keep credits" row', () => {
    const ws = pastDueWs(6);
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildWorkspaceHoverHtml(ws, status, CFG);
    expect(html).toContain('past due');
    expect(html).toContain('pay to keep credits');
  });

  it('hover card surfaces "Grants live until" when billingPeriodEndAt is set', () => {
    const ws = pastDueWs(2, { billingPeriodEndAt: '2026-06-22T00:00:00Z' });
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildWorkspaceHoverHtml(ws, status, CFG);
    expect(html).toContain('Grants live until');
  });
});

describe('Issue 118 integration — sort key (daysSince desc, available tiebreaker)', () => {
  // Mirrors filterAndSortWorkspaces' expiring branch:
  // daysSince desc, then available desc.
  function sortLikeExpiringFilter(list: WorkspaceCredit[]): WorkspaceCredit[] {
    return [...list].sort((a, b) => {
      const sa = getEffectiveStatus(a, CFG, NOW);
      const sb = getEffectiveStatus(b, CFG, NOW);
      const daysA = sa.daysSince || 0;
      const daysB = sb.daysSince || 0;
      if (daysB !== daysA) return daysB - daysA;
      return (b.available || 0) - (a.available || 0);
    });
  }

  it('most-overdue workspace ranks first', () => {
    const a = pastDueWs(2, { id: 'a' });
    const b = pastDueWs(12, { id: 'b' });
    const c = pastDueWs(6, { id: 'c' });
    const sorted = sortLikeExpiringFilter([a, b, c]).map((w) => w.id);
    expect(sorted).toEqual(['b', 'c', 'a']);
  });

  it('ties on daysSince break by available credits desc', () => {
    const lo = pastDueWs(5, { id: 'lo', available: 10 });
    const hi = pastDueWs(5, { id: 'hi', available: 200 });
    const md = pastDueWs(5, { id: 'md', available: 50 });
    const sorted = sortLikeExpiringFilter([lo, hi, md]).map((w) => w.id);
    expect(sorted).toEqual(['hi', 'md', 'lo']);
  });
});

describe('Issue 118 integration — enum guard regressions', () => {
  it('isPastDueStatus matches both spellings and rejects unrelated', () => {
    expect(isPastDueStatus(SubscriptionStatus.PAST_DUE)).toBe(true);
    expect(isPastDueStatus(SubscriptionStatus.UNPAID)).toBe(true);
    expect(isPastDueStatus(SubscriptionStatus.ACTIVE)).toBe(false);
    expect(isPastDueStatus(SubscriptionStatus.CANCELED)).toBe(false);
  });

  it('isCanceledStatus accepts both canceled and cancelled', () => {
    expect(isCanceledStatus(SubscriptionStatus.CANCELED)).toBe(true);
    expect(isCanceledStatus(SubscriptionStatus.CANCELLED)).toBe(true);
    expect(isCanceledStatus(SubscriptionStatus.PAST_DUE)).toBe(false);
  });
});
