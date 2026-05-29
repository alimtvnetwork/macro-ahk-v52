/**
 * Issue 123 — Step 5/5: End-to-end JSON → parseLoopApiResponse → totals.
 *
 * Feeds realistic Lovable /api/user/workspaces JSON payloads (mirroring
 * the exact field shape the user pasted for P0065) through the real
 * `parseLoopApiResponse` → `loopCreditState.perWorkspace` → exported
 * `aggregateCreditTotals` pipeline. This catches regressions in:
 *   - field mapping (billing_period_credits_* → ws.used/avail/limit)
 *   - tier resolution (resolveWsTier)
 *   - lifecycle override pass (canceled/expired wipes)
 *   - exported-aggregator branch selection per plan
 *
 * Pure positive + negative expectations.
 */

import { describe, it, expect } from 'vitest';
import { parseLoopApiResponse } from '../credit-parser';
import { aggregateCreditTotals } from '../credit-totals';
import { loopCreditState } from '../shared-state';

interface ApiWs {
  id: string;
  name: string;
  plan: string;
  subscription_status: string;
  billing_period_credits_used: number;
  billing_period_credits_limit: number;
  daily_credits_used: number;
  daily_credits_limit: number;
  credits_used: number;
  credits_granted: number;
  total_credits_used: number;
  rollover_credits_used: number;
  rollover_credits_limit: number;
  topup_credits_limit: number;
  num_projects: number;
  next_monthly_credit_grant_date: string;
  billing_period_end_date: string;
  created_at: string;
  experimental_features: Record<string, boolean>;
  membership: { role: string };
}

function apiWs(over: Partial<ApiWs>): ApiWs {
  return {
    id: 'workspace_x',
    name: 'WS',
    plan: 'pro_1',
    subscription_status: 'active',
    billing_period_credits_used: 0,
    billing_period_credits_limit: 100,
    daily_credits_used: 0,
    daily_credits_limit: 5,
    credits_used: 0,
    credits_granted: 0,
    total_credits_used: 0,
    rollover_credits_used: 0,
    rollover_credits_limit: 0,
    topup_credits_limit: 0,
    num_projects: 1,
    next_monthly_credit_grant_date: '2026-06-10T08:00:00Z',
    billing_period_end_date: '2026-06-10T08:00:00Z',
    created_at: '2026-03-08T04:02:03Z',
    experimental_features: {},
    membership: { role: 'owner' },
    ...over,
  };
}

function totals() {
  return aggregateCreditTotals(loopCreditState.perWorkspace || []);
}

