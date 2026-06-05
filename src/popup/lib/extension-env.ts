/**
 * Marco — Popup Extension-Environment Guard
 *
 * Step 1/20 of the popup-fix plan (see assistant RCA in chat).
 *
 * The Lovable web preview iframe has no `chrome.*` APIs. Popup
 * components that call `chrome.tabs.query` / `chrome.scripting.*` /
 * `chrome.storage.*` without a guard throw, the React subtree
 * unmounts, and the popup body collapses to an empty 0px div — the
 * exact "broken UI" the user reported.
 *
 * This module is a thin, dependency-free guard that:
 *   1. Reports whether we are running inside a real extension popup.
 *   2. Exposes a typed `chrome` reference that is `null` in preview.
 *   3. Provides `requireExtension(scope)` for code paths that must
 *      hard-fail with a Code-Red-shaped log line if called from preview.
 *
 * It complements `src/platform/index.ts` (which returns a full
 * PlatformAdapter); this file is the cheaper boolean+ref check that
 * UI components and the inject button need at render time.
 */

import { logError } from "../../hooks/popup-logger";

/** Minimal shape we rely on for detection. */
interface ChromeLike {
    runtime?: { id?: string };
    tabs?: unknown;
    scripting?: unknown;
    storage?: unknown;
}

/** Window-augment with optional `chrome` global. */
interface MaybeChromeGlobal {
    chrome?: ChromeLike;
}

/** Returns the `chrome` global if a real extension context is present. */
export function getExtensionChrome(): ChromeLike | null {
    const maybe = globalThis as MaybeChromeGlobal;
    const candidate = maybe.chrome;
    if (candidate === undefined) {
        return null;
    }
    if (candidate.runtime === undefined || candidate.runtime.id === undefined) {
        return null;
    }
    return candidate;
}

/** True when running inside a real Chrome extension popup. */
export function isExtensionPopup(): boolean {
    return getExtensionChrome() !== null;
}

/**
 * Returns the chrome global or `null`. UI components should prefer
 * this and render a friendly "Preview mode — install the extension"
 * placeholder instead of crashing.
 */
export const extensionChrome: ChromeLike | null = getExtensionChrome();

/**
 * Hard-require the extension context. Use only at the start of
 * code paths that cannot meaningfully run in preview (e.g. the
 * inject pipeline). Logs a Code-Red-shaped line and returns `null`
 * on miss — never throws, so the React tree stays mounted.
 */
export function requireExtension(scope: string): ChromeLike | null {
    const chrome = getExtensionChrome();
    if (chrome !== null) {
        return chrome;
    }
    logError(
        scope,
        "Extension context unavailable\n"
            + "  Path: globalThis.chrome.runtime.id\n"
            + "  Missing: chrome.runtime.id (no extension host attached)\n"
            + "  Reason: Popup is running in Lovable web preview, not as a Chrome extension popup. "
            + "Side-load the extension via chrome://extensions to exercise this code path.",
    );
    return null;
}
