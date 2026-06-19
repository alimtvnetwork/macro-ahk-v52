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

function tryPattern(pattern: BannerPattern): { el: HTMLElement; text: string } | null {
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
        if (text.includes(needle)) return { el: node, text: needle };
    }
    return null;
}

/**
 * Walk the DOM (capped at TEXT_SCAN_MAX_NODES) for the smallest element
 * whose textContent contains one of the needles. "Smallest" = fewest
 * descendants, so we don't accidentally collapse <body>.
 */
function textFallback(root: ParentNode): { el: HTMLElement; text: string } | null {
    let best: { el: HTMLElement; text: string; size: number } | null = null;
    let count = 0;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node !== null) {
        count++;
        if (count > TEXT_SCAN_MAX_NODES) break;

        if (isHtmlElement(node)) {
            const tag = node.tagName;
            // Skip structural giants — never collapse these.
            if (tag !== "HTML" && tag !== "BODY" && tag !== "MAIN" && tag !== "HEADER") {
                const text = node.textContent ?? "";
                if (text.length > 0 && text.length < 600) {
                    for (const needle of BANNER_TEXT_NEEDLES) {
                        if (text.includes(needle)) {
                            const size = node.getElementsByTagName("*").length;
                            if (best === null || size < best.size) {
                                best = { el: node, text: needle, size };
                            }
                            break;
                        }
                    }
                }
            }
        }
        node = walker.nextNode();
    }

    if (best === null) return null;
    return { el: best.el, text: best.text };
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
                    element: hit.el,
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
            element: fb.el,
            source: "text-fallback",
            xpath: null,
            matchedText: fb.text,
        };
    }
}
