/**
 * Issue 129 Step 2 — Prompts dropdown must paint synchronously from the
 * in-memory snapshot mirror, so Plan Task + Task Next buttons appear in
 * the same tick the user clicks the prompts trigger.
 *
 * These are source-level invariants: the render path must NOT gate paint
 * on `readUISnapshot()` (IndexedDB), and `_persistSnapshot` must update
 * the in-memory mirror before kicking off the IDB write.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'ui', 'prompt-dropdown.ts');

let source = '';
beforeAll(() => { source = readFileSync(SRC, 'utf-8'); });

describe('Prompts dropdown — synchronous paint (Issue 129 Step 2)', () => {
  it('declares the in-memory snapshot mirror', () => {
    expect(source).toMatch(/let _memSnapshot:\s*MemSnapshot \| null/);
  });

  it('hydrates the mirror exactly once from IndexedDB', () => {
    expect(source).toContain('function _hydrateMemSnapshotOnce()');
    expect(source).toMatch(/if \(_memHydrated\) return;/);
  });

  it('paints from the in-memory snapshot synchronously when hashes match', () => {
    // The fast path must read `_memSnapshot` directly and assign innerHTML
    // before any IDB call. We assert the fast-path branch exists with the
    // synchronous innerHTML assignment.
    // Fixed: Flexible regex that doesn't care about the order of conditions in the if()
    expect(source).toMatch(/if\s*\(.*_memSnapshot.*\)\s*\{[\s\S]*?\.innerHTML\s*=\s*_memSnapshot\.html/);
  });

  it('does NOT gate paint on readUISnapshot().then(...)', () => {
    // The old code did `readUISnapshot().then(...)` inside renderPromptsDropdown.
    // The fast path must no longer await IDB before painting. We allow the
    // single hydration call inside `_hydrateMemSnapshotOnce` but ban the
    // pattern from `renderPromptsDropdown` itself.
    const renderFn = source.split('export function renderPromptsDropdown')[1] ?? '';
    const body = renderFn.split('\n}')[0];
    expect(body).not.toContain('readUISnapshot().then');
    expect(body).not.toContain('readUISnapshot()');
  });

  it('_persistSnapshot updates the in-memory mirror before writing to IDB', () => {
    const persistFn = source.split('function _persistSnapshot')[1] ?? '';
    const body = persistFn.split('\n}')[0];
    const memIdx = body.indexOf('_memSnapshot = {');
    const idbIdx = body.indexOf('writeUISnapshot(');
    expect(memIdx).toBeGreaterThan(0);
    expect(idbIdx).toBeGreaterThan(memIdx);
  });
});
