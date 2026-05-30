/**
 * MacroLoop Controller — Credit Balance Batch Refresh (pro_1 only)
 *
 * Spec: spec/22-app-issues/122a-credit-balance-throttle-and-persistence.md
 *
 * Triggered by the panel "💰 Credits" button. Iterates every workspace
 * whose plan is `pro_1`, calls `fetchAndPersist()` sequentially with a
 * 5-second gap between each request. Per-workspace 10s cooldown still
 * applies (throttled workspaces return their last cached row instead of
 * hitting the network).
 *
 * Single sequential pass — no retry, no backoff
 * (mem://constraints/no-retry-policy). Each iteration catches and logs
 * via logError (mem://standards/no-error-swallowing).
 *
 * The right-click "Credit Refresh" path is per-workspace and lives
 * elsewhere; it bypasses the throttle via `{ force: true }`.
 */

import { logError } from '../error-utils';
import { log } from '../logging';
import { fetchAndPersist, type FetchAndPersistResult } from './fetcher';
import { INTER_WS_GAP_MS } from './throttle';

/** Wire-string plan literal that gates the batch (pro_1 only). */
const PRO_ONE_PLAN_LITERAL = 'pro_1';

/** Minimal workspace shape needed by the batch. */
export interface BatchWorkspaceCandidate {
    readonly workspaceId: string;
    readonly plan: string | null | undefined;
}

/** Per-workspace iteration result, surfaced to callers/tests. */
export interface BatchRefreshIterationResult {
    readonly workspaceId: string;
    readonly outcome: FetchAndPersistResult['outcome'] | 'skipped-not-pro-one';
}

export interface BatchRefreshSummary {
    readonly total: number;
    readonly attempted: number;
    readonly fetched: number;
    readonly throttled: number;
    readonly failed: number;
    readonly skipped: number;
    readonly results: ReadonlyArray<BatchRefreshIterationResult>;
}

/** Sleep helper — sequential, no recursion, single pending timer. */
function delay(ms: number): Promise<void> {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * Iterate `candidates`, refresh credit balance for every pro_1 workspace
 * with a 5s gap between each call. Other plans are skipped (not counted
 * as failures). Resolves once every iteration completes.
 */
export async function batchRefreshProOneCreditBalances(
    candidates: ReadonlyArray<BatchWorkspaceCandidate>,
): Promise<BatchRefreshSummary> {
    const results: BatchRefreshIterationResult[] = [];
    let fetched = 0;
    let throttled = 0;
    let failed = 0;
    let skipped = 0;
    let attempted = 0;

    const proOne = candidates.filter(function (c) {
        return c.plan === PRO_ONE_PLAN_LITERAL;
    });

    log(
        'CreditBalance.batchRefresh: starting (candidates=' + String(candidates.length)
            + ', pro_1=' + String(proOne.length) + ', gapMs=' + String(INTER_WS_GAP_MS) + ')',
        'info',
    );

    // Count non-pro_1 candidates as skipped for the summary.
    for (const c of candidates) {
        if (c.plan !== PRO_ONE_PLAN_LITERAL) {
            skipped += 1;
            results.push({ workspaceId: c.workspaceId, outcome: 'skipped-not-pro-one' });
        }
    }

    for (let i = 0; i < proOne.length; i += 1) {
        const ws = proOne[i];
        if (i > 0) {
            await delay(INTER_WS_GAP_MS);
        }
        attempted += 1;
        try {
            const result = await fetchAndPersist(ws.workspaceId, {
                force: false,
                source: 'panel-credits-button',
            });
            results.push({ workspaceId: ws.workspaceId, outcome: result.outcome });
            if (result.outcome === 'fetched') {
                fetched += 1;
            } else if (result.outcome === 'throttled') {
                throttled += 1;
            } else {
                failed += 1;
            }
        } catch (err: unknown) {
            failed += 1;
            results.push({ workspaceId: ws.workspaceId, outcome: 'failed' });
            logError('CreditBalance.batchRefresh: fetchAndPersist threw for workspaceId='
                + ws.workspaceId, err);
        }
    }

    const summary: BatchRefreshSummary = {
        total: candidates.length,
        attempted,
        fetched,
        throttled,
        failed,
        skipped,
        results,
    };

    log(
        'CreditBalance.batchRefresh: done '
            + '(attempted=' + String(attempted)
            + ', fetched=' + String(fetched)
            + ', throttled=' + String(throttled)
            + ', failed=' + String(failed)
            + ', skipped=' + String(skipped) + ')',
        'success',
    );

    return summary;
}
