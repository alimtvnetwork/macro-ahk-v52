/**
 * MacroLoop Controller — Refill Priority scoring & sort (v3.10.0)
 *
 * Spec: spec/22-app-issues/refill-priority-filter/01-overview.md
 *
 * Pure helpers. No DOM, no side effects. The refill score surfaces
 * workspaces that BOTH refill soon AND still hold spendable credits.
 *
 *   score = max(0, K - daysToRefill) * max(0, available)
 *
 * Workspaces with no refill date, an already-past refill, or `daysToRefill`
 * beyond the window K score 0 and fall to the end of the priority sort.
 */

import type { WorkspaceCredit } from './types';
import { daysUntil } from './workspace-status';
import { resolveCreditSummary } from './credit-balance-update/credit-summary-resolver';

/** Single source of truth for "available credits" — resolver-backed (Step 43). */
function resolvedAvailable(ws: WorkspaceCredit): number {
  return Math.max(0, resolveCreditSummary(ws).available);
}

/**
 * Resolve the days-until-refill for a workspace, or `null` when no usable
 * refill date is available. Prefers `nextRefillAt`; falls back to
 * `billingPeriodEndAt`.
 */
export function daysToRefillForWs(ws: WorkspaceCredit, nowMs?: number): number | null {
  const iso = ws.nextRefillAt || ws.billingPeriodEndAt || '';
  if (!iso) return null;
  const d = daysUntil(iso, nowMs);
  return d < 0 ? null : d;
}

/**
 * Compute the refill-priority score for a single workspace.
 *
 * @param ws workspace credit row
 * @param windowDays K — the urgency window (smaller days → higher urgency)
 * @param nowMs injectable clock for tests
 */
export function computeRefillScore(
  ws: WorkspaceCredit,
  windowDays: number,
  nowMs?: number,
): number {
  const days = daysToRefillForWs(ws, nowMs);
  if (days === null) return 0;
  const urgency = Math.max(0, windowDays - days);
  const available = Math.max(0, ws.available || 0);
  return urgency * available;
}

/**
 * Stable descending sort by refill score. Ties break by `available` desc
 * then `id` asc so the order is deterministic across renders.
 */
export function sortByRefillPriority<T extends { ws: WorkspaceCredit }>(
  rows: T[],
  windowDays: number,
  nowMs?: number,
): T[] {
  const decorated = rows.map(function (row, idx) {
    return {
      row,
      score: computeRefillScore(row.ws, windowDays, nowMs),
      available: Math.max(0, row.ws.available || 0),
      id: String(row.ws.id || ''),
      idx,
    };
  });
  decorated.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.available !== a.available) return b.available - a.available;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return a.idx - b.idx;
  });
  return decorated.map(function (d) { return d.row; });
}
