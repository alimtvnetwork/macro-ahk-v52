/**
 * Credit Poll Events — v2.250.0
 *
 * Tiny pub-sub broadcast fired after each workspace status-refresh tick
 * (`loop-controls.refreshStatus`). Subscribers can react to credit polls
 * without coupling to the loop module directly.
 *
 * Used by:
 *   - ws-members-panel — silently refetches members when the panel is open
 *     so the credits-used column tracks the rest of the UI.
 *
 * Sequential fail-fast: subscriber errors are logged via the namespace
 * logger and never break the emitter (per `mem://constraints/no-retry-policy`).
 */

import { logError } from './error-utils';

type CreditPollListener = () => void;

const listeners = new Set<CreditPollListener>();

/** Subscribe to credit-poll ticks. Returns an unsubscribe fn. */
export function onCreditPollTick(fn: CreditPollListener): () => void {
  listeners.add(fn);
  return function () { listeners.delete(fn); };
}

/** Fire all subscribers. Safe — never throws. */
export function emitCreditPollTick(): void {
  listeners.forEach(function (fn) {
    try { fn(); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logError('CreditPollEvents', 'listener threw: ' + msg);
    }
  });
}
