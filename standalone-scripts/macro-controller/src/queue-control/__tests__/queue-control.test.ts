/**
 * Unit tests — queue-control (Issue 124).
 *
 * Verifies pauseQueue/resumeQueue click ONLY the queue buttons (never the
 * composer Submit/STOP button) and return a 'missing' reason when the button
 * is not present.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    QUEUE_PAUSE_ARIA_LABEL,
    QUEUE_RESUME_ARIA_LABEL,
} from '../selectors';
import { SUBMIT_BUTTON_ID } from '../../loop-run-state/selectors';
import {
    isQueuePauseVisible,
    isQueueResumeVisible,
    pauseQueue,
    resumeQueue,
} from '../index';

function mountQueueButton(ariaLabel: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', ariaLabel);
    document.body.appendChild(btn);
    return btn;
}

function mountComposerSubmit(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = SUBMIT_BUTTON_ID;
    btn.type = 'submit';
    document.body.appendChild(btn);
    return btn;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('queue-control.pauseQueue', () => {
    it('clicks the Pause queue button when present', () => {
        const btn = mountQueueButton(QUEUE_PAUSE_ARIA_LABEL);
        const spy = vi.fn();
        btn.addEventListener('click', spy);
        const result = pauseQueue();
        expect(result).toEqual({ clicked: true, reason: 'ok' });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('returns pause-missing when the button is absent', () => {
        const result = pauseQueue();
        expect(result).toEqual({ clicked: false, reason: 'pause-missing' });
    });
});

describe('queue-control.resumeQueue', () => {
    it('clicks the Resume queue button when present', () => {
        const btn = mountQueueButton(QUEUE_RESUME_ARIA_LABEL);
        const spy = vi.fn();
        btn.addEventListener('click', spy);
        const result = resumeQueue();
        expect(result).toEqual({ clicked: true, reason: 'ok' });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('returns resume-missing when the button is absent', () => {
        const result = resumeQueue();
        expect(result).toEqual({ clicked: false, reason: 'resume-missing' });
    });
});

describe('queue-control visibility helpers', () => {
    it('isQueuePauseVisible / isQueueResumeVisible reflect DOM presence', () => {
        expect(isQueuePauseVisible()).toBe(false);
        expect(isQueueResumeVisible()).toBe(false);
        mountQueueButton(QUEUE_PAUSE_ARIA_LABEL);
        mountQueueButton(QUEUE_RESUME_ARIA_LABEL);
        expect(isQueuePauseVisible()).toBe(true);
        expect(isQueueResumeVisible()).toBe(true);
    });
});

describe('queue-control STOP-no-click guarantee', () => {
    it('pauseQueue / resumeQueue never click the composer Submit/STOP button', () => {
        const submitBtn = mountComposerSubmit();
        mountQueueButton(QUEUE_PAUSE_ARIA_LABEL);
        mountQueueButton(QUEUE_RESUME_ARIA_LABEL);
        const submitSpy = vi.fn();
        submitBtn.addEventListener('click', submitSpy);
        pauseQueue();
        resumeQueue();
        expect(submitSpy).not.toHaveBeenCalled();
    });
});
