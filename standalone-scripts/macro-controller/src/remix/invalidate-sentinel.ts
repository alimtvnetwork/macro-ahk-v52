/**
 * MacroLoop Controller — Injection-sentinel invalidator (Issue 129 Step 8)
 *
 * Spec: spec/22-app-issues/129-prompts-cache-plan-task-gitsync-remix.md
 *       § Step 8 — invalidate injection sentinel so the new project URL
 *       triggers a fresh auto-reinjection after the active tab navigates.
 *
 * Three independent caches need to be cleared in order:
 *
 *   1. Page DOM sentinel `<div id="__marco_sentinel__">` (written by
 *      `src/background/url-trigger.ts`) — drives the page-side "should
 *      I run?" check. Removing it forces the next decision to fingerprint
 *      against an absent element and emit a fresh sentinel.
 *
 *   2. MAIN-world relay flag `window.__marcoRelayActive` (written by
 *      `src/background/handlers/injection-handler.ts ensureRelayInjected`).
 *      Clearing it lets the safety-net probe re-execute the relay script.
 *
 *   3. Background injection cache — fired by sending the
 *      `INVALIDATE_CACHE` extension message
 *      (`src/background/message-registry.ts`). This is the only path that
 *      reaches the service-worker's per-tab/per-project cache.
 *
 * Sequential fail-fast per `mem://constraints/no-retry-policy`: each
 * step is best-effort and errors are logged via the namespace logger
 * (`mem://standards/error-logging-via-namespace-logger.md`). One failed
 * step never aborts the others — partial invalidation is still progress.
 */

import { logError } from '../error-utils';
import { log } from '../logging';
import { sendToExtension } from '../ui/prompt-loader';

/** Mirrors `MARCO_SENTINEL_ID` in `src/background/url-trigger.ts`. */
export const MARCO_SENTINEL_DOM_ID = '__marco_sentinel__';

/** Mirrors the MAIN-world flag set by ensureRelayInjected. */
export const MARCO_RELAY_ACTIVE_KEY = '__marcoRelayActive';

/** Mirrors `MessageType.INVALIDATE_CACHE` in `src/shared/messages.ts`. */
export const INVALIDATE_CACHE_MSG = 'INVALIDATE_CACHE';

export interface InvalidateSentinelResult {
    readonly removedDomSentinel: boolean;
    readonly clearedRelayFlag: boolean;
    readonly sentInvalidateMessage: boolean;
}

/* ------------------------------------------------------------------ */
/*  Step 1 — remove DOM sentinel                                       */
/* ------------------------------------------------------------------ */

function removeDomSentinel(): boolean {
    try {
        if (typeof document === 'undefined') return false;
        const element = document.getElementById(MARCO_SENTINEL_DOM_ID);
        if (!element) return false;
        element.remove();
        return true;
    } catch (err: unknown) {
        logError('SentinelInvalidate',
            'removeDomSentinel failed (id=' + MARCO_SENTINEL_DOM_ID + ')', err);
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  Step 2 — clear MAIN-world relay flag                                */
/* ------------------------------------------------------------------ */

function clearRelayFlag(): boolean {
    try {
        if (typeof window === 'undefined') return false;
        const bag = window as unknown as Record<string, unknown>;
        if (!(MARCO_RELAY_ACTIVE_KEY in bag)) return false;
        delete bag[MARCO_RELAY_ACTIVE_KEY];
        return true;
    } catch (err: unknown) {
        logError('SentinelInvalidate',
            'clearRelayFlag failed (key=' + MARCO_RELAY_ACTIVE_KEY + ')', err);
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  Step 3 — INVALIDATE_CACHE message to background                     */
/* ------------------------------------------------------------------ */

async function sendInvalidateCache(): Promise<boolean> {
    try {
        await sendToExtension(INVALIDATE_CACHE_MSG, {});
        return true;
    } catch (err: unknown) {
        logError('SentinelInvalidate',
            'sendToExtension(INVALIDATE_CACHE) failed — background may be sleeping', err);
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Invalidate every injection sentinel layer ahead of an in-place
 * navigation to a remixed project. Returns a struct describing which
 * step(s) actually had something to clear — useful for diagnostics and
 * for the calling toast.
 */
export async function invalidateInjectionSentinel(): Promise<InvalidateSentinelResult> {
    const removedDomSentinel = removeDomSentinel();
    const clearedRelayFlag = clearRelayFlag();
    const sentInvalidateMessage = await sendInvalidateCache();

    log('[SentinelInvalidate] dom=' + removedDomSentinel
        + ' relay=' + clearedRelayFlag
        + ' bgMsg=' + sentInvalidateMessage, 'info');

    return { removedDomSentinel, clearedRelayFlag, sentInvalidateMessage };
}
