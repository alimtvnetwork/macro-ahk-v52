/**
 * MacroLoop Controller — Credit Balance Boot Hydrator
 *
 * Spec: spec/22-app-issues/122a-credit-balance-throttle-and-persistence.md
 *
 * On startup, reads every persisted credit-balance row from SQLite (via
 * marco.kv) and seeds the in-memory throttle map so that:
 *   - the 10s per-workspace cooldown survives extension reloads
 *   - the panel can show "last known" numbers immediately without firing
 *     any API call until the user (or batch) chooses to refresh
 *
 * Idempotent — safe to call more than once; later calls are no-ops via
 * the `seedLastFetched` (max-wins) merge in ./throttle.
 *
 * Standards:
 *   - mem://standards/no-error-swallowing — single catch logs via logError.
 *   - mem://constraints/no-retry-policy — single attempt; failure is logged
 *     and accepted (panel just starts cold).
 */

import { logError } from '../error-utils';
import { log } from '../logging';
import { listCreditBalanceCache, type CreditBalanceCacheRow } from './store';
import { seedLastFetched } from './throttle';

let hydratePromise: Promise<ReadonlyArray<CreditBalanceCacheRow>> | null = null;

/**
 * Hydrate the throttle map from persisted SQLite rows. Returns the rows
 * so callers can pre-paint the panel with cached numbers.
 *
 * Memoised — concurrent callers share one underlying load.
 */
export function hydrateCreditBalanceFromCache(): Promise<ReadonlyArray<CreditBalanceCacheRow>> {
    if (hydratePromise) {
        return hydratePromise;
    }
    hydratePromise = (async function (): Promise<ReadonlyArray<CreditBalanceCacheRow>> {
        try {
            const rows = await listCreditBalanceCache();
            for (const row of rows) {
                seedLastFetched(row.WorkspaceId, row.FetchedAtMs);
            }
            log(
                'CreditBalance.hydrate: seeded ' + rows.length + ' workspace(s) from SQLite',
                'info',
            );
            return rows;
        } catch (caught: unknown) {
            logError(
                'CreditBalance.hydrate',
                'failed to hydrate credit-balance cache from marco.kv',
                caught,
            );
            return [];
        }
    })();
    return hydratePromise;
}

/** Test-only reset of the memoised promise. */
export function __resetHydrateForTests(): void {
    hydratePromise = null;
}
