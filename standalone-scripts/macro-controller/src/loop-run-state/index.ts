/**
 * loop-run-state — observes the Lovable composer to decide whether a prompt
 * is currently streaming. Read-only: this module NEVER clicks the composer
 * Submit/STOP button. See Issue 124 §2.1.
 */

import {
    STOP_ICON_XPATH,
    SUBMIT_BUTTON_ID,
    SUBMIT_BUTTON_XPATH,
} from './selectors';

export const RUN_GATE_POLL_MS = 1000;
export const RUN_GATE_TIMEOUT_MS = 120_000;

function safeEvaluate(xpath: string): Node | null {
    try {
        const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
        );
        return result.singleNodeValue;
    } catch {
        return null;
    }
}

function submitButtonPresent(): boolean {
    if (typeof document === 'undefined') {
        return true;
    }
    const byId = document.getElementById(SUBMIT_BUTTON_ID);
    if (byId !== null) {
        return true;
    }
    return safeEvaluate(SUBMIT_BUTTON_XPATH) !== null;
}

function stopIconPresent(): boolean {
    if (typeof document === 'undefined') {
        return false;
    }
    return safeEvaluate(STOP_ICON_XPATH) !== null;
}

/** True when a prompt is currently streaming (STOP visible OR submit missing). */
export function isRunActive(): boolean {
    return stopIconPresent() || !submitButtonPresent();
}

/** True when the composer is idle (Send arrow visible, no STOP icon). */
export function isRunIdle(): boolean {
    return !isRunActive();
}

export interface WaitForRunIdleOptions {
    timeoutMs?: number;
    pollMs?: number;
}

/**
 * Polls `isRunIdle()` until it returns true or the timeout elapses.
 * Rejects on timeout — caller decides whether to log + cancel the move.
 * No retry / no backoff (mem://constraints/no-retry-policy).
 */
export function waitForRunIdle(opts: WaitForRunIdleOptions = {}): Promise<void> {
    const timeoutMs = opts.timeoutMs ?? RUN_GATE_TIMEOUT_MS;
    const pollMs = opts.pollMs ?? RUN_GATE_POLL_MS;
    return new Promise<void>((resolve, reject) => {
        if (isRunIdle()) {
            resolve();
            return;
        }
        const startedAt = Date.now();
        const handle = setInterval(() => {
            if (isRunIdle()) {
                clearInterval(handle);
                resolve();
                return;
            }
            if (Date.now() - startedAt >= timeoutMs) {
                clearInterval(handle);
                reject(new Error('waitForRunIdle: timeout after ' + String(timeoutMs) + 'ms'));
            }
        }, pollMs);
    });
}
