/**
 * Issue 115 Step 2 — tone → style resolver tests.
 *
 * Most important assertion: `muted` (used by the new collapsed "Cancel"
 * badge) NEVER touches the red palette. Catches any future drift where
 * someone copies a red hex into the muted tone by mistake.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveBadgeStyle,
  styleContainsRedPalette,
  RED_PALETTE_FRAGMENTS,
  diluteBadgeBg,
} from '../workspace-badge-styles';

describe('resolveBadgeStyle — Issue 115 Step 2', () => {
  it('muted tone is gray (not red) — Cancel badge contract', () => {
    const style = resolveBadgeStyle('muted');
    expect(styleContainsRedPalette(style)).toBe(false);
    // Slate-200 (#e2e8f0) — readable white-ish text.
    expect(style.fg).toBe('#e2e8f0');
    // bg must be a slate/gray rgba (substring check keeps the assertion
    // resilient to alpha tweaks).
    expect(style.bg.toLowerCase()).toContain('rgba(71,85,105');
  });

  it('info tone targets sky-400 family for refill-soon', () => {
    const style = resolveBadgeStyle('info');
    expect(style.border).toBe('#38bdf8');
  });

  it('warning tone targets amber-500 family for expire-soon', () => {
    const style = resolveBadgeStyle('warning');
    expect(style.border).toBe('#f59e0b');
  });

  it('danger tone uses the red palette (only place it is allowed)', () => {
    const style = resolveBadgeStyle('danger');
    expect(styleContainsRedPalette(style)).toBe(true);
  });

  it('none tone renders nothing (transparent)', () => {
    const style = resolveBadgeStyle('none');
    expect(style.bg).toBe('transparent');
    expect(style.border).toBe('transparent');
  });

  it('RED_PALETTE_FRAGMENTS is non-empty (guard against accidental clear)', () => {
    expect(RED_PALETTE_FRAGMENTS.length).toBeGreaterThan(0);
  });
});

describe('diluteBadgeBg — Issue 129 sublabel polish', () => {
  it('halves the alpha of a standard rgba string', () => {
    expect(diluteBadgeBg('rgba(180,83,9,0.55)', 0.5)).toBe('rgba(180,83,9,0.28)');
  });

  it('respects the minimum alpha floor (0.05)', () => {
    expect(diluteBadgeBg('rgba(2,132,199,0.01)', 0.5)).toBe('rgba(2,132,199,0.05)');
  });

  it('passes through non-rgba strings unchanged', () => {
    expect(diluteBadgeBg('#dc2626', 0.35)).toBe('#dc2626');
  });

  it('returns transparent for transparent input', () => {
    expect(diluteBadgeBg('transparent', 0.35)).toBe('transparent');
  });

  it('correctly dilutes the danger tone used by Expire pills', () => {
    const diluted = diluteBadgeBg('rgba(127,29,29,0.85)', 0.35);
    expect(diluted).toBe('rgba(127,29,29,0.30)');
  });
});
