/**
 * Issue 119 — hover card mirrors list-row styling for `expired-hard`.
 *
 * The list row's `buildStatusPillHtml` and the hover card's `pillHtml`
 * both feed off `classifyFromStatus` → `resolveBadgeStyle`. This test
 * locks the parity contract: both renderers must produce the same
 * (label, tone, palette) for a past-due ≥10d workspace, and both must
 * emit exactly one pill (no sublabel anywhere).
 */

import { describe, it, expect } from 'vitest';
import { buildStatusPillHtml } from '../ws-list-renderer';
import { buildWorkspaceHoverHtml as buildHoverCardHtml } from '../ws-hover-card';
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

describe('Issue 119 — hover card parity for expired-hard', () => {
  const ws = makeWs({
    subscriptionStatus: 'past_due',
    subscriptionStatusChangedAt: new Date(NOW - 14 * 86_400_000).toISOString(),
  });
  const status = getEffectiveStatus(ws, CFG, NOW);
  const display = classifyWorkspaceDisplayStatus(ws, CFG, NOW);

  it('classifier emits expired-hard with danger tone (single pill contract)', () => {
    expect(display.kind).toBe('expired-hard');
    expect(display.tone).toBe('danger');
    expect(display.sublabel).toBeUndefined();
    expect(display.label).toBe('Expired 14d');
  });

  it('list-row pill HTML uses red palette and emits a single pill', () => {
    const html = buildStatusPillHtml(status, ws);
    expect(html.match(/marco-ws-status-pill/g)?.length).toBe(1);
    expect(html).not.toContain('marco-ws-status-sublabel');
    expect(html).toContain('Expired 14d');
    const style = resolveBadgeStyle(display.tone);
    expect(styleContainsRedPalette(style)).toBe(true);
    // Spot-check: the row HTML actually inlines danger colors
    expect(html).toContain(style.bg);
    expect(html).toContain(style.fg);
  });

  it('hover card uses the same danger palette and label for the same workspace', () => {
    const html = buildHoverCardHtml(ws, status);
    expect(html).toContain('Expired 14d');
    const style = resolveBadgeStyle(display.tone);
    // Both renderers feed off the same resolver; hover card must inline the
    // same red bg + light-red fg as the list row.
    expect(html).toContain(style.bg);
    expect(html).toContain(style.fg);
    // No two-pill sub-rendering in the hover card either.
    expect(html).not.toContain('Passed');
  });

  it('canceled tone in hover card is gray, never red', () => {
    const canceledWs = makeWs({
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: '2026-04-20T00:00:00Z',
      tier: 'EXPIRED',
    });
    const canceledStatus = getEffectiveStatus(canceledWs, CFG, NOW);
    const canceledDisplay = classifyWorkspaceDisplayStatus(canceledWs, CFG, NOW);
    const html = buildHoverCardHtml(canceledWs, canceledStatus);
    const style = resolveBadgeStyle(canceledDisplay.tone);
    expect(canceledDisplay.tone).toBe('muted');
    expect(styleContainsRedPalette(style)).toBe(false);
    expect(html).toContain('Cancel');
  });
});
