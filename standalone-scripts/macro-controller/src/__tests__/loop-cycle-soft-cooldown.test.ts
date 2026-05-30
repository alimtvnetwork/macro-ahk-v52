/**
 * Regression test for v3.40.2 "loop turns off when tab regains focus".
 *
 * Root cause: `handleCycleFetchError` previously called `stopLoop()` after
 * `state.maxRetries` consecutive transient failures. Chrome throttles
 * timers and fetches in hidden tabs, so a backgrounded tab routinely
 * burned through all 3 retries and the loop was permanently dead when the
 * user came back.
 *
 * Contract (from the user): "the loop should never stop on its own — it can
 * pause queue work or skip a cycle, but the runtime stays alive."
 *
 * This test asserts the post-fix code:
 *   1. Never imports `stopLoop` from `./loop-controls` in `loop-cycle.ts`.
 *   2. Resets `state.retryCount`, `__cycleInFlight`, `__cycleRetryPending`
 *      on the terminal branch.
 *   3. Keeps the cooldown branch fully self-contained (no `state.running = false`).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../loop-cycle.ts');
const src = readFileSync(SRC, 'utf-8');

describe('loop-cycle.ts — soft-cooldown contract (v3.40.2)', () => {
  it('does NOT import stopLoop from loop-controls', () => {
    expect(src).not.toMatch(/^import\s*\{[^}]*\bstopLoop\b[^}]*\}\s*from\s*['"]\.\/loop-controls['"]/m);
  });

  it('never calls stopLoop() from within loop-cycle.ts', () => {
    // Allow the word inside comments, but no bare call expression.
    const callPattern = /^[^/]*\bstopLoop\s*\(/m;
    const lines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
    const offending = lines.find((l) => callPattern.test(l));
    expect(offending, 'unexpected stopLoop() call: ' + offending).toBeUndefined();
  });

  it('never flips state.running = false from within loop-cycle.ts', () => {
    expect(src).not.toMatch(/state\.running\s*=\s*false/);
  });

  it('resets retry budget on the terminal failure branch', () => {
    expect(src).toMatch(/state\.retryCount\s*=\s*0/);
    expect(src).toMatch(/state\.__cycleInFlight\s*=\s*false/);
    expect(src).toMatch(/state\.__cycleRetryPending\s*=\s*false/);
  });

  it('documents the soft-cooldown rationale inline', () => {
    expect(src).toMatch(/Soft-cooldown policy/i);
    expect(src).toMatch(/loop kept ON/i);
  });
});
