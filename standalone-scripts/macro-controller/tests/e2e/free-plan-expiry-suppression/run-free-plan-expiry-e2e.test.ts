/**
 * E2E — Free-plan expiry suppression.
 *
 * A FREE-tier workspace whose Stripe `subscription_status` has flipped to
 * `canceled` (or whose tier is reported as EXPIRED) must NEVER surface as an
 * Expired/Canceled row in the UI. Free workspaces don't carry a paid
 * subscription — the canceled flag is a downgrade artefact, not a real lapse.
 *
 * Mirrors the real workspace JSON shared in the issue (`z L30 E3 Malaysia`,
 * plan="free", subscription_status="canceled", credits 10/10 still available).
 */

import { describe, it, expect } from 'vitest';
import {
  getEffectiveStatus,
  type WorkspaceLifecycleConfig,
} from '../../../src/workspace-status';
import { classifyFromStatus } from '../../../src/workspace-display-status';
import type { WorkspaceCredit } from '../../../src/types';

const CFG: WorkspaceLifecycleConfig = {
  expiryGracePeriodDays: 7,
  refillWarningThresholdDays: 3,
};

function ws(p: Partial<WorkspaceCredit>): WorkspaceCredit {
  return {
    id: 'w', name: 'w', fullName: 'w',
    dailyFree: 0, dailyUsed: 0, dailyLimit: 0,
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
    ...p,
  };
}

const TWENTY_SIX_DAYS_AGO = new Date(Date.now() - 26 * 86_400_000).toISOString();

 
describe('Free-plan expiry suppression (E2E)', () => {
  it('FREE + canceled (z L30 E3 Malaysia case) → normal, no canceled badge', () => {
    const free = ws({
      id: 'ws-free-canceled',
      fullName: 'z L30 E3 Malaysia',
      tier: 'FREE',
      plan: 'free',
      available: 10,
      dailyLimit: 5,
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: TWENTY_SIX_DAYS_AGO,
    });
    const status = getEffectiveStatus(free, CFG);
    expect(status.kind).not.toBe('expired-canceled');
    expect(status.kind).not.toBe('fully-expired');
    expect(status.kind).not.toBe('expired');
    const display = classifyFromStatus(status, free);
    expect(display.kind).not.toBe('canceled');
    expect(display.label).not.toMatch(/expir|cancel/i);
  });

  it('FREE + EXPIRED tier → still normal (no Expired badge on a free row)', () => {
    const free = ws({
      tier: 'FREE', plan: 'free',
      subscriptionStatus: 'expired',
      subscriptionStatusChangedAt: TWENTY_SIX_DAYS_AGO,
    });
    const status = getEffectiveStatus(free, CFG);
    expect(status.kind).not.toMatch(/expir|cancel/);
  });

  it('FREE + past_due is also suppressed (free has no real subscription to be past_due on)', () => {
    const free = ws({
      tier: 'FREE', plan: 'free',
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: TWENTY_SIX_DAYS_AGO,
    });
    const status = getEffectiveStatus(free, CFG);
    expect(status.kind).not.toBe('past-due-expiring');
  });

  it('Regression: PRO + canceled STILL classifies as canceled/expired', () => {
    const pro = ws({
      tier: 'PRO', plan: 'pro_3',
      subscriptionStatus: 'canceled',
      subscriptionStatusChangedAt: TWENTY_SIX_DAYS_AGO,
    });
    const status = getEffectiveStatus(pro, CFG);
    expect(['expired-canceled', 'fully-expired']).toContain(status.kind);
  });

  it('Regression: PRO + past_due STILL classifies as past-due-expiring', () => {
    const pro = ws({
      tier: 'PRO', plan: 'pro_3',
      subscriptionStatus: 'past_due',
      subscriptionStatusChangedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    });
    const status = getEffectiveStatus(pro, CFG);
    expect(status.kind).toBe('past-due-expiring');
  });
});
