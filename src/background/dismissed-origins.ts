/**
 * Marco Extension — Dismissed Origins (C9 gate)
 *
 * Two-layer registry of origins the user has dismissed for auto-attach:
 *
 *   1. Per-tab in-memory Map<tabId, Set<origin>> — ephemeral, cleared on
 *      tab close, used by `auto-injector.ts` to short-circuit T1/T3
 *      navigations on the same (tab, origin) pair.
 *
 *   2. Per-origin persisted set in `chrome.storage.local` under
 *      `marco_dismissed_origins` — survives service-worker restarts and
 *      applies across tabs once the user picks "Don't ask for this site"
 *      in the first-attach toast.
 *
 * The persisted layer hydrates on first use and is updated through
 * `persistDismissOrigin` / `unpersistDismissOrigin`. The tab-scoped layer
 * is the fast path consulted on every navigation; it is OR'd with the
 * persisted set inside `isOriginDismissedForTab`.
 *
 * No retry/backoff (mem://constraints/no-retry-policy) — a failed
 * storage write logs once and falls back to the in-memory layer.
 *
 * See:
 *   - mem://features/auto-attach-policy (C1..C9 gates)
 *   - .lovable/audits/ link-click "opens the extension" investigation
 */

import { logCaughtError, BgLogTag } from "./bg-logger";

/** chrome.storage.local key — stable contract. */
export const STORAGE_KEY_DISMISSED_ORIGINS = "marco_dismissed_origins";

/** tabId -> Set<origin> the user dismissed on that tab (ephemeral). */
const dismissedByTab: Map<number, Set<string>> = new Map();

/** Origins persisted across tabs/sessions. Hydrated lazily on first read. */
const dismissedPersistent: Set<string> = new Set();
let persistentHydrated = false;

/** Normalizes a URL to its origin; returns "" when unparseable. */
function safeOrigin(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return "";
    }
}

/** Lazy hydrate of the persistent set. Idempotent; safe to call often. */
async function hydratePersistent(): Promise<void> {
    if (persistentHydrated) return;
    try {
        const raw = await chrome.storage.local.get(STORAGE_KEY_DISMISSED_ORIGINS);
        const list = raw[STORAGE_KEY_DISMISSED_ORIGINS];
        if (Array.isArray(list)) {
            for (const origin of list) {
                if (typeof origin === "string" && origin.length > 0) {
                    dismissedPersistent.add(origin);
                }
            }
        }
        persistentHydrated = true;
    } catch (err) {
        logCaughtError(
            BgLogTag.MARCO,
            "[dismissed-origins] hydrate failed; falling back to in-memory only",
            err,
        );
        // Mark hydrated anyway — we don't retry. Next persist call will
        // overwrite with whatever we currently know.
        persistentHydrated = true;
    }
}

/** Eagerly preload the persistent set (e.g. from boot.ts). */
export async function preloadDismissedOrigins(): Promise<void> {
    await hydratePersistent();
}

/** Records that the user dismissed the auto-attach prompt for this (tab, origin). */
export function dismissOriginForTab(tabId: number, url: string): void {
    const origin = safeOrigin(url);
    if (origin === "") return;
    let set = dismissedByTab.get(tabId);
    if (set === undefined) {
        set = new Set<string>();
        dismissedByTab.set(tabId, set);
    }
    set.add(origin);
}

/**
 * Returns true when the (tab, origin) pair is dismissed in either layer.
 * Synchronous and hot-path; reads `dismissedPersistent` which was hydrated
 * by `preloadDismissedOrigins()` during boot. If boot didn't preload, this
 * silently falls back to the tab-scoped layer only — never blocks.
 */
export function isOriginDismissedForTab(tabId: number, url: string): boolean {
    const origin = safeOrigin(url);
    if (origin === "") return false;
    if (dismissedPersistent.has(origin)) return true;
    const set = dismissedByTab.get(tabId);
    return set !== undefined && set.has(origin);
}

/** "Don't ask for this site" — promote origin to the persistent layer. */
export async function persistDismissOrigin(url: string): Promise<void> {
    const origin = safeOrigin(url);
    if (origin === "") return;
    await hydratePersistent();
    if (dismissedPersistent.has(origin)) return;
    dismissedPersistent.add(origin);
    try {
        await chrome.storage.local.set({
            [STORAGE_KEY_DISMISSED_ORIGINS]: Array.from(dismissedPersistent),
        });
    } catch (err) {
        logCaughtError(
            BgLogTag.MARCO,
            `[dismissed-origins] persist failed for origin=${origin}`,
            err,
        );
    }
}

/** Reverses `persistDismissOrigin` (used by Options "Forget site"). */
export async function unpersistDismissOrigin(url: string): Promise<void> {
    const origin = safeOrigin(url);
    if (origin === "") return;
    await hydratePersistent();
    if (!dismissedPersistent.has(origin)) return;
    dismissedPersistent.delete(origin);
    try {
        await chrome.storage.local.set({
            [STORAGE_KEY_DISMISSED_ORIGINS]: Array.from(dismissedPersistent),
        });
    } catch (err) {
        logCaughtError(
            BgLogTag.MARCO,
            `[dismissed-origins] unpersist failed for origin=${origin}`,
            err,
        );
    }
}

/** Read-only snapshot of persisted origins (for Options UI listings). */
export async function listPersistedDismissedOrigins(): Promise<string[]> {
    await hydratePersistent();
    return Array.from(dismissedPersistent).sort();
}

/** Clears all dismissed origins for a tab (call from tabs.onRemoved). */
export function clearDismissedOriginsForTab(tabId: number): void {
    dismissedByTab.delete(tabId);
}

/** Test-only reset of all in-memory state. */
export function _resetDismissedOriginsForTests(): void {
    dismissedByTab.clear();
    dismissedPersistent.clear();
    persistentHydrated = false;
}

/** Test-only inspector. */
export function _debugDumpDismissed(): {
    perTab: Record<number, string[]>;
    persistent: string[];
} {
    const perTab: Record<number, string[]> = {};
    for (const [tabId, set] of dismissedByTab.entries()) {
        perTab[tabId] = Array.from(set);
    }
    return { perTab, persistent: Array.from(dismissedPersistent) };
}
