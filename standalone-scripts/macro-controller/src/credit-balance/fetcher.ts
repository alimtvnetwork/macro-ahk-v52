/**
 * MacroLoop Controller — Credit Balance Fetcher (throttle + persistence)
 *
 * Spec: spec/22-app-issues/122a-credit-balance-throttle-and-persistence.md
 *
 * Wraps the existing `fetchCreditBalance()` (which already handles
 * marco.api + bearer + 401 refresh-once) and adds:
 *   - throttle gate (10s per-ws, 5s inter-ws) via ./throttle
 *   - SQLite cache upsert on every successful response via ./store
 *   - last-known cached row on throttle skip / fetch failure
 *
 * Single attempt — no retry, no backoff (mem://constraints/no-retry-policy).
 * Every catch logs via logError (mem://standards/no-error-swallowing).
 */

import { fetchCreditBalance } from '../credit-balance';
import { logError } from '../error-utils';
import { log } from '../logging';
import type { CreditBalanceResponse } from '../types';
import {
    buildRow,
    readCreditBalanceCache,
    writeCreditBalanceCache,
    type CreditBalanceCacheRow,
    type CreditBalanceFetchSource,
} from './store';
import { recordFetch, shouldFetch } from './throttle';

/** Options for `fetchAndPersist`. */
export interface FetchAndPersistOptions {
    /** Bypass throttle (manual right-click). Default false. */
    readonly force?: boolean;
    /** Which path is calling — recorded into the persisted row. */
    readonly source: CreditBalanceFetchSource;
}

/** Outcome of one fetch attempt. */
export interface FetchAndPersistResult {
    readonly workspaceId: string;
    readonly outcome: 'fetched' | 'throttled' | 'failed';
    /** Fresh API response when outcome='fetched', else null. */
    readonly response: CreditBalanceResponse | null;
    /** Row used by the UI: fresh row when fetched, last cached row otherwise. */
    readonly row: CreditBalanceCacheRow | null;
    /** Ms to wait before next attempt would be allowed (0 when fetched/failed). */
    readonly waitMs: number;
}

/**
 * Fetch /credit-balance for one workspace, honouring the throttle and
 * persisting the response to SQLite. Returns the row the UI should
 * display (fresh on success, cached on throttle/failure, null if nothing
 * is known yet).
 */
async function buildThrottledResult(
    workspaceId: string,
    reason: string,
    waitMs: number,
): Promise<FetchAndPersistResult> {
    const cached = await readCreditBalanceCache(workspaceId);
    log(
        'CreditBalance.fetchAndPersist: throttled ws=' + workspaceId +
            ' reason=' + reason + ' waitMs=' + String(waitMs),
        'skip',
    );
    return { workspaceId, outcome: 'throttled', response: null, row: cached, waitMs };
}

async function buildSuccessResult(
    workspaceId: string,
    response: CreditBalanceResponse,
    source: CreditBalanceFetchSource,
): Promise<FetchAndPersistResult> {
    const nowMs = Date.now();
    const row = buildRow(workspaceId, response, source, nowMs);
    writeCreditBalanceCache(row);
    recordFetch(workspaceId, nowMs);
    log(
        'CreditBalance.fetchAndPersist: ok ws=' + workspaceId +
            ' source=' + source +
            ' remaining=' + row.TotalRemaining +
            ' granted=' + row.TotalGranted,
        'success',
    );
    return { workspaceId, outcome: 'fetched', response, row, waitMs: 0 };
}

export async function fetchAndPersist(
    workspaceId: string,
    options: FetchAndPersistOptions,
): Promise<FetchAndPersistResult> {
    if (!workspaceId) {
        return { workspaceId: '', outcome: 'failed', response: null, row: null, waitMs: 0 };
    }

    const decision = shouldFetch(workspaceId, Date.now(), options.force === true);
    if (!decision.allowed) {
        return buildThrottledResult(workspaceId, decision.reason, decision.waitMs);
    }

    try {
        const response = await fetchCreditBalance(workspaceId);
        if (!response) {
            const cached = await readCreditBalanceCache(workspaceId);
            logError(
                'CreditBalance.fetchAndPersist',
                'fetchCreditBalance returned null for ws=' + workspaceId,
            );
            return { workspaceId, outcome: 'failed', response: null, row: cached, waitMs: 0 };
        }
        return buildSuccessResult(workspaceId, response, options.source);
    } catch (caught: unknown) {
        logError(
            'CreditBalance.fetchAndPersist',
            'unexpected error for ws=' + workspaceId,
            caught,
        );
        const cached = await readCreditBalanceCache(workspaceId);
        return { workspaceId, outcome: 'failed', response: null, row: cached, waitMs: 0 };
    }
}
