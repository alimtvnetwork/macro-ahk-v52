/**
 * Payment Banner Hider — Shared types & constants.
 */

export enum BannerState {
    Fading = "fading",
    Hiding = "hiding",
    Done = "done",
}

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
 * Known sticky billing banners. New banner variants are added here; if
 * none of the XPaths hit, the locator falls back to BANNER_TEXT_NEEDLES
 * (text-only scan) so DOM-structure churn does not break collapse.
 */
export const BANNER_PATTERNS: readonly BannerPattern[] = [
    {
        xpath: "/html/body/div[2]/main/div/div[1]",
        anyText: ["Payment issue detected.", "Final notice"],
    },
    {
        xpath: "/html/body/div[2]/main/div/div[1]/div",
        anyText: [
            "Update payment method",
            "Final notice",
            "reverted to the Free plan",
            "payment isn't updated",
        ],
    },
];

/**
 * Text-only fallback (case-insensitive — matched lowercased in
 * banner-locator.ts). When every XPath misses (Lovable shifted the
 * DOM), the locator scans for the smallest element whose textContent
 * contains one of these needles and uses that as the collapse target.
 */
export const BANNER_TEXT_NEEDLES: readonly string[] = [
    "payment issue detected",
    "update payment method",
    "final notice",
    "reverted to the free plan",
    "payment isn't updated",
];

/** Cap the text-fallback scan so we don't pay for huge documents. */
export const TEXT_SCAN_MAX_NODES = 8000;

export const REMOVE_DELAY_MS = 1000;
export const OBSERVER_DEBOUNCE_MS = 100;

/** Debug overlay match record — surfaced via window.PaymentBannerHider.debug(). */
export interface BannerDebugMatch {
    readonly source: "xpath" | "text-fallback" | "none";
    readonly xpath: string | null;
    readonly matchedText: string | null;
    readonly collapseTargetCount: number;
    readonly timestamp: number;
}

export interface PaymentBannerHiderApi {
    readonly version: string;
    check(): void;
    debug(): BannerDebugMatch | null;
}
