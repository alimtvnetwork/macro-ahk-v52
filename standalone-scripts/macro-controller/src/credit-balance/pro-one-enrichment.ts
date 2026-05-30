/**
 * MacroLoop Controller — pro_1 Credit Balance Enrichment
 *
 * Spec: spec/22-app-issues/122a-credit-balance-throttle-and-persistence.md
 *
 * Mirrors the pro_0 enrichment pattern. For every workspace whose
 * `plan === 'pro_1'`, overlay the authoritative `/credit-balance`
 * numbers from the SQLite-backed cache (populated by fetcher.ts) on
 * top of the values parsed from `/user/workspaces`.
 *
 * Pure: no network. Reads cached rows written by fetchAndPersist().
 * Rows missing from cache are left untouched (legacy calc preserved).
 */

import type { WorkspaceCredit } from '../types';
import { log, logSub } from '../logging';
import { readCreditBalanceCache, type CreditBalanceCacheRow } from './store';

const PRO_ONE_PLAN_LITERAL = 'pro_1';

function isProOne(ws: WorkspaceCredit): boolean {
    return (ws.plan || '').toLowerCase().trim() === PRO_ONE_PLAN_LITERAL;
}

function overlayRow(ws: WorkspaceCredit, row: CreditBalanceCacheRow): void {
    const dailyLimit = Math.round(row.DailyLimit);
    const dailyRemaining = Math.max(0, Math.round(row.DailyRemaining));
    const dailyUsed = Math.max(0, dailyLimit - dailyRemaining);

    ws.totalCredits = Math.round(row.TotalGranted);
    ws.available = Math.max(0, Math.round(row.TotalRemaining));
    ws.totalCreditsUsed = Math.max(0, Math.round(row.TotalBillingUsed));
    ws.used = ws.totalCreditsUsed;
    ws.dailyLimit = dailyLimit;
    ws.dailyUsed = dailyUsed;
    ws.dailyFree = dailyRemaining;
}

/**
 * Overlay cached /credit-balance values onto every pro_1 row in `perWs`.
 * Returns the number of rows mutated.
 */
export async function enrichProOneWorkspaces(perWs: WorkspaceCredit[]): Promise<number> {
    if (!perWs || perWs.length === 0) return 0;
    let mutated = 0;
    for (const ws of perWs) {
        if (!isProOne(ws) || !ws.id) continue;
        const row = await readCreditBalanceCache(ws.id);
        if (!row) {
            logSub('[ProOne] cache miss ws=' + ws.id + ' (' + (ws.fullName || ws.name) + ')', 2);
            continue;
        }
        overlayRow(ws, row);
        mutated++;
        logSub(
            '[ProOne] overlay ws=' + ws.id +
                ' total=' + ws.totalCredits +
                ' avail=' + ws.available +
                ' used=' + ws.totalCreditsUsed,
            2,
        );
    }
    if (mutated > 0) {
        log('[ProOne] Overlaid ' + mutated + ' workspace(s) from /credit-balance cache', 'success');
    }
    return mutated;
}
