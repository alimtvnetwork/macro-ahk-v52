/**
 * v3.23.0 — Issue 116 RCA test.
 *
 * Asserts that `buildTierBadgeHtml` SUPPRESSES the red "EXPIRED" tier
 * badge when the row also carries the muted "Cancel" status pill — so
 * canceled workspaces render a single badge instead of "EXPIRED + Cancel".
 *
 * Regression guard for the screenshot reported by the user (workspaces
 * P0888, P0891, P0092 each showing both an `EXPIRED` red pill and a
 * `Cancel` gray pill side-by-side).
 */

import { describe, it, expect } from 'vitest';
import { buildTierBadgeHtml } from '../ws-list-renderer';
import type { WorkspaceCredit } from '../types';

function makeWs(overrides: Partial<WorkspaceCredit> = {}): WorkspaceCredit {
  return {
    id: 'ws_test', name: 'Test', fullName: 'Test Workspace',
    dailyFree: 0, dailyUsed: 0, dailyLimit: 0,
    rolloverUsed: 0, rolloverLimit: 0,
    freeGranted: 0, freeRemaining: 0,
    used: 0, limit: 0, topupLimit: 0,
    totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
    hasFree: false, totalCreditsUsed: 0,
    subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
    plan: 'pro_1', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false, nextRefillAt: '',
    billingPeriodEndAt: '', createdAt: '', membershipRole: '', planType: 'monthly',
    ...overrides,
  };
}

describe('Issue 116 — Cancel suppresses redundant EXPIRED tier badge', () => {
  it('tier=EXPIRED + subscriptionStatus=canceled → renders single Cancel pill, no EXPIRED badge', () => {
    const ws = makeWs({
      tier: 'EXPIRED',
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: '2026-04-20T00:00:00Z',
    });
    const html = buildTierBadgeHtml(ws);

    // The red "EXPIRED" tier badge must NOT appear.
    expect(html).not.toContain('>EXPIRED<');
    // The muted "Cancel" status pill MUST appear, exactly once.
    const cancelMatches = html.match(/>Cancel</g) || [];
    expect(cancelMatches.length).toBe(1);
    // The dark-red tier-badge background must NOT appear (would imply
    // the EXPIRED tier badge slipped through).
    expect(html).not.toContain('#7f1d1d');
  });

  it('tier=EXPIRED without cancel (past_due-style) → KEEPS EXPIRED tier badge', () => {
    const ws = makeWs({
      tier: 'EXPIRED',
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: '2026-05-20T00:00:00Z',
    });
    const html = buildTierBadgeHtml(ws);
    expect(html).toContain('>EXPIRED<');
  });

  it('tier=PRO + canceled (non-EXPIRED tier) → tier badge kept (no suppression regression)', () => {
    const ws = makeWs({
      tier: 'PRO',
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: '2026-04-20T00:00:00Z',
    });
    const html = buildTierBadgeHtml(ws);
    expect(html).toContain('>PRO<');
    expect((html.match(/>Cancel</g) || []).length).toBe(1);
  });
});
