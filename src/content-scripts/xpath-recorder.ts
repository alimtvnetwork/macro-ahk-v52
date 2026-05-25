/**
 * Marco Extension — Content Script: XPath Recorder
 *
 * Injected programmatically when the user toggles recording.
 * Listens for clicks, generates XPaths using a priority strategy
 * (ID > testid > role+text > positional), highlights elements,
 * and reports a `RecorderCaptureMessage` (Phase 06 schema) back to the
 * background service worker.
 *
 * Exclusions: iframes, Shadow DOM, SVG elements.
 *
 * Canonical source — chrome-extension/src/content-scripts/ re-exports from here.
 */

import {
    tryIdStrategy,
    tryTestIdStrategy,
    tryRoleTextStrategy,
    buildPositionalXPath,
} from "./xpath-strategies";
import {
    findAutoAnchor,
    buildRelativeXPath,
} from "./xpath-anchor-strategies";
import { suggestVariableName } from "./xpath-label-suggester";
import { enqueueCapture, flushNow } from "./xpath-capture-coalescer";

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let isActive = true;

/* ------------------------------------------------------------------ */
/*  XPath Generation — Priority Strategy                               */
/* ------------------------------------------------------------------ */

type FullStrategy = "id" | "testid" | "role-text" | "positional";

interface FullCapture {
    xpath: string;
    strategy: FullStrategy;
}

/** Generates an XPath for the given element using priority strategy. */
function generateXPath(element: Element): FullCapture {
    const byId = tryIdStrategy(element);
    if (byId !== null) return byId;

    const byTestId = tryTestIdStrategy(element);
    if (byTestId !== null) return byTestId;

    const byRole = tryRoleTextStrategy(element);
    if (byRole !== null) return byRole;

    return buildPositionalXPath(element);
}

/* ------------------------------------------------------------------ */
/*  Element Filtering                                                  */
/* ------------------------------------------------------------------ */

/** Returns true if the element should be excluded from recording. */
function isExcludedElement(element: Element): boolean {
    const isIframe = element.tagName === "IFRAME";
    const isSvg = element instanceof SVGElement;
    const isInShadowDom = element.getRootNode() instanceof ShadowRoot;

    return isIframe || isSvg || isInShadowDom;
}

/* ------------------------------------------------------------------ */
/*  Capture Builder                                                    */
/* ------------------------------------------------------------------ */

/** Builds the Phase-06 XPATH_CAPTURED payload for the background worker. */
export function buildCapturePayload(target: Element): {
    type: "XPATH_CAPTURED";
    XPathFull: string;
    XPathRelative: string | null;
    AnchorXPath: string | null;
    Strategy: FullStrategy;
    SuggestedVariableName: string;
    TagName: string;
    Text: string;
    CapturedAt: string;
} {
    const generated = generateXPath(target);
    const anchor = findAutoAnchor(target);
    const relative = anchor === null ? null : buildRelativeXPath(target, anchor);
    const anchorXPath = anchor === null ? null : generateXPath(anchor).xpath;

    return {
        type: "XPATH_CAPTURED",
        XPathFull: generated.xpath,
        XPathRelative: relative,
        AnchorXPath: anchorXPath,
        Strategy: generated.strategy,
        SuggestedVariableName: suggestVariableName(target),
        TagName: target.tagName.toLowerCase(),
        Text: target.textContent?.trim().slice(0, 100) ?? "",
        CapturedAt: new Date().toISOString(),
    };
}

/* ------------------------------------------------------------------ */
/*  Click Handler                                                      */
/* ------------------------------------------------------------------ */

/** Handles click events to record XPaths. */
function onElementClick(event: MouseEvent): void {
    if (isActive === false) return;

    const target = event.target as Element;
    if (isExcludedElement(target)) return;

    event.preventDefault();
    event.stopPropagation();

    const payload = buildCapturePayload(target);
    // PERF-R6: batch/coalesce captures instead of one sendMessage per click.
    enqueueCapture(payload);

    highlightElement(target);
}

/* ------------------------------------------------------------------ */
/*  Visual Highlight (PERF-R5 — bounded timeouts, per-element reset)   */
/* ------------------------------------------------------------------ */

const HIGHLIGHT_DURATION_MS = 1500;
const MAX_CONCURRENT_HIGHLIGHTS = 32;

/** Active highlight timers keyed by element so re-clicks reset cleanly. */
const activeHighlights = new Map<HTMLElement, { timerId: number; originalOutline: string }>();

/** Clears a single element's highlight and restores its outline. */
function clearHighlight(htmlElement: HTMLElement): void {
    const entry = activeHighlights.get(htmlElement);
    if (entry === undefined) return;
    window.clearTimeout(entry.timerId);
    htmlElement.style.outline = entry.originalOutline;
    activeHighlights.delete(htmlElement);
}

/** Clears every active highlight (called on stop / pagehide). */
function clearAllHighlights(): void {
    Array.from(activeHighlights.keys()).forEach((el) => clearHighlight(el));
}

/** Drops the oldest highlight if the bound is exceeded. */
function trimHighlightStack(): void {
    if (activeHighlights.size < MAX_CONCURRENT_HIGHLIGHTS) return;
    const oldest = activeHighlights.keys().next().value;
    if (oldest !== undefined) clearHighlight(oldest);
}

/** Briefly highlights the clicked element. Bounded + per-element idempotent. */
function highlightElement(element: Element): void {
    const htmlElement = element as HTMLElement;
    clearHighlight(htmlElement);
    trimHighlightStack();

    const originalOutline = htmlElement.style.outline;
    htmlElement.style.outline = "2px solid #ff6b35";

    const timerId = window.setTimeout(() => {
        const entry = activeHighlights.get(htmlElement);
        if (entry === undefined) return;
        htmlElement.style.outline = entry.originalOutline;
        activeHighlights.delete(htmlElement);
    }, HIGHLIGHT_DURATION_MS);

    activeHighlights.set(htmlElement, { timerId, originalOutline });
}

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

/** Starts the XPath recorder. */
function startRecorder(): void {
    document.addEventListener("click", onElementClick, true);
    console.log("[Marco] XPath recorder started");
}

/** Stops the XPath recorder. Tears down listeners + outstanding timers. */
function stopRecorder(): void {
    isActive = false;
    document.removeEventListener("click", onElementClick, true);
    clearAllHighlights();
    window.removeEventListener("pagehide", onPageHide);
    // PERF-R6: drain any queued captures before teardown.
    void flushNow();
    console.log("[Marco] XPath recorder stopped");
}

/** Pagehide teardown — mem://standards/timer-and-observer-teardown. */
function onPageHide(): void {
    stopRecorder();
}

/** Listens for the stop event from the background handler. */
window.addEventListener("marco-xpath-stop", () => {
    stopRecorder();
});

window.addEventListener("pagehide", onPageHide);

startRecorder();
