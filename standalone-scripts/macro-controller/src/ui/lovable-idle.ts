/**
 * Lovable idle gate — shared "has the assistant finished generating?" predicate.
 *
 * Detection strategy (chosen in `.lovable/plans/subtasks/01-task-next-queue-sequential/SS-01-rca-and-idle-signal.md`):
 * while Lovable is generating, the chat submit button is either disabled OR
 * the "Return to bottom" button is visible. When BOTH are false for a short
 * confirmed-idle window, the assistant is done.
 *
 * Sequential fail-fast per `mem://constraints/no-retry-policy` — no
 * exponential backoff, no inner retries; the caller decides what to do on
 * timeout. Returns `'idle'` on success, `'cancelled'` if `isCancelled()`
 * flips true, `'timeout'` if the deadline passes first.
 */
import { findAddToTasksButton } from './task-next-ui';
import { isReturnButtonVisible } from '../xpath-utils';

export interface LovableIdleOptions {
  isCancelled: () => boolean;
  /** Total budget. Default 10 min — same as Repeat Loop. */
  timeoutMs?: number;
  /** Poll interval. Default 500 ms — matches `repeat-loop-ui.POLL_MS`. */
  pollMs?: number;
  /**
   * How long the page must look idle continuously before we believe it.
   * Default 800 ms — covers the brief Stop→Submit flicker between cycles.
   */
  debounceMs?: number;
  /**
   * Grace period BEFORE we start polling, to let Lovable transition into
   * the "processing" state. Default 800 ms — same constant Repeat Loop uses.
   */
  warmupMs?: number;
}

export type LovableIdleResult = 'idle' | 'cancelled' | 'timeout';

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function isPageBusy(): boolean {
  const btn = findAddToTasksButton();
  const disabled = !btn || (btn as HTMLButtonElement).disabled === true;
  return disabled || isReturnButtonVisible();
}

export async function waitForLovableIdle(opts: LovableIdleOptions): Promise<LovableIdleResult> {
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const pollMs = opts.pollMs ?? 500;
  const debounceMs = opts.debounceMs ?? 800;
  const warmupMs = opts.warmupMs ?? 800;

  await sleep(warmupMs);

  const deadline = Date.now() + timeoutMs;
  let idleSince = 0;

  while (Date.now() < deadline) {
    if (opts.isCancelled()) return 'cancelled';

    if (isPageBusy()) {
      idleSince = 0;
    } else {
      if (idleSince === 0) idleSince = Date.now();
      if (Date.now() - idleSince >= debounceMs) return 'idle';
    }
    await sleep(pollMs);
  }
  return 'timeout';
}
