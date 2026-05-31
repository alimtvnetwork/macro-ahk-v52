/**
 * Issue 128 — Automated Queue resumption when items are present but
 * the runner is paused.
 *
 * This policy handles the "Pause on Error" or manual pause scenarios
 * where we want the Loop to keep the runner moving if it has work.
 */

import { readQueueCount } from './queue-count';
import {
    QUEUE_PAUSE_ARIA_LABEL,
    QUEUE_PLAY_BUTTON_XPATH,
    QUEUE_RESUME_ARIA_LABEL,
} from './selectors';

export interface AutoResumeResult {
    readonly acted: boolean;
    readonly reason: 'loop-stopped' | 'document-hidden' | 'queue-missing' | 'queue-empty' | 'already-running' | 'no-resume-button' | 'ok' | 'threw';
    readonly count?: number;
}

export interface AutoResumeDeps {
    readonly isLoopRunning: () => boolean;
}

function findButton(xpath: string, ariaLabel: string): HTMLButtonElement | null {
    // 1. Try ARIA label (more robust against UI shifts)
    const aria = document.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`);
    if (aria !== null) return aria;

    // 2. Try XPath fallback
    try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const node = result.singleNodeValue;
        return node instanceof HTMLButtonElement ? node : null;
    } catch {
        return null;
    }
}

/**
 * Checks queue state and clicks 'Resume' if conditions in spec §5 are met.
 *
 * Polices:
 *   - L1: Loop must be running
 *   - D1: Page must be visible (document.hidden=false)
 *   - Q1: Queue must be visible (header found)
 *   - Q2: Queue must NOT be empty (count > 0)
 *   - R1: Pause button must NOT be visible (implies already running)
 *   - R2: Resume button MUST be visible
 */
export function autoResumeQueueIfNeeded(deps: AutoResumeDeps): AutoResumeResult {
    try {
        // D1 — Visibility guard
        if (document.hidden) {
            return { acted: false, reason: 'document-hidden' };
        }

        // L1 — Loop state guard
        if (!deps.isLoopRunning()) {
            return { acted: false, reason: 'loop-stopped' };
        }

        // Q1 — Queue visibility
        const count = readQueueCount();
        if (count === null) {
            return { acted: false, reason: 'queue-missing' };
        }

        // Q2 — Work availability
        if (count === 0) {
            return { acted: false, reason: 'queue-empty', count };
        }

        // R1 — Double-run guard (Pause visible = already running)
        const pauseBtn = findButton('', QUEUE_PAUSE_ARIA_LABEL);
        if (pauseBtn !== null && pauseBtn.offsetParent !== null) {
            return { acted: false, reason: 'already-running', count };
        }

        // R2 — Resume availability
        const resumeBtn = findButton(QUEUE_PLAY_BUTTON_XPATH, QUEUE_RESUME_ARIA_LABEL);
        if (resumeBtn === null || resumeBtn.offsetParent === null) {
            return { acted: false, reason: 'no-resume-button', count };
        }

        // All systems go — click it
        resumeBtn.click();
        return { acted: true, reason: 'ok', count };

    } catch (caught) {
        console.error('[AutoResume] Unexpected failure', caught);
        return { acted: false, reason: 'threw' };
    }
}
