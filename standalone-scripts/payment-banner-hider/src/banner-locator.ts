/**
 * Payment Banner Hider — Banner locator.
 *
 * Resolves the sticky billing banner via one of several known
 * XPath+text patterns (BANNER_PATTERNS in types.ts) and confirms
 * the element's textContent contains an expected substring.
 *
 * Errors are NEVER swallowed — XPath defects throw and surface to
 * the caller's catch block where they are logged via
 * RiseupAsiaMacroExt.Logger.error and rethrown
 * (per no-error-swallowing standard).
 */

import { BANNER_PATTERNS, type BannerPattern } from "./types";

// 9 is the DOM XPath "first ordered node" result type. Kept numeric so
// the standalone bundle can be smoke-tested in Node shims without
// browser-only XPath globals.
const XPATH_RESULT_FIRST_ORDERED_NODE_TYPE = 9;

function isHtmlElement(node: Node | null): node is HTMLElement {
    if (node === null) {
        return false;
    }

    if (typeof HTMLElement === "undefined") {
        return false;
    }

    return node instanceof HTMLElement;
}

function tryPattern(pattern: BannerPattern): HTMLElement | null {
    const result = document.evaluate(
        pattern.xpath,
        document,
        null,
        XPATH_RESULT_FIRST_ORDERED_NODE_TYPE,
        null,
    );
    const node = result.singleNodeValue;

    if (!isHtmlElement(node)) {
        return null;
    }

    const text = node.textContent ?? "";

    for (const needle of pattern.anyText) {
        if (text.includes(needle)) {
            return node;
        }
    }

    return null;
}

export class BannerLocator {
    /**
     * Walk the BANNER_PATTERNS list and return the first match.
     * `null` when none of the known banners are present.
     */
    public locate(): HTMLElement | null {
        if (typeof document === "undefined" || typeof document.evaluate !== "function") {
            return null;
        }

        for (const pattern of BANNER_PATTERNS) {
            const hit = tryPattern(pattern);

            if (hit !== null) {
                return hit;
            }
        }

        return null;
    }
}
