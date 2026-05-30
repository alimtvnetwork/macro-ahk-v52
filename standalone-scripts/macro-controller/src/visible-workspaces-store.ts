/**
 * Visible-workspaces store — tiny pub/sub for the dashboard SummaryBar
 * (Issue 125 Task 9, filter-reactive recomputation).
 *
 * Producers (renderLoopWorkspaceList) call `publishVisibleWorkspaces()`
 * after each filter / sort pass. Consumers (SummaryBar wiring in
 * panel-builder) subscribe via `subscribeVisibleWorkspaces()` and receive
 * the newly-visible array within the same microtask.
 *
 * No throttling — the catalog is ≤ 439 rows and the aggregate is O(n).
 * The store is module-singleton; tests reset it via `__resetVisibleWorkspacesStore()`.
 */

import type { WorkspaceCredit } from './types/credit-types';

type Listener = (rows: ReadonlyArray<WorkspaceCredit>) => void;

let lastRows: ReadonlyArray<WorkspaceCredit> = [];
const listeners = new Set<Listener>();

export function publishVisibleWorkspaces(rows: ReadonlyArray<WorkspaceCredit>): void {
    lastRows = rows;
    for (const cb of listeners) {
        try {
            cb(rows);
        } catch (_e: unknown) {
            // Listeners must not break the renderer. Errors surface via
            // the namespace logger inside the listener itself.
        }
    }
}

export function subscribeVisibleWorkspaces(cb: Listener): () => void {
    listeners.add(cb);
    // Push the current snapshot immediately so late subscribers stay in sync.
    if (lastRows.length > 0) {
        try { cb(lastRows); } catch (_e: unknown) { /* see publish */ }
    }
    return function unsubscribe(): void {
        listeners.delete(cb);
    };
}

export function getLastVisibleWorkspaces(): ReadonlyArray<WorkspaceCredit> {
    return lastRows;
}

/** Test-only: reset module singleton state between tests. */
export function __resetVisibleWorkspacesStore(): void {
    lastRows = [];
    listeners.clear();
}
