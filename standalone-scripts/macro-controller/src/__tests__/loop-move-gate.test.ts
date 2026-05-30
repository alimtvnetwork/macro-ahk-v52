/**
 * Integration tests — loop-move-gate (Issue 124 Task 4).
 *
 * Wraps `moveToWorkspace` with the run-state gate + queue pause/resume.
 * Verifies the four hard-constraint behaviours from the spec:
 *
 *   1. With flag OFF, gatedMoveToWorkspace is a passthrough — no waits, no
 *      queue clicks.
 *   2. With flag ON + running composer, the gate blocks the move until the
 *      composer goes idle, then pauses the source queue, moves, and clicks
 *      Resume on the destination.
 *   3. The composer Submit/STOP button is NEVER clicked by the gate
 *      (asserted with a click-spy).
 *   4. When Resume is missing after the 15s window, the gate logs and
 *      returns cleanly — no retry, no throw.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ws-move', () => ({
    moveToWorkspace: vi.fn(async (_id: string, _name: string) => {}),
    updateLoopMoveStatus: vi.fn(),
}));
vi.mock('../toast', () => ({ showToast: vi.fn() }));
vi.mock('../logging', () => ({ log: vi.fn(), logSub: vi.fn() }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));

import { moveToWorkspace } from '../ws-move';
import { setFeatureFlagOverrideForTests } from '../feature-flags';
import {
    QUEUE_PAUSE_ARIA_LABEL,
    QUEUE_RESUME_ARIA_LABEL,
} from '../queue-control/selectors';
import { SUBMIT_BUTTON_ID } from '../loop-run-state/selectors';
import { gatedMoveToWorkspace } from '../loop-move-gate';

function mountIdleComposer(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = SUBMIT_BUTTON_ID;
    btn.type = 'submit';
    document.body.appendChild(btn);
    return btn;
}

function mountQueueButton(ariaLabel: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', ariaLabel);
    document.body.appendChild(btn);
    return btn;
}

beforeEach(() => {
    vi.clearAllMocks();
    setFeatureFlagOverrideForTests('Loop.RunStateGate.Enabled', null);
});

afterEach(() => {
    document.body.innerHTML = '';
    setFeatureFlagOverrideForTests('Loop.RunStateGate.Enabled', null);
});

describe('gatedMoveToWorkspace — flag OFF (passthrough)', () => {
    beforeEach(() => {
        setFeatureFlagOverrideForTests('Loop.RunStateGate.Enabled', false);
    });
    it('calls moveToWorkspace exactly once and skips queue clicks', async () => {
        // No composer mounted, no queue buttons — would fail the gate if active.
        await gatedMoveToWorkspace('ws-dest', 'Dest');
        expect(moveToWorkspace).toHaveBeenCalledTimes(1);
        expect(moveToWorkspace).toHaveBeenCalledWith('ws-dest', 'Dest');
    });
});

describe('gatedMoveToWorkspace — flag ON', () => {
    beforeEach(() => {
        setFeatureFlagOverrideForTests('Loop.RunStateGate.Enabled', true);
    });

    it('waits for idle composer, pauses source queue, moves, resumes destination', async () => {
        mountIdleComposer();
        const pauseBtn = mountQueueButton(QUEUE_PAUSE_ARIA_LABEL);
        const resumeBtn = mountQueueButton(QUEUE_RESUME_ARIA_LABEL);
        const pauseSpy = vi.fn();
        const resumeSpy = vi.fn();
        pauseBtn.addEventListener('click', pauseSpy);
        resumeBtn.addEventListener('click', resumeSpy);

        await gatedMoveToWorkspace('ws-dest', 'Dest');

        expect(pauseSpy).toHaveBeenCalledTimes(1);
        expect(moveToWorkspace).toHaveBeenCalledTimes(1);
        expect(resumeSpy).toHaveBeenCalledTimes(1);
    });

    it('NEVER clicks the composer Submit/STOP button', async () => {
        const submitBtn = mountIdleComposer();
        mountQueueButton(QUEUE_PAUSE_ARIA_LABEL);
        mountQueueButton(QUEUE_RESUME_ARIA_LABEL);
        const submitSpy = vi.fn();
        submitBtn.addEventListener('click', submitSpy);

        await gatedMoveToWorkspace('ws-dest', 'Dest');

        expect(submitSpy).not.toHaveBeenCalled();
    });

    it('returns cleanly when Resume is missing (no retry, no throw)', async () => {
        mountIdleComposer();
        // No queue buttons mounted — pause + resume both missing.
        await expect(
            gatedMoveToWorkspace('ws-dest', 'Dest', { resumePollTimeoutMs: 30, resumePollIntervalMs: 5 }),
        ).resolves.toBeUndefined();
        expect(moveToWorkspace).toHaveBeenCalledTimes(1);
    });

    it('cancels the move when waitForRunIdle times out (no STOP click)', async () => {
        // Composer permanently active (no submit button mounted).
        const { waitForRunIdle } = await import('../loop-run-state');
        vi.spyOn({ waitForRunIdle }, 'waitForRunIdle');
        // Patch the timeout via reaching the rejection path: shorten by
        // pre-mocking the loop-run-state module — simpler to just spy the
        // module export and force a rejection.
        const runStateMod = await import('../loop-run-state');
        const spy = vi.spyOn(runStateMod, 'waitForRunIdle').mockRejectedValueOnce(new Error('timeout'));

        await gatedMoveToWorkspace('ws-dest', 'Dest');
        expect(spy).toHaveBeenCalledTimes(1);
        expect(moveToWorkspace).not.toHaveBeenCalled();
    });
});
