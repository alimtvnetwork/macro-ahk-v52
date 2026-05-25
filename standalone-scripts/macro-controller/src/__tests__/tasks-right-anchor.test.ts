/**
 * Step 4 (20-step plan) — Plan Task + Task Next live in a right-anchored
 * floating panel attached to the prompts dropdown's right edge.
 *
 * Source-level invariants ensure the Tasks group remains positioned to the
 * right of the prompts dropdown (not stacked inline above the prompt items).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'ui', 'prompt-dropdown.ts');

let source = '';
beforeAll(() => { source = readFileSync(SRC, 'utf-8'); });

describe('Prompts panel — Tasks right-anchored panel (Step 4)', () => {
  it('marks the tasks group with a right-anchor attribute', () => {
    expect(source).toContain("setAttribute('data-tasks-anchor', 'right')");
  });

  it('absolutely positions the tasks group to the right of the prompts dropdown', () => {
    expect(source).toMatch(/position:absolute/);
    expect(source).toMatch(/left:100%/);
    expect(source).toMatch(/top:0/);
  });

  it('gives the tasks group a sensible width, scroll cap, and z-index', () => {
    expect(source).toMatch(/width:260px/);
    expect(source).toMatch(/max-height:80vh/);
    expect(source).toMatch(/overflow-y:auto/);
    expect(source).toMatch(/z-index:10001/);
  });

  it('ensures the container can host the absolute right-anchored panel', () => {
    expect(source).toContain("container.style.position = 'relative'");
  });

  it('keeps the tasks group hidden by default (opened via 🎯 Tasks toggle)', () => {
    expect(source).toMatch(/'display:none'/);
  });
});
