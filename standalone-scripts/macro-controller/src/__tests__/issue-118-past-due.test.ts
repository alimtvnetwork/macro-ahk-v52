/**
 * Issue 118 — Past-due workspace handling
 *
 * Covers:
 *   - getEffectiveStatus resolves past_due → past-due-expiring
 *   - pickPastDueTone ramp (0–4d warning, 5–9d orange, ≥10d danger)
 *   - formatPassedLabel
 *   - buildStatusPillHtml renders Expire + Passed Nd / Today
 *   - classifyWorkspaceDisplayStatus for past-due
 */

import { describe, it, expect } from 'vitest';
import {
  getEffectiveStatus,
} from '../workspace-status';
import {
  classifyWorkspaceDisplayStatus,
  formatPassedLabel,
  pickPastDueTone,
} from '../workspace-display-status';
import { buildStatusPillHtml } from '../ws-list-renderer';
import { isPastDueStatus } from '../types/subscription-status';
import type { WorkspaceCredit } from '../types';
import type { WorkspaceLifecycleConfig } from '../workspace-lifecycle-config';

const CFG: WorkspaceLifecycleConfig = {
  expiryGracePeriodDays: 30,
  refillWarningThresholdDays: 7,
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

describe('Issue 118 — getEffectiveStatus for past_due', () => {
  it('past_due → past-due-expiring with correct daysSince', () => {
    const ws = makeWs({ subscriptionStatus: 'past_due', subscriptionStatusChangedAt: '2026-04-18T00:00:00Z' });
    const s = getEffectiveStatus(ws, CFG, NOW);
    expect(s.kind).toBe('past-due-expiring');
    expect(s.daysSince).toBe(4);
  });

  it('unpaid → past-due-expiring', () => {
    const ws = makeWs({ subscriptionStatus: 'unpaid', subscriptionStatusChangedAt: '2026-04-15T00:00:00Z' });
    const s = getEffectiveStatus(ws, CFG, NOW);
    expect(s.kind).toBe('past-due-expiring');
    expect(s.daysSince).toBe(7);
  });

  it('past_due ignores refill dates', () => {
    const ws = makeWs({ subscriptionStatus: 'past_due', subscriptionStatusChangedAt: '2026-04-20T00:00:00Z', nextRefillAt: '2026-04-23T00:00:00Z' });
    const s = getEffectiveStatus(ws, CFG, NOW);
    expect(s.kind).toBe('past-due-expiring');
    expect(s.daysToRefill).toBe(-1);
  });
});

describe('Issue 118 — pickPastDueTone', () => {
  it('0–4d → warning', () => {
    expect(pickPastDueTone(0)).toBe('warning');
    expect(pickPastDueTone(4)).toBe('warning');
  });
  it('5–9d → orange', () => {
    expect(pickPastDueTone(5)).toBe('orange');
    expect(pickPastDueTone(9)).toBe('orange');
  });
  it('≥10d → danger', () => {
    expect(pickPastDueTone(10)).toBe('danger');
    expect(pickPastDueTone(30)).toBe('danger');
  });
  it('negative / NaN → warning fallback', () => {
    expect(pickPastDueTone(-1)).toBe('warning');
    expect(pickPastDueTone(NaN)).toBe('warning');
  });
});

describe('Issue 118 — formatPassedLabel', () => {
  it('0 → Today', () => { expect(formatPassedLabel(0)).toBe('Today'); });
  it('1 → Passed 1d', () => { expect(formatPassedLabel(1)).toBe('Passed 1d'); });
  it('clamps at 99d', () => { expect(formatPassedLabel(500)).toBe('Passed 99d'); });
});

describe('Issue 118 — classifyWorkspaceDisplayStatus past-due', () => {
  it('produces Expire + Today for daysSince=0', () => {
    const ws = makeWs({ subscriptionStatus: 'past_due', subscriptionStatusChangedAt: new Date(NOW).toISOString() });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.label).toBe('Expire');
    expect(d.sublabel).toBe('Today');
    expect(d.tone).toBe('warning');
  });

  it('produces Expire + Passed Nd for daysSince>0', () => {
    const ws = makeWs({ subscriptionStatus: 'past_due', subscriptionStatusChangedAt: new Date(NOW - 6 * 86_400_000).toISOString() });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    expect(d.label).toBe('Expire');
    expect(d.sublabel).toBe('Passed 6d');
    expect(d.tone).toBe('orange');
  });
});

describe('Issue 118 — buildStatusPillHtml', () => {
  it('renders main label + sublabel for past-due-expiring', () => {
    const ws = makeWs({ subscriptionStatus: 'past_due', subscriptionStatusChangedAt: new Date(NOW - 3 * 86_400_000).toISOString() });
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildStatusPillHtml(status, ws);
    expect(html).toContain('Expire');
    expect(html).toContain('Passed 3d');
  });

  it('renders Today sublabel for 0-day past due', () => {
    const ws = makeWs({ subscriptionStatus: 'past_due', subscriptionStatusChangedAt: new Date(NOW).toISOString() });
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildStatusPillHtml(status, ws);
    expect(html).toContain('Expire');
    expect(html).toContain('Today');
  });
});

describe('Issue 118 — isPastDueStatus enum helper', () => {
  it('matches past_due and unpaid', () => {
    expect(isPastDueStatus('past_due')).toBe(true);
    expect(isPastDueStatus('unpaid')).toBe(true);
    expect(isPastDueStatus('active')).toBe(false);
  });
});
