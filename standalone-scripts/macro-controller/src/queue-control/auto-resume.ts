/**
 * Issue 128 — Auto-resume the Lovable Queue when the macro loop is running
 * and the queue is paused with pending tasks.
 *
 * Policy: see spec/22-app-issues/128 §5. Single click attempt per tick;
 * no retries, no backoff (mem://constraints/no-retry-policy).
 */

import { isQueuePauseVisible, isQueueResumeVisible, resumeQueue } from './index';
import { readQueueCount } from './queue-count';

export type AutoResumeReason =
    | 'loop-stopped'
    | 'queue-missing'
    | 'queue-empty'
    | 'already-running'
    | 'no-resume-button'
    | 'click-failed'
    | 'ok'
    | 'document-hidden'
    | 'threw';

export interface AutoResumeResult {
    readonly acted: boolean;
    readonly reason: AutoResumeReason;
    readonly count?: number;
}

export interface AutoResumeDeps {
    isLoopRunning(): boolean;
    /** Optional logger; defaults to `RiseupAsiaMacroExt.Logger` when present. */
    log?: (level: 'info' | 'warn' | 'error', message: string) => void;
}

function defaultLog(level: 'info' | 'warn' | 'error', message: string): void {
    try {
        const ns = (globalThis as unknown as {
            RiseupAsiaMacroExt?: {
                Logger?: {
                    info?: (m: string) => void;
                    warn?: (m: string) => void;
                    error?: (m: string) => void;
                };
            };
        }).RiseupAsiaMacroExt;
        const logger = ns?.Logger;
        const fn = logger?.[level];
        if (typeof fn === 'function') {
            fn(message);
        }
    } catch {
        // Swallow logger faults — auto-resume must never throw.
    }
}

/**
 * Single-tick policy check + click. Returns the outcome describing why we
 * acted (or did not). Never throws — wraps the whole body in try/catch and
 * returns `{ acted: false, reason: 'threw' }` on unexpected errors.
 */
export function autoResumeQueueIfNeeded(deps: AutoResumeDeps): AutoResumeResult {
    const log = deps.log ?? defaultLog;
    try {
        if (typeof document !== 'undefined' && document.hidden === true) {
            return { acted: false, reason: 'document-hidden' };
        }
        if (!deps.isLoopRunning()) {
            return { acted: false, reason: 'loop-stopped' };
        }
        const count = readQueueCount();
        if (count === null) {
            return { acted: false, reason: 'queue-missing' };
        }
        if (count === 0) {
            return { acted: false, reason: 'queue-empty', count: 0 };
        }
        if (isQueuePauseVisible()) {
            return { acted: false, reason: 'already-running', count };
        }
        if (!isQueueResumeVisible()) {
            log('warn', '[QueueAutoResume] Resume button not visible — count=' + String(count));
            return { acted: false, reason: 'no-resume-button', count };
        }
        const clickResult = resumeQueue();
        if (!clickResult.clicked) {
            log('warn', '[QueueAutoResume] resumeQueue click-failed reason=' + clickResult.reason);
            return { acted: false, reason: 'click-failed', count };
        }
        log('info', '[QueueAutoResume] clicked Play — count=' + String(count));
        return { acted: true, reason: 'ok', count };
    } catch (caught: unknown) {
        const msg = caught instanceof Error ? caught.message : String(caught);
        log('error', '[QueueAutoResume] Reason=QueueAutoResumeTickThrew ReasonDetail=' + msg);
        return { acted: false, reason: 'threw' };
    }
}