describe('Issue 123 E2E — JSON → parseLoopApiResponse → aggregateCreditTotals', () => {
  it('USER REGRESSION: P0065 (pro_1 trialing, 100/100 billing, daily 5/5) → granted=100, remaining=0', () => {
    // Exact shape from the user's bug report.
    const ok = parseLoopApiResponse({
      workspaces: [apiWs({
        id: 'workspace_01kk5sqz7ze219vkzcgn982mjj',
        name: 'P0065 R Mar26 D3',
        plan: 'pro_1',
        subscription_status: 'trialing',
        billing_period_credits_used: 100,
        billing_period_credits_limit: 100,
        daily_credits_used: 0,
        daily_credits_limit: 5,
        total_credits_used: 114.99999999999999,
      })],
    });
    expect(ok).toBe(true);
    const r = totals();
    expect(r.granted).toBe(100);
    expect(r.used).toBe(100);
    expect(r.remaining).toBe(0);
    expect(r.freeDailyRemaining).toBe(5);
    expect(r.totalCount).toBe(1);
    // NEGATIVE: must not regress to 5/105 from per-row badge.
    expect(r.granted).not.toBe(105);
    expect(r.remaining).not.toBe(5);
  });

  it('fresh pro_1 monthly payload (0/100 billing) → granted=100, remaining=100', () => {
    parseLoopApiResponse({
      workspaces: [apiWs({
        billing_period_credits_used: 0,
        billing_period_credits_limit: 100,
      })],
    });
    const r = totals();
    expect(r.granted).toBe(100);
    expect(r.remaining).toBe(100);
    expect(r.used).toBe(0);
  });

  it('pro_3 large plan (320/1500 used) → 320/1180/1500', () => {
    parseLoopApiResponse({
      workspaces: [apiWs({
        plan: 'pro_3',
        billing_period_credits_used: 320,
        billing_period_credits_limit: 1500,
      })],
    });
    const r = totals();
    expect(r.used).toBe(320);
    expect(r.remaining).toBe(1180);
    expect(r.granted).toBe(1500);
  });

  it('lite plan payload reads billing fields (no pro_0 branch)', () => {
    parseLoopApiResponse({
      workspaces: [apiWs({
        plan: 'lite',
        billing_period_credits_used: 75,
        billing_period_credits_limit: 200,
      })],
    });
    const r = totals();
    expect(r.granted).toBe(200);
    expect(r.remaining).toBe(125);
  });

  it('FREE-plan payload is excluded from totals; daily still surfaces', () => {
    parseLoopApiResponse({
      workspaces: [
        apiWs({
          plan: 'free',
          subscription_status: 'active',
          billing_period_credits_limit: 0,
          daily_credits_used: 2,
          daily_credits_limit: 5,
        }),
        apiWs({
          id: 'paid',
          plan: 'pro_1',
          billing_period_credits_used: 10,
          billing_period_credits_limit: 100,
        }),
      ],
    });
    const r = totals();
    expect(r.granted).toBe(100); // paid only
    expect(r.used).toBe(10);
    expect(r.remaining).toBe(90);
    expect(r.totalCount).toBe(1);
    expect(r.freeDailyRemaining).toBeGreaterThanOrEqual(3); // 5-2 from FREE row
  });

  it('canceled pro_1: lifecycle override wipes billingAvailable; granted still reflects original limit', () => {
    parseLoopApiResponse({
      workspaces: [apiWs({
        plan: 'pro_1',
        subscription_status: 'canceled',
        billing_period_credits_used: 50,
        billing_period_credits_limit: 100,
      })],
    });
    const r = totals();
    // ws.limit is NOT zeroed by override (only billingAvailable/rollover/totalCredits are).
    // So granted=limit=100, remaining=billingAvailable→0 after override.
    expect(r.granted).toBe(100);
    expect(r.used).toBe(50);
    expect(r.remaining).toBe(0);
  });

  it('mixed plan list (pro_1 + pro_3 + lite + free) sums only paid rows', () => {
    parseLoopApiResponse({
      workspaces: [
        apiWs({ id: 'a', plan: 'pro_1', billing_period_credits_used: 25, billing_period_credits_limit: 100 }),
        apiWs({ id: 'b', plan: 'pro_3', billing_period_credits_used: 500, billing_period_credits_limit: 1500 }),
        apiWs({ id: 'c', plan: 'lite', billing_period_credits_used: 100, billing_period_credits_limit: 200 }),
        apiWs({ id: 'd', plan: 'free', billing_period_credits_limit: 0 }),
      ],
    });
    const r = totals();
    expect(r.granted).toBe(1800);
    expect(r.used).toBe(625);
    expect(r.remaining).toBe(1175);
    expect(r.totalCount).toBe(3);
  });

  it('parseLoopApiResponse handles a bare array (no {workspaces} wrapper)', () => {
    const ok = parseLoopApiResponse([
      apiWs({ billing_period_credits_used: 5, billing_period_credits_limit: 100 }),
    ] as unknown as Record<string, unknown>);
    expect(ok).toBe(true);
    const r = totals();
    expect(r.granted).toBe(100);
    expect(r.used).toBe(5);
  });

  it('NEGATIVE: malformed (non-array) response returns false and does not crash', () => {
    const ok = parseLoopApiResponse({ workspaces: 'not-an-array' as unknown as Array<Record<string, unknown>> });
    expect(ok).toBe(false);
  });

  it('NEGATIVE: pro_1 with 50/100 must NEVER report granted=105 (legacy sum-of-pools bug)', () => {
    parseLoopApiResponse({
      workspaces: [apiWs({
        billing_period_credits_used: 50,
        billing_period_credits_limit: 100,
        daily_credits_limit: 5, // +5 daily that legacy logic would have added
      })],
    });
    const r = totals();
    expect(r.granted).toBe(100);
    expect(r.granted).not.toBe(105);
    expect(r.granted).not.toBe(155);
  });

  it('fractional total_credits_used does not infect billing-only granted/used/remaining', () => {
    parseLoopApiResponse({
      workspaces: [apiWs({
        billing_period_credits_used: 100,
        billing_period_credits_limit: 100,
        total_credits_used: 114.99999999999999, // includes daily spillover
      })],
    });
    const r = totals();
    expect(r.used).toBe(100); // billing only — NOT 115
    expect(r.granted).toBe(100);
    expect(r.remaining).toBe(0);
  });
});
