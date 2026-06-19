/**
 * Payment Banner Hider — Shared types & constants.
 *
 * Extracted from index.ts so the class file stays focused on behaviour
 * and the state machine has a single source of truth (CQ3 — no magic
 * strings).
 */

/** Lifecycle states of a matched banner element. */
export enum BannerState {
    Fading = "fading",
    Hiding = "hiding",
    Done = "done",
}

/** DOM attribute used both for state tracking AND CSS scoping. */
export const STATE_ATTR = "data-marco-banner-hider";

/**
 * Banner match pattern: an XPath plus one or more substrings any of which
 * must appear in the element's textContent. Multiple patterns are tried
 * in order — the first match wins.
 */
export interface BannerPattern {
    readonly xpath: string;
    readonly anyText: readonly string[];
}

/**
 * Known sticky billing banners. Add new entries here when Lovable ships
 * a new banner variant — no other code needs to change.
 *
 * 1. Legacy "Payment issue detected." banner (div[1] root).
 * 2. v3.59.0 — "Update payment method" / "Final notice" banner
 *    (div[1]/div root, sibling to the new header).
 */
export const BANNER_PATTERNS: readonly BannerPattern[] = [
    {
        xpath: "/html/body/div[2]/main/div/div[1]",
        anyText: ["Payment issue detected."],
    },
    {
        xpath: "/html/body/div[2]/main/div/div[1]/div",
        anyText: [
            "Update payment method",
            "Final notice",
            "reverted to the Free plan",
        ],
    },
];

/** Time after which the banner is fully collapsed and display:none-d. */
export const REMOVE_DELAY_MS = 1000;

/** Debounce window for MutationObserver-driven check() calls. */
export const OBSERVER_DEBOUNCE_MS = 100;

/** Public surface exposed on `window` for debugging. */
export interface PaymentBannerHiderApi {
    readonly version: string;
    check(): void;
}
