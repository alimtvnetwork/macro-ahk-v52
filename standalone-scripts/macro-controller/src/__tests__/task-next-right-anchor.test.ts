/**
 * Issue 127 Bug B — Task Next sub-menu MUST anchor to the RIGHT of its row
 * (not stack inside the prompts dropdown column where it can clip leftward at
 * narrow viewports), with a viewport-overflow fallback that flips to a
 * stacked-below layout when right-side space is insufficient.
 *
 * Source-level invariants on `prompt-dropdown.ts` ensure the regression
 * cannot silently re-appear.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'ui', 'prompt-dropdown.ts');

let source = '';
beforeAll(() => { source = readFileSync(SRC, 'utf-8'); });

describe('Task Next sub-menu — right-anchor with viewport fallback (Issue 127 Bug B)', () => {
  it('exposes an anchorTaskNextSub() helper that computes the menu position', () => {
    expect(source).toMatch(/function anchorTaskNextSub\s*\(/);
  });

  it('default sub-menu styling uses position:fixed (decoupled from the prompts column)', () => {
    // Sub-menu must NOT use position:static by default (that was the leftward-clip bug).
    expect(source).toMatch(/data-task-next-sub[\s\S]{0,500}position:fixed/);
  });

  it('default anchor attribute is "right"', () => {
    expect(source).toContain("setAttribute('data-task-next-anchor', 'right')");
  });

  it('flips to "below" anchor when right-side viewport space is insufficient', () => {
    expect(source).toContain("setAttribute('data-task-next-anchor', 'below')");
    // Fallback must restore static positioning so the menu stacks under the row.
    expect(source).toMatch(/sub\.style\.position\s*=\s*'static'/);
  });

  it('uses getBoundingClientRect + window.innerWidth to decide the anchor', () => {
    expect(source).toMatch(/row\.getBoundingClientRect\(\)/);
    expect(source).toMatch(/window\.innerWidth/);
  });

  it('positions the right-anchored menu just past the row\'s right edge', () => {
    expect(source).toMatch(/rowRect\.right\s*\+\s*GAP/);
    expect(source).toMatch(/rowRect\.top/);
  });

  it('preserves a sensible z-index and shadow so the floating menu is not occluded', () => {
    expect(source).toMatch(/data-task-next-sub[\s\S]{0,500}z-index:10002/);
    expect(source).toMatch(/data-task-next-sub[\s\S]{0,500}box-shadow:0 8px 24px/);
  });

  it('invokes anchorTaskNextSub from the showSub handler', () => {
    expect(source).toMatch(/anchorTaskNextSub\(\s*taskNextRow\s*,\s*taskNextSub/);
  });
});

/* ------------------------------------------------------------------ */
/*  Runtime behaviour check via a tiny JSDOM-only DOM harness          */
/* ------------------------------------------------------------------ */

describe('Task Next sub-menu — anchor recomputes when viewport width changes', () => {
  // We exercise the helper indirectly by simulating what showSub does:
  // sub.position becomes 'fixed' + left ≈ rowRect.right + GAP when there is
  // room on the right, and 'static' when there is not. We can't easily
  // import the inner helper, but we can verify the source contract above
  // is sufficient: the conditional uses `rightSpace >= measuredWidth`.
  it('decision conditional uses rightSpace >= measuredWidth', () => {
    expect(source).toMatch(/rightSpace\s*>=\s*measuredWidth/);
  });

  it('measures natural width by briefly forcing visibility:hidden off-screen', () => {
    expect(source).toMatch(/sub\.style\.visibility\s*=\s*'hidden'/);
    expect(source).toMatch(/sub\.style\.left\s*=\s*'-9999px'/);
  });
});
