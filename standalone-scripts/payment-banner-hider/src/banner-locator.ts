/**
 * Payment Banner Hider — Banner locator.
 *
 * Resolution order:
 *   1. BANNER_PATTERNS — XPath + textContent substring (precise).
 *   2. Text-fallback scan — smallest element containing one of
 *      BANNER_TEXT_NEEDLES. Survives DOM re-structuring upstream.
 *
 * Errors are NEVER swallowed.
 */

import {
    BANNER_PATTERNS,
    BANNER_TEXT_NEEDLES,
    TEXT_SCAN_MAX_NODES,
    type BannerPattern,
} from "./types";

const XPATH_RESULT_FIRST_ORDERED_NODE_TYPE = 9;
const TEXT_MAX_LEN = 600;
const SKIP_TAGS = new Set(["HTML", "BODY", "MAIN", "HEADER"]);

export interface LocateResult {
    readonly element: HTMLElement;
    readonly source: "xpath" | "text-fallback";
    readonly xpath: string | null;
    readonly matchedText: string;
}

function isHtmlElement(node: Node | null): node is HTMLElement {
    if (node === null) return false;
    if (typeof HTMLElement === "undefined") return false;
    return node instanceof HTMLElement;
}

function tryPattern(pattern: BannerPattern): { element: HTMLElement; text: string } | null {
    const result = document.evaluate(
        pattern.xpath,
        document,
        null,
        XPATH_RESULT_FIRST_ORDERED_NODE_TYPE,
        null,
    );
    const node = result.singleNodeValue;
    if (!isHtmlElement(node)) return null;

    const text = node.textContent ?? "";
    for (const needle of pattern.anyText) {
        if (text.includes(needle)) return { element: node, text: needle };
    }
    return null;
}

function matchNeedle(text: string): string | null {
    for (const needle of BANNER_TEXT_NEEDLES) {
        if (text.includes(needle)) return needle;
    }
    return null;
}

function considerNode(
    node: HTMLElement,
    best: { element: HTMLElement; text: string; size: number } | null,
): { element: HTMLElement; text: string; size: number } | null {
    if (SKIP_TAGS.has(node.tagName)) return best;
    const text = node.textContent ?? "";
    if (text.length === 0 || text.length >= TEXT_MAX_LEN) return best;
    const needle = matchNeedle(text);
    if (needle === null) return best;
    const size = node.getElementsByTagName("*").length;
    if (best === null || size < best.size) {
        return { element: node, text: needle, size };
    }
    return best;
}

/**
 * Walk the DOM (capped at TEXT_SCAN_MAX_NODES) for the smallest element
 * whose textContent contains one of the needles. "Smallest" = fewest
 * descendants, so we don't accidentally collapse <body>.
 */
function textFallback(root: ParentNode): { element: HTMLElement; text: string } | null {
    let best: { element: HTMLElement; text: string; size: number } | null = null;
    let count = 0;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node !== null && count < TEXT_SCAN_MAX_NODES) {
        count++;
        if (isHtmlElement(node)) best = considerNode(node, best);
        node = walker.nextNode();
    }

    if (best === null) return null;
    return { element: best.element, text: best.text };
}

export class BannerLocator {
    public locate(): LocateResult | null {
        if (typeof document === "undefined" || typeof document.evaluate !== "function") {
            return null;
        }

        for (const pattern of BANNER_PATTERNS) {
            const hit = tryPattern(pattern);
            if (hit !== null) {
                return {
                    element: hit.element,
                    source: "xpath",
                    xpath: pattern.xpath,
                    matchedText: hit.text,
                };
            }
        }

        const root = document.body ?? document.documentElement;
        if (root === null) return null;

        const fb = textFallback(root);
        if (fb === null) return null;

        return {
            element: fb.element,
            source: "text-fallback",
            xpath: null,
            matchedText: fb.text,
        };
    }
}
