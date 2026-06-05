/**
 * Macro Controller — Credit Totals Aggregator (Issue 116 + Issue 120 fix)
 *
 * Pure function: given the current `WorkspaceCredit[]` snapshot, produce
 * aggregate totals for the "💰 Credit Totals" modal.
 *
 * Aggregation rules:
 *  - FREE plans (`tier === 'FREE'` or `plan === 'free'`) are excluded from
 *    Used/Remaining/Total sums (they only consume daily free credits and
 *    have no billing-period grant). See Core memory: "Credit Totals —
 *    exclude FREE tier".
 *  - `pro_0` plans: the enrichment pass already overwrote
 *    `totalCredits` / `available` / `totalCreditsUsed` with authoritative
 *    /credit-balance numbers (`total_granted` / `total_remaining` /
 *    `total_billing_period_used`). Read those directly.
 *    See `mem://features/macro-controller/pro-zero-credit-balance`.
 *  - All other paid plans (`pro_1`, `pro_3`, `lite`, `ktlo`, …): use the
 *    workspace **billing-period** fields only (`ws.limit` /
 *    `ws.billingAvailable` / `ws.used` ← billing_period_credits_limit /
 *    available / used). The legacy "sum of all five pools" Total
 *    (`granted + daily + billing + topup + rollover`) double-counts daily
 *    free + bonus + topup and over-reports the user's monthly grant.
 *    Spec: `spec/21-app/03-data-and-api/api-response/04-plan.md` line 40 —
 *    summary is derived from `billing_period_credits_*` (+ daily for the
 *    free-daily card, which is reported separately).
 *  - freeDailyRemaining: MAX of `dailyFree` across workspaces. Lovable's
 *    daily free credits are per-account, not per-workspace; taking the max
 *    treats whichever snapshot is freshest as authoritative.
 *  - freeDailyCap: constant 5 (Lovable Free plan daily credit cap).
 *  - resetAtLocal: next 00:00 in the user's local timezone.
 *  - missingCount: non-FREE rows that had no usable credit fields.
 *
 * No retry, no network, no side effects. Pure.
 */

import type { WorkspaceCredit } from './types';

/** Lovable Free plan: 5 daily credits per account. */
export const FREE_DAILY_CAP = 5;

/** Wire-string plan literal for the pro_0 branch (enriched fields). */
const PLAN_PRO_ZERO = 'pro_0';
/** Wire-string plan literal for the unsubscribed/free tier. */
const PLAN_FREE = 'free';
/** Tier value for the unsubscribed/free tier. */
const TIER_FREE = 'FREE';

export interface CreditTotals {
  /** Sum of credits used this billing cycle across all (non-FREE) workspaces. */
  used: number;
  /** Sum of credits remaining this billing cycle. */
  remaining: number;
  /** Sum of total granted credits this billing cycle. */
  granted: number;
  /** Today's remaining free daily credits (max across workspace snapshots). */
  freeDailyRemaining: number;
  /** Free daily cap (constant). */
  freeDailyCap: number;
  /** UTC ISO timestamp of next free-daily reset at local midnight. */
  resetAtLocal: string;
  /** Non-FREE workspaces excluded due to entirely-missing credit fields. */
  missingCount: number;
  /** Non-FREE workspaces considered (after FREE-tier filter). */
  totalCount: number;
}

/** Safe number-or-zero coercion. */
function n(value: number | undefined | null): number {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
}

/** True for FREE/unsubscribed workspaces — excluded from billing totals. */
function isFreeTierWorkspace(ws: WorkspaceCredit): boolean {
  const plan = (ws.plan || '').toLowerCase().trim();
  const tier = (ws.tier || '').toUpperCase().trim();
  return plan === PLAN_FREE || tier === TIER_FREE;
}

/** True when the workspace plan is the pro_0 (enriched) branch. */
function isProZeroPlan(ws: WorkspaceCredit): boolean {
  return (ws.plan || '').toLowerCase().trim() === PLAN_PRO_ZERO;
}

/** Per-workspace contribution to the (used, remaining, granted) sums. */
interface CreditTriple { used: number; remaining: number; granted: number }

/** Read the billing-cycle triple from a workspace per plan rules. */
function readCreditTriple(ws: WorkspaceCredit): CreditTriple {
  if (isProZeroPlan(ws)) {
    // Enriched by pro-zero-enrichment.applySummaryToRow().
    return {
      used: n(ws.totalCreditsUsed),
      remaining: n(ws.available),
      granted: n(ws.totalCredits),
    };
  }
  // Issue 120 fix: paid non-pro_0 plans (pro_1, pro_3, lite, ktlo) use the
  // billing-period fields ONLY. Do NOT add daily / granted / topup / rollover
  // into the Total — that double-counts and inflates the user's plan grant.
  return {
    used: n(ws.used),
    remaining: n(ws.billingAvailable),
    granted: n(ws.limit),
  };
}

/** True when none of the three primary credit fields are usable numbers. */
function isMissingCreditData(ws: WorkspaceCredit): boolean {
  if (isProZeroPlan(ws)) {
    const hasUsed = typeof ws.totalCreditsUsed === 'number' && Number.isFinite(ws.totalCreditsUsed);
    const hasAvail = typeof ws.available === 'number' && Number.isFinite(ws.available);
    const hasGranted = typeof ws.totalCredits === 'number' && Number.isFinite(ws.totalCredits);
    return !hasUsed && !hasAvail && !hasGranted;
  }
  const hasUsed = typeof ws.used === 'number' && Number.isFinite(ws.used);
  const hasAvail = typeof ws.billingAvailable === 'number' && Number.isFinite(ws.billingAvailable);
  const hasLimit = typeof ws.limit === 'number' && Number.isFinite(ws.limit);
  return !hasUsed && !hasAvail && !hasLimit;
}

/**
 * Compute the next 00:00 in the user's local timezone as a UTC ISO string.
 */
export function computeNextLocalMidnight(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
}

/**
 * Aggregate per-workspace credits into totals for the Credit Totals modal.
 *
 * @param workspaces  Normalized snapshot (post pro-zero enrichment).
 * @param now         Reference clock — defaults to `new Date()`.
 */
export function aggregateCreditTotals(
  workspaces: WorkspaceCredit[],
  now: Date = new Date(),
): CreditTotals {
  let used = 0;
  let remaining = 0;
  let granted = 0;
  let freeDailyRemaining = 0;
  let missingCount = 0;
  let consideredCount = 0;

  for (const ws of workspaces) {
    // dailyFree is per-account; sample it on every row (incl. FREE) so the
    // free-daily card populates even when the user only has FREE workspaces.
    const dailyFree = n(ws.dailyFree);
    if (dailyFree > freeDailyRemaining) freeDailyRemaining = dailyFree;

    if (isFreeTierWorkspace(ws)) continue;
    consideredCount += 1;

    if (isMissingCreditData(ws)) {
      missingCount += 1;
      continue;
    }
    const triple = readCreditTriple(ws);
    used += triple.used;
    remaining += triple.remaining;
    granted += triple.granted;
  }

  if (freeDailyRemaining > FREE_DAILY_CAP) freeDailyRemaining = FREE_DAILY_CAP;

  return {
    used: Math.round(used),
    remaining: Math.round(remaining),
    granted: Math.round(granted),
    freeDailyRemaining,
    freeDailyCap: FREE_DAILY_CAP,
    resetAtLocal: computeNextLocalMidnight(now),
    missingCount,
    totalCount: consideredCount,
  };
}
