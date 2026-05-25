/**
 * Regression test — Issue #90 (Prompt Click Pastes Wrong Prompt Text)
 *
 * Locks in the fix that replaced fragile CSS-heuristic matching
 * (`text-overflow:ellipsis` / `justify-content:space-between`) in
 * `_findPromptItemElements()` with a reliable `data-prompt-idx`
 * attribute lookup.
 *
 * If anyone reverts to CSS-heuristic matching, the index mapping
 * shifts (header + Task Next row get picked up) and clicking
 * prompt #1 pastes prompt #3 again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(
  __dirname,
  '..',
  'ui',
  'prompt-dropdown.ts',
);
const source = readFileSync(SOURCE_PATH, 'utf8');

describe('Issue #90 — prompt click index mapping', () => {
  it('renderPromptItem stamps every item with data-prompt-idx', () => {
    const renderMatch = source.match(
      /function renderPromptItem\([\s\S]*?\n\}\n/,
    );
    expect(renderMatch, 'renderPromptItem function block').toBeTruthy();
    const body = renderMatch![0];
    expect(body).toMatch(/setAttribute\(\s*['"]data-prompt-idx['"]\s*,\s*String\(idx\)\s*\)/);
  });

  it('_findPromptItemElements uses [data-prompt-idx] selector', () => {
    const finderMatch = source.match(
      /function _findPromptItemElements\([\s\S]*?\n\}/,
    );
    expect(finderMatch, '_findPromptItemElements function block').toBeTruthy();
    const body = finderMatch![0];
    expect(body).toMatch(/querySelectorAll\(\s*['"]\[data-prompt-idx\]['"]\s*\)/);
  });

  it('_findPromptItemElements does NOT use fragile CSS heuristics', () => {
    const finderMatch = source.match(
      /function _findPromptItemElements\([\s\S]*?\n\}/,
    );
    expect(finderMatch).toBeTruthy();
    const body = finderMatch![0];
    // The original bug matched on these CSS fragments which also
    // appear on the header row and the Task Next submenu trigger.
    expect(body).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(body).not.toMatch(/justify-content:\s*space-between/);
  });
});
