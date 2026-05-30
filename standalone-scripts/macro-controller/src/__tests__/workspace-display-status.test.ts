/**
 * Issue 115 Step 1 — classifier tests.
 *
 * Asserts that `classifyWorkspaceDisplayStatus` collapses the granular
 * lifecycle enum into the display kinds spec'd in
 * `.lovable/pending-issues/06-workspace-label-refinement.md`.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyWorkspaceDisplayStatus,
  formatRefillLabel,
  formatExpireSoonLabel,
  formatExpiredLabel,
  WORKSPACE_BADGE_DISPLAY,
} from '../workspace-display-status';
import type { WorkspaceCredit } from '../types';
import type { WorkspaceLifecycleConfig } from '../workspace-lifecycle-config';

const CFG: WorkspaceLifecycleConfig = {
  expiryGracePeriodDays: 30,
  refillWarningThresholdDays: 10,
  enableWorkspaceStatusLabels: true,
  enableWorkspaceHoverDetails: true,
};

const NOW = Date.parse('2026-04-22T00:00:00Z');

function makeWs(overrides: Partial<WorkspaceCredit>): WorkspaceCredit {
  return {
    id: 'ws_test', name: 'Test', fullName: 'Test Workspace',
    dailyFree: 5, dailyUsed: 0, dailyLimit: 5,
    rolloverUsed: 0, rolloverLimit: 0,
    freeGranted: 0, freeRemaining: 0,
    used: 0, limit: 0, topupLimit: 0,
    totalCredits: 100, available: 50, rollover: 20, billingAvailable: 30,
    hasFree: false, totalCreditsUsed: 0,
    subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
    plan: 'pro_1', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false, nextRefillAt: '',
    billingPeriodEndAt: '', createdAt: '', membershipRole: '', planType: 'monthly',
    ...overrides,
  };
}

describe('classifyWorkspaceDisplayStatus — canceled collapse', () => {
  it('expired-canceled (recent cancel) → canceled / Cancel / muted', () => {
    const ws = makeWs({
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: '2026-04-20T00:00:00Z',
      tier: 'EXPIRED',
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('canceled');
    expect(d.label).toBe('Cancel');
    expect(d.tone).toBe('muted');
    expect(d.source.kind).toBe('expired-canceled');
  });

  it('fully-expired (canceled long ago) → canceled / Cancel', () => {
    const ws = makeWs({
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: '2025-01-01T00:00:00Z',
      tier: 'EXPIRED',
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('canceled');
    expect(d.label).toBe('Cancel');
    expect(d.source.kind).toBe('fully-expired');
  });

  it('plain expired (tier=EXPIRED, no cancel) → canceled / Cancel (collapsed)', () => {
    const ws = makeWs({
      subscriptionStatus: 'active',
      subscriptionStatusChangedAt: '2026-04-20T00:00:00Z',
      tier: 'EXPIRED',
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('canceled');
    expect(d.label).toBe('Cancel');
    // Internal source is still distinguishable
    expect(d.source.kind).toBe('expired');
  });
});

describe('classifyWorkspaceDisplayStatus — refill-soon', () => {
  it('PRO with next refill in 5d → refill-soon / "Refill 5d"', () => {
    const refillIso = new Date(NOW + 5 * 86_400_000).toISOString();
    const ws = makeWs({ nextRefillAt: refillIso });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('refill-soon');
    expect(d.label).toBe('Refill 5d');
    expect(d.tone).toBe('info');
  });
});

describe('classifyWorkspaceDisplayStatus — past-due-expiring (Issue 118 rev)', () => {
  it('past_due, daysSince=0 → past-due-expiring / Expire / Today / muted', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW).toISOString(),
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('past-due-expiring');
    expect(d.label).toBe('Expire');
    expect(d.sublabel).toBe('Today');
    expect(d.tone).toBe('muted');
  });

  it('past_due, daysSince=2 → past-due-expiring / Expire / Passed 2d / muted', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 2 * 86_400_000).toISOString(),
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('past-due-expiring');
    expect(d.label).toBe('Expire');
    expect(d.sublabel).toBe('Passed 2d');
    expect(d.tone).toBe('muted');
  });

  it('past_due, daysSince=7 → past-due-expiring / warning tone', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 7 * 86_400_000).toISOString(),
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('past-due-expiring');
    expect(d.tone).toBe('warning');
  });

  it('past_due, daysSince=9 → past-due-expiring / warning tone (just under grace)', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 9 * 86_400_000).toISOString(),
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('past-due-expiring');
    expect(d.tone).toBe('warning');
  });

  it('past_due, daysSince=12 → expired-hard / single red pill / danger tone', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 12 * 86_400_000).toISOString(),
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('expired-hard');
    expect(d.tone).toBe('danger');
    expect(d.label).toBe('Expired 12d');
    // single-pill: sublabel must be absent so renderer emits ONE pill
    expect(d.sublabel).toBeUndefined();
  });

  it('past_due, daysSince=10 → expired-hard (grace boundary inclusive)', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 10 * 86_400_000).toISOString(),
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.kind).toBe('expired-hard');
    expect(d.label).toBe('Expired 10d');
  });
});

describe('label formatters', () => {
  it('formatRefillLabel(0) → "Refill today"', () => {
    expect(formatRefillLabel(0)).toBe('Refill today');
  });
  it('formatRefillLabel(5) → "Refill 5d"', () => {
    expect(formatRefillLabel(5)).toBe('Refill 5d');
  });
  it('formatRefillLabel clamps at 99d', () => {
    expect(formatRefillLabel(500)).toBe('Refill 99d');
  });
  it('formatExpireSoonLabel(3) → "Expire 3d"', () => {
    expect(formatExpireSoonLabel(3)).toBe('Expire 3d');
  });
  it('formatExpiredLabel(0) → "Expired"', () => {
    expect(formatExpiredLabel(0)).toBe('Expired');
  });
});

describe('display token map', () => {
  it('canceled tone is muted (not danger) — no red', () => {
    expect(WORKSPACE_BADGE_DISPLAY['canceled'].tone).toBe('muted');
  });
  it('expire-soon tone is warning (amber) — Issue 125 §2.4 fix', () => {
    expect(WORKSPACE_BADGE_DISPLAY['expire-soon'].tone).toBe('warning');
  });
  it('expired tone is orange (muted red-orange) — Issue 125 §2.4 fix', () => {
    expect(WORKSPACE_BADGE_DISPLAY['expired'].tone).toBe('orange');
  });
  it('expired-hard tone is danger (red) — reserved for ≥ grace window', () => {
    expect(WORKSPACE_BADGE_DISPLAY['expired-hard'].tone).toBe('danger');
  });
  it('all kinds have a tone entry', () => {
    const kinds = ['canceled', 'expired', 'expired-hard', 'expire-soon', 'past-due-expiring', 'refill-soon', 'normal'] as const;
    for (const k of kinds) {
      expect(WORKSPACE_BADGE_DISPLAY[k]).toBeDefined();
    }
  });
});
