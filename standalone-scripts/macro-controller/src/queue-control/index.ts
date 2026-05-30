/**
 * queue-control — pauseQueue() / resumeQueue() click the Lovable
 * "Pause queue" / "Resume queue" buttons. These are the ONLY clicks the
 * run-state gate is permitted to issue. See Issue 124 §2.3.
 *
 * The composer Submit/STOP button is never clicked by this module.
 */

import {
    QUEUE_PAUSE_ARIA_LABEL,
    QUEUE_PAUSE_BUTTON_XPATH,
    QUEUE_PLAY_BUTTON_XPATH,
    QUEUE_RESUME_ARIA_LABEL,
} from './selectors';

export interface QueueClickResult {
    clicked: boolean;
    reason: 'ok' | 'pause-missing' | 'resume-missing';
}

function findButton(xpath: string, ariaLabel: string): HTMLElement | null {
    if (typeof document === 'undefined') {
        return null;
    }
    try {
        const node = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
        ).singleNodeValue;
        if (node instanceof HTMLElement) {
            return node;
        }
    } catch {
        // fall through to aria-label scan
    }
    const all = document.querySelectorAll<HTMLElement>('button[aria-label="' + ariaLabel + '"]');
    return all.length > 0 ? all[0] : null;
}

export function isQueuePauseVisible(): boolean {
    return findButton(QUEUE_PAUSE_BUTTON_XPATH, QUEUE_PAUSE_ARIA_LABEL) !== null;
}

export function isQueueResumeVisible(): boolean {
    return findButton(QUEUE_PLAY_BUTTON_XPATH, QUEUE_RESUME_ARIA_LABEL) !== null;
}

export function pauseQueue(): QueueClickResult {
    const btn = findButton(QUEUE_PAUSE_BUTTON_XPATH, QUEUE_PAUSE_ARIA_LABEL);
    if (btn === null) {
        return { clicked: false, reason: 'pause-missing' };
    }
    btn.click();
    return { clicked: true, reason: 'ok' };
}

export function resumeQueue(): QueueClickResult {
    const btn = findButton(QUEUE_PLAY_BUTTON_XPATH, QUEUE_RESUME_ARIA_LABEL);
    if (btn === null) {
        return { clicked: false, reason: 'resume-missing' };
    }
    btn.click();
    return { clicked: true, reason: 'ok' };
}
