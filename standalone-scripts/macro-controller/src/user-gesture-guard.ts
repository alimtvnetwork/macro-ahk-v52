/**
 * User-gesture guard for Macro Controller auto-execution.
 *
 * Per `mem://constraints/no-retry-policy` + Step 5 of the 2026-05-25 plan:
 * the Macro Controller loop engine + auto-cycle MUST require an explicit user gesture
 * (button click / keyboard shortcut) to start. Programmatic/scheduled triggers are forbidden
 * and must be logged as CODE RED.
 *
 * Other scripts (dashboard, payment-banner-hider) are NOT gated by this — they may auto-run.
 *
 * Usage:
 *   import { markUserGesture, requireUserGesture } from './user-gesture-guard';
 *   // In UI click/keyboard handlers, before calling startLoop:
 *   markUserGesture('panel-controls/start-stop-btn');
 *   // Inside startLoop:
 *   if (!requireUserGesture('startLoop')) return false;
 */

let _userGestureAt = 0;
let _userGestureSource = '';

const GESTURE_TTL_MS = 30_000; // 30s window — generous for slow auth/credit warm-up.

export function markUserGesture(source: string): void {
  _userGestureAt = Date.now();
  _userGestureSource = source;
}

/** Returns true if a recent user gesture has occurred. Logs CODE RED on miss. */
export function requireUserGesture(callerId: string): boolean {
  const age = Date.now() - _userGestureAt;
  if (_userGestureAt === 0 || age > GESTURE_TTL_MS) {
    // CODE RED: programmatic start attempted without gesture.
    // Use console directly (logger may not be loaded in all callers).
    console.error(
      '[MacroController] [CODE RED] ' + callerId + ' rejected: no recent user gesture.\n' +
      '  Path: standalone-scripts/macro-controller/src/user-gesture-guard.ts\n' +
      '  Missing item: markUserGesture() call within last ' + GESTURE_TTL_MS + 'ms\n' +
      '  Last gesture source: ' + (_userGestureSource || '(never)') + '\n' +
      '  Reason: Macro Controller auto-execution is forbidden; only explicit user clicks/keys may start the loop.'
    );
    return false;
  }
  return true;
}

/** Test-only — reset gesture state between tests. */
export function _resetUserGestureForTests(): void {
  _userGestureAt = 0;
  _userGestureSource = '';
}

/** Test-only — peek current state. */
export function _peekUserGestureForTests(): { at: number; source: string } {
  return { at: _userGestureAt, source: _userGestureSource };
}
