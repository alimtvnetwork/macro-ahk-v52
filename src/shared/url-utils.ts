/**
 * Marco Extension — URL utility helpers
 *
 * Single source of truth for URL classification used across background,
 * matcher, and injection layers.
 *
 * See:
 *   - mem://features/new-tab-no-url-guard
 *   - spec/21-app/02-features/chrome-extension/05-content-script-adaptation.md §4a
 */

/**
 * Returns true when the URL represents a "new tab" or otherwise has no real
 * page address — i.e. there is nothing for the auto-injector or matcher to
 * act on. Always treat as a hard no-op upstream.
 *
 * Covered cases:
 *   - empty string, undefined, null
 *   - `about:blank` (any casing, with/without trailing slash, with hash/query)
 *   - `chrome://newtab/`, `chrome://new-tab-page/`
 *   - `chrome-search://local-ntp*` (the embedded Google new-tab page)
 *   - `edge://newtab/`, `brave://newtab/`, `opera://startpage/`
 *
 * Real `http(s)://` URLs always return false, even on the host root.
 */
const NEW_TAB_PREFIXES = [
    "chrome://newtab",
    "chrome://new-tab-page",
    "chrome-search://local-ntp",
    "edge://newtab",
    "brave://newtab",
    "opera://startpage",
];

function matchesPrefix(lower: string, prefix: string): boolean {
    return lower === prefix
        || lower.startsWith(`${prefix}/`)
        || lower.startsWith(`${prefix}?`)
        || lower.startsWith(`${prefix}#`);
}

export function isNewTabOrBlankUrl(url: string | undefined | null): boolean {
    if (url === undefined || url === null || url === "") {
        return true;
    }
    const lower = url.trim().toLowerCase();
    if (lower === "") {
        return true;
    }
    if (matchesPrefix(lower, "about:blank")) {
        return true;
    }
    return NEW_TAB_PREFIXES.some((prefix) => matchesPrefix(lower, prefix));
}
