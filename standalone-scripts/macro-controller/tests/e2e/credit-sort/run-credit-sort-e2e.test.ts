/**
 * E2E — Credit-sort filter end-to-end (v3.30.0).
 *
 * Drives the real `filterAndSortWorkspaces()` against a seeded workspace
 * snapshot and asserts the four credit-sort modes produce the correct
 * filtered + ordered survivor list:
 *
 *   1. `high`     — all rows, available DESC
 *   2. `low`      — all rows, available ASC
 *   3. `pro-high` — only paid (PRO/LITE/EXPIRED tier) that classify as
 *                   past-due-expiring OR expired; available DESC
 *   4. `pro-low`  — same filter as pro-high; available ASC
 *   5. `none`     — original ordering preserved
 *
 * Anonymized workspace IDs (`ws-00N`) per Group D convention.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterAndSortWorkspaces,
  setLoopWsCreditSortMode,
} from '../../../src/ws-list-renderer';
import type { WorkspaceCredit } from '../../../src/types';

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
    plan: 'pro_3', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false,
    nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
    membershipRole: 'owner', planType: 'monthly',
    ...p,
  };
}

const FIVE_DAYS_AGO = new Date(Date.now() - 5 * 86_400_000).toISOString();
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86_400_000).toISOString();

const SNAPSHOT: WorkspaceCredit[] = [
  // Healthy PRO with high credits
  ws({ id: 'ws-001', fullName: 'Alpha-Pro-Active',
       tier: 'PRO', available: 900,
       subscriptionStatus: 'active' }),
  // FREE workspace
  ws({ id: 'ws-002', fullName: 'Beta-Free',
       tier: 'FREE', available: 50,
       subscriptionStatus: 'active', plan: 'free' }),
  // PRO past_due (about-to-expire) with mid credits
  ws({ id: 'ws-003', fullName: 'Gamma-Pro-PastDue',
       tier: 'PRO', available: 400,
       subscriptionStatus: 'past_due',
       subscriptionStatusChangedAt: FIVE_DAYS_AGO }),
  // Expired PRO with high credits — recovery candidate
  ws({ id: 'ws-004', fullName: 'Delta-Expired-HighCredits',
       tier: 'EXPIRED', available: 750,
       subscriptionStatus: 'expired',
       subscriptionStatusChangedAt: THIRTY_DAYS_AGO }),
  // Expired PRO with low credits
  ws({ id: 'ws-005', fullName: 'Epsilon-Expired-LowCredits',
       tier: 'EXPIRED', available: 10,
       subscriptionStatus: 'expired',
       subscriptionStatusChangedAt: THIRTY_DAYS_AGO }),
  // FREE healthy
  ws({ id: 'ws-006', fullName: 'Zeta-Free-Healthy',
       tier: 'FREE', available: 200,
       subscriptionStatus: 'active', plan: 'free' }),
];

function ids(survivors: ReturnType<typeof filterAndSortWorkspaces>): string[] {
  return survivors.map((s) => String(s.ws.id));
}

 
describe('Credit-sort filter E2E (v3.30.0)', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom */ }
    setLoopWsCreditSortMode('none');
  });

  it('mode=none preserves original ordering and includes all rows', () => {
    const out = filterAndSortWorkspaces(SNAPSHOT, '');
    expect(ids(out)).toEqual(['ws-001', 'ws-002', 'ws-003', 'ws-004', 'ws-005', 'ws-006']);
  });

  it('mode=high sorts ALL workspaces by available credits DESC', () => {
    setLoopWsCreditSortMode('high');
    const out = filterAndSortWorkspaces(SNAPSHOT, '');
    expect(ids(out)).toEqual(['ws-001', 'ws-004', 'ws-003', 'ws-006', 'ws-002', 'ws-005']);
  });

  it('mode=low sorts ALL workspaces by available credits ASC', () => {
    setLoopWsCreditSortMode('low');
    const out = filterAndSortWorkspaces(SNAPSHOT, '');
    expect(ids(out)).toEqual(['ws-005', 'ws-002', 'ws-006', 'ws-003', 'ws-004', 'ws-001']);
  });

  it('mode=pro-high filters to Pro expiring/expired only, DESC by credits', () => {
    setLoopWsCreditSortMode('pro-high');
    const out = filterAndSortWorkspaces(SNAPSHOT, '');
    // Excluded: ws-001 (active healthy), ws-002 (FREE), ws-006 (FREE)
    // Included: ws-003 (past_due), ws-004 (expired), ws-005 (expired)
    expect(ids(out)).toEqual(['ws-004', 'ws-003', 'ws-005']);
  });

  it('mode=pro-low filters to Pro expiring/expired only, ASC by credits', () => {
    setLoopWsCreditSortMode('pro-low');
    const out = filterAndSortWorkspaces(SNAPSHOT, '');
    expect(ids(out)).toEqual(['ws-005', 'ws-003', 'ws-004']);
  });

  it('Pro filter EXCLUDES FREE-tier workspaces even when they are expiring', () => {
    const withExpiringFree = [
      ...SNAPSHOT,
      ws({ id: 'ws-007', fullName: 'Eta-Free-Expiring',
           tier: 'FREE', available: 999,
           subscriptionStatus: 'past_due',
           subscriptionStatusChangedAt: FIVE_DAYS_AGO, plan: 'free' }),
    ];
    setLoopWsCreditSortMode('pro-high');
    const out = filterAndSortWorkspaces(withExpiringFree, '');
    expect(ids(out)).not.toContain('ws-007');
  });

  it('Pro filter EXCLUDES healthy PRO workspaces (not in expiring/expired)', () => {
    setLoopWsCreditSortMode('pro-high');
    const out = filterAndSortWorkspaces(SNAPSHOT, '');
    expect(ids(out)).not.toContain('ws-001');
  });
});
