/**
 * Regression test — harden the prompt-item actions span lookup.
 *
 * Background: `_bindSinglePromptItem()` (snapshot-restore path) used
 * `item.querySelector('span:last-child')` to find the actions container,
 * which is brittle — any future markup change that appends another span
 * (badge, tooltip, etc.) breaks click-target exclusion and the bug
 * fingerprint of Issues #52 and #90 returns (clicks on action icons
 * paste the prompt instead of editing/deleting/copying).
 *
 * Fix: stamp the actions span with `data-prompt-actions` and prefer that
 * attribute in the snapshot-restore lookup, falling back to the legacy
 * `span:last-child` selector for already-rendered DOM.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'ui', 'prompt-dropdown.ts');
const source = readFileSync(SOURCE_PATH, 'utf8');

describe('prompt actions span marker', () => {
  it('renderPromptItem stamps actions span with data-prompt-actions', () => {
    const render = source.match(/function renderPromptItem\([\s\S]*?\n\}\n/);
    expect(render, 'renderPromptItem block').toBeTruthy();
    expect(render![0]).toMatch(
      /setAttribute\(\s*['"]data-prompt-actions['"]/,
    );
  });

  it('_bindSinglePromptItem prefers [data-prompt-actions] over fragile span:last-child', () => {
    const bind = source.match(/function _bindSinglePromptItem\([\s\S]*?\n\}/);
    expect(bind, '_bindSinglePromptItem block').toBeTruthy();
    const body = bind![0];
    expect(body).toMatch(/querySelector\(\s*['"]\[data-prompt-actions\]['"]\s*\)/);
    // Marker selector must appear before the legacy fallback.
    const markerIdx = body.indexOf('[data-prompt-actions]');
    const legacyIdx = body.indexOf('span:last-child');
    expect(markerIdx).toBeGreaterThan(-1);
    if (legacyIdx !== -1) {
      expect(markerIdx).toBeLessThan(legacyIdx);
    }
  });
});
