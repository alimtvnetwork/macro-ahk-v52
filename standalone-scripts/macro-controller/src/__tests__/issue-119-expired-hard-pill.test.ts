/**
 * Issue 119 — `expired-hard` renders as a single red/white pill.
 *
 * Past-due workspaces beyond `PAST_DUE_GRACE_DAYS` (10d) should collapse
 * the two-pill amber "Expire" + "Passed Nd" rendering into a single
 * danger-tone "Expired Nd" pill. This locks the renderer contract: no
 * sublabel HTML node is emitted for the expired-hard kind.
 */

import { describe, it, expect } from 'vitest';
import { buildStatusPillHtml } from '../ws-list-renderer';
import { getEffectiveStatus } from '../workspace-status';
import { classifyWorkspaceDisplayStatus } from '../workspace-display-status';
import { resolveBadgeStyle, styleContainsRedPalette } from '../workspace-badge-styles';
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

describe('Issue 119 — expired-hard single-pill renderer', () => {
  it('renders ONE pill (no sublabel node) for past-due ≥10d', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 15 * 86_400_000).toISOString(),
    });
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildStatusPillHtml(status, ws);
    // Exactly one main pill, NO sublabel pill
    expect(html.match(/marco-ws-status-pill/g)?.length).toBe(1);
    expect(html).not.toContain('marco-ws-status-sublabel');
    expect(html).toContain('Expired 15d');
    expect(html).not.toContain('Passed');
  });

  it('uses red/danger palette for the expired-hard pill', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 12 * 86_400_000).toISOString(),
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    const style = resolveBadgeStyle(d.tone);
    expect(d.tone).toBe('danger');
    expect(styleContainsRedPalette(style)).toBe(true);
  });

  it('still renders two pills for past-due BELOW grace (9d)', () => {
    const ws = makeWs({
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(NOW - 9 * 86_400_000).toISOString(),
    });
    const status = getEffectiveStatus(ws, CFG, NOW);
    const html = buildStatusPillHtml(status, ws);
    expect(html).toContain('marco-ws-status-sublabel');
    expect(html).toContain('Passed 9d');
  });

  it('canceled rows do NOT use the red palette (still muted gray)', () => {
    const ws = makeWs({
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: '2026-04-20T00:00:00Z',
      tier: 'EXPIRED',
    });
    const d = classifyWorkspaceDisplayStatus(ws, CFG, NOW);
    const style = resolveBadgeStyle(d.tone);
    expect(d.tone).toBe('muted');
    expect(styleContainsRedPalette(style)).toBe(false);
  });
});
