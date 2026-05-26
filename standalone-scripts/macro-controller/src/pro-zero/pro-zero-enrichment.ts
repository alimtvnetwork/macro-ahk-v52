/**
 * pro-zero-enrichment — apply pro_0 credit-balance numbers onto WorkspaceCredit rows.
 *
 * Spec: spec/22-app-issues/110-macro-controller-pro-zero-credit-balance.md §3, §8
 *
 * For every workspace whose plan resolves to PRO_ZERO, run the orchestrator
 * (cache-first → fetch on miss). On success, overwrite the credit-summary
 * fields on the matching WorkspaceCredit row so every downstream consumer
 * (status bar, hover card, CSV export) sees the authoritative values.
 *
 * Re-aggregation + UI refresh are scheduled by the caller; this module
 * returns the count of rows mutated so the caller can decide whether to
 * trigger a re-render.
 */

import type { WorkspaceCredit } from '../types';
import { adaptWorkspaceInfoTyped } from './pro-zero-workspace-adapter';
import { mapWorkspacePlan, isProZeroPlan } from './workspace-plan-mapper';
import { buildProZeroCreditSummary } from './pro-zero-credit-summary';
import type { MacroCreditSummary } from './macro-credit-summary';
import { logError } from '../error-utils';

/** WorkspaceCredit field used to expose the verbatim /credit-balance JSON to Copy-JSON. */
export const PRO_ZERO_BALANCE_JSON_FIELD = 'proZeroCreditBalanceJson';
/** WorkspaceCredit field marking the row as enriched by the pro_0 branch. */
export const PRO_ZERO_SOURCE_FIELD = 'proZeroSource';

/** Field names where calculator-derived sub-bucket values land on WorkspaceCredit. */
export const PRO_ZERO_BILLING_REMAINING_FIELD = 'proZeroBillingRemaining';
export const PRO_ZERO_TOPUP_REMAINING_FIELD = 'proZeroTopupRemaining';
export const PRO_ZERO_BONUS_REMAINING_FIELD = 'proZeroBonusRemaining';
export const PRO_ZERO_ROLLOVER_REMAINING_FIELD = 'proZeroRolloverRemaining';
export const PRO_ZERO_DAILY_REMAINING_FIELD = 'proZeroDailyRemaining';

export function applySummaryToRow(ws: WorkspaceCredit, summary: MacroCreditSummary, balanceJson: string): void {
    ws.totalCredits = summary.Total;
    ws.available = summary.AvailableCredits;
    ws.totalCreditsUsed = summary.TotalUsed;
    ws.billingAvailable = summary.BillingRemaining;
    ws[PRO_ZERO_BILLING_REMAINING_FIELD] = summary.BillingRemaining;
    ws[PRO_ZERO_TOPUP_REMAINING_FIELD] = summary.TopupRemaining;
    ws[PRO_ZERO_BONUS_REMAINING_FIELD] = summary.BonusRemaining;
    ws[PRO_ZERO_ROLLOVER_REMAINING_FIELD] = summary.RolloverRemaining;
    ws[PRO_ZERO_DAILY_REMAINING_FIELD] = summary.DailyRemaining;
    ws[PRO_ZERO_BALANCE_JSON_FIELD] = balanceJson;
    ws[PRO_ZERO_SOURCE_FIELD] = summary.Source;
    // Issue 118: sync direct fields so credit-bar segments and hover card
    // read the enriched values instead of stale workspace-API estimates.
    ws.rollover = summary.RolloverRemaining;
    ws.dailyFree = summary.DailyRemaining;
    ws.dailyLimit = summary.DailyLimit;
}

async function enrichOne(ws: WorkspaceCredit): Promise<boolean> {
    if (!isProZeroPlan(mapWorkspacePlan(ws.plan))) return false;
    try {
        const typed = adaptWorkspaceInfoTyped(ws.rawApi || {});
        const outcome = await buildProZeroCreditSummary(typed);
        if (!outcome.isOk) return false;
        applySummaryToRow(ws, outcome.summary, JSON.stringify(outcome.balance, null, 2));

        return true;
    } catch (caught: unknown) {
        logError('ProZeroEnrichment', 'enrichOne failed for ws=' + ws.id, caught);

        return false;
    }
}

/** Enrich every pro_0 workspace in the list. Returns number of rows mutated. */
export async function enrichProZeroWorkspaces(perWs: WorkspaceCredit[]): Promise<number> {
    const results = await Promise.all(perWs.map(enrichOne));

    return results.filter(Boolean).length;
}
