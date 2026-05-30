/**
 * Issue 128 — Read the Lovable Queue section's count badge.
 *
 * Returns:
 *   - integer ≥ 0 when the queue header is found AND the badge text parses
 *   - null when the queue header is missing OR the badge text is invalid
 *
 * The null vs 0 distinction lets callers tell "queue not visible on this page"
 * apart from "queue visible but empty". See spec/22-app-issues/128.
 */

export const QUEUE_COUNT_XPATH =
    '/html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/div[1]/div[2]/div/div[1]/span/span';

interface CountSpanResult {
    element: HTMLElement | null;
    strategy: 'primary-xpath' | 'fallback-header-walk' | 'fallback-aria-walk' | 'none';
}

function tryPrimaryXPath(): HTMLElement | null {
    try {
        const node = document.evaluate(
            QUEUE_COUNT_XPATH,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
        ).singleNodeValue;
        return node instanceof HTMLElement ? node : null;
    } catch {
        return null;
    }
}

function tryHeaderWalk(): HTMLElement | null {
    // Find a <span data-panel-open ...> whose text starts with "Queue", then
    // pick the trailing numeric <span> child.
    const candidates = document.querySelectorAll<HTMLElement>('span[data-panel-open]');
    for (const cand of Array.from(candidates)) {
        const txt = (cand.firstChild?.textContent ?? '').trim();
        const startsWithQueue = txt === 'Queue' || txt.startsWith('Queue');
        if (!startsWithQueue) {
            continue;
        }
        const inner = cand.querySelector<HTMLElement>('span');
        if (inner !== null) {
            return inner;
        }
    }
    return null;
}

function tryAriaWalk(): HTMLElement | null {
    // From the Pause/Resume button, walk up to the row, then read the count
    // span inside the sibling Queue header.
    const btn = document.querySelector<HTMLElement>(
        'button[aria-label="Pause queue"], button[aria-label="Resume queue"]',
    );
    if (btn === null) {
        return null;
    }
    const row = btn.closest('div');
    if (row === null) {
        return null;
    }
    const header = row.querySelector<HTMLElement>('span[data-panel-open]');
    if (header === null) {
        return null;
    }
    return header.querySelector<HTMLElement>('span');
}

function resolveCountSpan(): CountSpanResult {
    const primary = tryPrimaryXPath();
    if (primary !== null) {
        return { element: primary, strategy: 'primary-xpath' };
    }
    const headerWalk = tryHeaderWalk();
    if (headerWalk !== null) {
        return { element: headerWalk, strategy: 'fallback-header-walk' };
    }
    const ariaWalk = tryAriaWalk();
    if (ariaWalk !== null) {
        return { element: ariaWalk, strategy: 'fallback-aria-walk' };
    }
    return { element: null, strategy: 'none' };
}

export interface QueueCountReadResult {
    /** Parsed count, or null when header missing or text invalid. */
    count: number | null;
    /** Which selector strategy resolved (or 'none' if no header found). */
    strategy: CountSpanResult['strategy'];
    /** Raw text content read (for diagnostics). Empty when no element found. */
    rawText: string;
    /** Warning code when text was present but unparseable. */
    parseWarning: 'empty-text' | 'non-numeric' | 'negative' | null;
}

/**
 * Detailed read — returns strategy, raw text, and parse warning alongside the
 * count. Useful for logging and tests. `readQueueCount()` wraps this for the
 * common case where callers only care about the number.
 */
export function readQueueCountDetailed(): QueueCountReadResult {
    if (typeof document === 'undefined') {
        return { count: null, strategy: 'none', rawText: '', parseWarning: null };
    }
    const resolved = resolveCountSpan();
    if (resolved.element === null) {
        return { count: null, strategy: 'none', rawText: '', parseWarning: null };
    }
    const rawText = (resolved.element.textContent ?? '').trim();
    if (rawText === '') {
        return { count: null, strategy: resolved.strategy, rawText, parseWarning: 'empty-text' };
    }
    const parsed = Number.parseInt(rawText, 10);
    if (Number.isNaN(parsed)) {
        return { count: null, strategy: resolved.strategy, rawText, parseWarning: 'non-numeric' };
    }
    if (parsed < 0) {
        return { count: null, strategy: resolved.strategy, rawText, parseWarning: 'negative' };
    }
    return { count: parsed, strategy: resolved.strategy, rawText, parseWarning: null };
}

/** Convenience wrapper — just the count (or null when missing / invalid). */
export function readQueueCount(): number | null {
    return readQueueCountDetailed().count;
}
