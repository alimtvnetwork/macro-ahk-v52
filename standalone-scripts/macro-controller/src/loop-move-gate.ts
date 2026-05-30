/**
 * loop-move-gate — orchestrates the run-state gate + queue pause/resume
 * around a single `moveToWorkspace()` call (Issue 124 §2.2 + §2.3).
 *
 * Hard constraint: NEVER click the composer STOP/Submit button. Control is
 * exclusively via Queue Pause / Queue Resume (queue-control/).
 *
 * Behaviour when `Loop.RunStateGate.Enabled` is OFF: pass-through, no waits,
 * no queue clicks — preserves pre-v3.37.0 behaviour.
 */

import { isFeatureFlagEnabled } from './feature-flags';
import { log } from './logging';
import { logError } from './error-utils';
import { showToast } from './toast';
import { waitForRunIdle } from './loop-run-state';
import { isQueueResumeVisible, pauseQueue, resumeQueue } from './queue-control';
import { moveToWorkspace } from './ws-move';

const RESUME_POLL_INTERVAL_MS = 500;
const RESUME_POLL_TIMEOUT_MS = 15_000;

function pollForResumeButton(timeoutMs: number, intervalMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        if (isQueueResumeVisible()) {
            resolve(true);
            return;
        }
        const startedAt = Date.now();
        const handle = setInterval(() => {
            if (isQueueResumeVisible()) {
                clearInterval(handle);
                resolve(true);
                return;
            }
            if (Date.now() - startedAt >= timeoutMs) {
                clearInterval(handle);
                resolve(false);
            }
        }, intervalMs);
    });
}

/**
 * Gated wrapper around `moveToWorkspace`. When the run-state gate flag is
 * ON, waits for an idle composer, pauses the source queue, executes the
 * move, then resumes the destination queue (best-effort, no retry).
 */
export interface GatedMoveOptions {
    readonly resumePollTimeoutMs?: number;
    readonly resumePollIntervalMs?: number;
}

export async function gatedMoveToWorkspace(
    targetWorkspaceId: string,
    targetWorkspaceName: string,
    options: GatedMoveOptions = {},
): Promise<void> {
    if (!isFeatureFlagEnabled('Loop.RunStateGate.Enabled')) {
        await moveToWorkspace(targetWorkspaceId, targetWorkspaceName);
        return;
    }

    // §2.2 — Pre-move gate. We only observe the composer; never click STOP.
    try {
        if (typeof document !== 'undefined') {
            // Toast only when we actually have to wait, to keep UX quiet.
            showToast('Waiting for current prompt to finish…', 'info', { noStop: true });
        }
        await waitForRunIdle();
    } catch (caught: unknown) {
        logError(
            'gatedMoveToWorkspace.waitForRunIdle',
            'Prompt still active after 2 min — move cancelled to ws=' + targetWorkspaceId,
            caught,
        );
        showToast('Prompt still active after 2 min — move cancelled', 'warn', { noStop: true });
        return;
    }

    // §2.3 — Queue pause on source.
    const pauseResult = pauseQueue();
    log('LoopRun.queueFlip pause outcome=' + pauseResult.reason, 'info');

    // Issue the move. ws-move handles project-lock detection separately.
    await moveToWorkspace(targetWorkspaceId, targetWorkspaceName);

    // §2.3 — Resume on destination, best-effort (no retry).
    const resumeReady = await pollForResumeButton(RESUME_POLL_TIMEOUT_MS, RESUME_POLL_INTERVAL_MS);
    if (!resumeReady) {
        log(
            'LoopRun.queueFlip ws=' + targetWorkspaceId +
                ' outcome=resume-missing (Resume button not visible after 15s)',
            'warn',
        );
        return;
    }
    const resumeResult = resumeQueue();
    log(
        'LoopRun.queueFlip ws=' + targetWorkspaceId + ' outcome=' + resumeResult.reason,
        'info',
    );
}
