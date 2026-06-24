/**
 * Task Next — sequential queue runner (Issue 01 — `.lovable/issues/01-task-next-queue-sequential.md`).
 *
 * Source-level invariants on the queue logic so the regression cannot return:
 *   - `runTaskNextQueue` exists and is exported.
 *   - Submenu count handler routes count > 1 to the queue, count ≤ 1 to the
 *     legacy paste-once path.
 *   - The cycle loop awaits `waitForLovableIdle` between iterations
 *     (i.e. no "all-prompts-at-once" regression).
 *   - Cancel via `taskNextState.cancelled` is checked inside the loop.
 *   - Failure paths log via `logError(...)` — nothing is swallowed.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TASK_NEXT_SRC = join(HERE, '..', 'ui', 'task-next-ui.ts');
const DROPDOWN_SRC = join(HERE, '..', 'ui', 'prompt-dropdown.ts');
const IDLE_SRC = join(HERE, '..', 'ui', 'lovable-idle.ts');

let taskNextSrc = '';
let dropdownSrc = '';
let idleSrc = '';

beforeAll(() => {
  taskNextSrc = readFileSync(TASK_NEXT_SRC, 'utf-8');
  dropdownSrc = readFileSync(DROPDOWN_SRC, 'utf-8');
  idleSrc = readFileSync(IDLE_SRC, 'utf-8');
});

describe('Task Next sequential queue (Issue 01)', () => {
  it('exports runTaskNextQueue', () => {
    expect(taskNextSrc).toMatch(/export async function runTaskNextQueue\s*\(/);
  });

  it('delegates count === 1 to the legacy paste-once runTaskNextLoop', () => {
    expect(taskNextSrc).toMatch(/if \(n === 1\)\s*\{\s*runTaskNextLoop\(deps, 1\);/);
  });

  it('iterates k = 0..n-1 with an awaited idle gate between cycles', () => {
    expect(taskNextSrc).toMatch(/for \(let k = 0; k < n; k\+\+\)/);
    expect(taskNextSrc).toMatch(/await waitForLovableIdle\(\s*\{[\s\S]{0,200}isCancelled/);
  });

  it('checks taskNextState.cancelled inside the loop AND in the idle gate', () => {
    expect(taskNextSrc).toMatch(/if \(taskNextState\.cancelled\)/);
    expect(taskNextSrc).toMatch(/idleResult === 'cancelled'/);
  });

  it('aborts fail-fast on paste/submit/timeout (no swallowed catches)', () => {
    expect(taskNextSrc).toMatch(/paste failed at /);
    expect(taskNextSrc).toMatch(/submit failed at /);
    expect(taskNextSrc).toMatch(/timed out waiting at /);
    expect(taskNextSrc).toMatch(/logError\('Task Next queue'/);
  });

  it('tracks queue progress on taskNextState.queue (total/completed/startedAt)', () => {
    expect(taskNextSrc).toMatch(/queue:\s*\{[\s\S]{0,200}total:\s*number;[\s\S]{0,200}completed:\s*number;/);
    expect(taskNextSrc).toMatch(/taskNextState\.queue\.completed = k \+ 1;/);
  });

  it('single Next prefers persisted splitter queue before legacy prompt fallback', () => {
    expect(taskNextSrc).toMatch(/getPersistentTaskQueue/);
    expect(taskNextSrc).toMatch(/await queue\.dequeue\(projectId\)/);
    expect(taskNextSrc).toMatch(/selectLegacyTaskNextPrompt\(deps\)/);
    expect(taskNextSrc).toMatch(/pasteIntoEditor\(result\.selection\.text/);
  });

  it('single Next fail-fast aborts legacy fallback when queue read fails', () => {
    expect(taskNextSrc).toMatch(/dequeue failed before single Next injection; aborting fallback/);
    expect(taskNextSrc).toMatch(/result\.failed \|\| !result\.selection/);
  });

  it('multi-cycle runner mixes queue dequeue with legacy fallback per cycle', () => {
    // resolveCyclePrompt: queue first, legacy only when queue empty + not failed.
    expect(taskNextSrc).toMatch(/async function resolveCyclePrompt\(/);
    expect(taskNextSrc).toMatch(/if \(dequeued\.failed\) return \{ text: '', source: 'queue', remaining: -1 \};/);
    expect(taskNextSrc).toMatch(/if \(dequeued\.selection\) return \{ text: dequeued\.selection\.text, source: 'queue'/);
    expect(taskNextSrc).toMatch(/return \{ text: legacyText, source: 'legacy', remaining: 0 \};/);
  });

  it('cycle runner calls resolveCyclePrompt with the legacy text per iteration', () => {
    expect(taskNextSrc).toMatch(/const chosen = await resolveCyclePrompt\(deps, legacyPromptText\);/);
  });

  it('queue-drain failure surfaces via logError — never swallowed', () => {
    // dequeueTaskNextPrompt catch branch must logError, not return silent success.
    expect(taskNextSrc).toMatch(/logError\('Task Next queue', 'dequeue failed before single Next injection; aborting fallback'/);
  });
});


describe('Submenu wiring routes count > 1 to the queue (prompt-dropdown.ts)', () => {
  it('imports runTaskNextQueue alongside runTaskNextLoop', () => {
    expect(dropdownSrc).toMatch(/import\s*\{[^}]*runTaskNextQueue[^}]*\}\s*from\s*'\.\/task-next-ui'/);
  });

  it('preset row: count <= 1 → runTaskNextLoop, count > 1 → runTaskNextQueue', () => {
    expect(dropdownSrc).toMatch(
      /if \(count <= 1\) runTaskNextLoop\(taskNextDeps, count\);\s*else void runTaskNextQueue\(taskNextDeps, count\);/,
    );
  });

  it('custom-count row: n <= 1 → runTaskNextLoop, n > 1 → runTaskNextQueue', () => {
    expect(dropdownSrc).toMatch(
      /if \(n <= 1\) runTaskNextLoop\(taskNextDeps, n\);\s*else void runTaskNextQueue\(taskNextDeps, n\);/,
    );
  });

  it('split-button label still uses paste-once runTaskNextLoop(deps, 1)', () => {
    // The label click (single click on "Task Next") MUST keep its v3.79.x
    // paste-once behaviour — it does NOT auto-submit and does NOT queue.
    expect(dropdownSrc).toMatch(/runTaskNextLoop\(taskNextDeps, 1\);/);
  });
});

describe('lovable-idle gate', () => {
  it('exports waitForLovableIdle with three terminal states', () => {
    expect(idleSrc).toMatch(/export async function waitForLovableIdle/);
    expect(idleSrc).toMatch(/'idle' \| 'cancelled' \| 'timeout'/);
  });

  it('uses both predicates (submit-disabled OR return-button-visible) to detect busy', () => {
    expect(idleSrc).toMatch(/findAddToTasksButton/);
    expect(idleSrc).toMatch(/isReturnButtonVisible/);
  });

  it('requires a debounced confirmed-idle window before declaring idle', () => {
    expect(idleSrc).toMatch(/idleSince/);
    expect(idleSrc).toMatch(/debounceMs/);
  });
});
