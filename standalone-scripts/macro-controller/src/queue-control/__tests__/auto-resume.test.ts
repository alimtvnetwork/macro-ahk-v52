/**
 * Issue 128 — autoResumeQueueIfNeeded() policy matrix.
 *
 * Covers all 6 branches in spec §5 plus document-hidden guard and
 * throw-safety wrapper.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { autoResumeQueueIfNeeded } from '../auto-resume';
import {
    QUEUE_PAUSE_ARIA_LABEL,
    QUEUE_RESUME_ARIA_LABEL,
} from '../selectors';

function mountQueueHeader(countText: string): void {
    // Build the structure expected by tryHeaderWalk():
    // <span data-panel-open>Queue<span>{countText}</span></span>
    const header = document.createElement('span');
    header.setAttribute('data-panel-open', '');
    header.appendChild(document.createTextNode('Queue'));
    const badge = document.createElement('span');
    badge.textContent = countText;
    header.appendChild(badge);
    document.body.appendChild(header);
}

function mountButton(ariaLabel: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', ariaLabel);
    document.body.appendChild(btn);
    return btn;
}

afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('autoResumeQueueIfNeeded — policy matrix (spec §5)', () => {
    it('A1 — loop stopped → loop-stopped', () => {
        mountQueueHeader('4');
        mountButton(QUEUE_RESUME_ARIA_LABEL);
        const result = autoResumeQueueIfNeeded({ isLoopRunning: () => false });
        expect(result).toEqual({ acted: false, reason: 'loop-stopped' });
    });

    it('A2 — queue header missing → queue-missing', () => {
        const result = autoResumeQueueIfNeeded({ isLoopRunning: () => true });
        expect(result.acted).toBe(false);
        expect(result.reason).toBe('queue-missing');
    });

    it('A3 — count 0 → queue-empty', () => {
        mountQueueHeader('0');
        const result = autoResumeQueueIfNeeded({ isLoopRunning: () => true });
        expect(result).toEqual({ acted: false, reason: 'queue-empty', count: 0 });
    });

    it('A4 — Pause visible (already running) → already-running', () => {
        mountQueueHeader('4');
        mountButton(QUEUE_PAUSE_ARIA_LABEL);
        const result = autoResumeQueueIfNeeded({ isLoopRunning: () => true });
        expect(result).toEqual({ acted: false, reason: 'already-running', count: 4 });
    });

    it('A5 — neither Pause nor Resume visible → no-resume-button', () => {
        mountQueueHeader('4');
        const result = autoResumeQueueIfNeeded({ isLoopRunning: () => true });
        expect(result).toEqual({ acted: false, reason: 'no-resume-button', count: 4 });
    });

    it('A6 — all conditions met → clicks Play and returns ok', () => {
        mountQueueHeader('4');
        const resumeBtn = mountButton(QUEUE_RESUME_ARIA_LABEL);
        const spy = vi.fn();
        resumeBtn.addEventListener('click', spy);
        const result = autoResumeQueueIfNeeded({ isLoopRunning: () => true });
        expect(result).toEqual({ acted: true, reason: 'ok', count: 4 });
        expect(spy).toHaveBeenCalledTimes(1);
    });
});

describe('autoResumeQueueIfNeeded — safety guards', () => {
    it('document.hidden=true short-circuits before any DOM work', () => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        try {
            const result = autoResumeQueueIfNeeded({ isLoopRunning: () => true });
            expect(result).toEqual({ acted: false, reason: 'document-hidden' });
        } finally {
            delete (document as unknown as Record<string, unknown>).hidden;
        }
    });


    it('never throws — wraps unexpected errors and returns reason=threw', () => {
        const result = autoResumeQueueIfNeeded({
            isLoopRunning: () => {
                throw new Error('boom');
            },
        });
        expect(result).toEqual({ acted: false, reason: 'threw' });
    });

    it('issues only one click per tick (no-retry policy)', () => {
        mountQueueHeader('2');
        const resumeBtn = mountButton(QUEUE_RESUME_ARIA_LABEL);
        const spy = vi.fn();
        resumeBtn.addEventListener('click', spy);
        autoResumeQueueIfNeeded({ isLoopRunning: () => true });
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
