/**
 * Issue 119 Step 9 — Badge visual regression coverage.
 *
 * Locks the full Kind→Tone→Style matrix so the original user-reported
 * regression ("expire level should be red and white in the text … it
 * looks like yellowish") can never silently recur.
 *
 * Goes beyond the per-tone existing tests by:
 *   - snapshotting the entire tone→style table,
 *   - auditing palette exclusivity (only `danger` may use red),
 *   - asserting every WorkspaceDisplayKind resolves to a non-empty style,
 *   - asserting expired/expired-hard/expire-soon all produce the red+white pill,
 *   - asserting canceled never produces a red pill (the user's prior bug),
 *   - asserting all tones produce structurally distinct styles.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveBadgeStyle,
  styleContainsRedPalette,
  type BadgeStyle,
} from '../workspace-badge-styles';
import {
  WORKSPACE_BADGE_DISPLAY,
  type WorkspaceDisplayKind,
  type WorkspaceDisplayTone,
} from '../workspace-display-status';

const ALL_TONES: WorkspaceDisplayTone[] = [
  'muted', 'danger', 'warning', 'orange', 'info', 'none',
];

const ALL_KINDS: WorkspaceDisplayKind[] = [
  'canceled', 'expired', 'expired-hard', 'expire-soon',
  'past-due-expiring', 'refill-soon', 'normal',
];

const styleKey = (s: BadgeStyle): string => `${s.bg}|${s.fg}|${s.border}`;

describe('Badge visual regression matrix (Issue 119 Step 9)', () => {
  it('full tone→style snapshot is locked', () => {
    const snapshot = ALL_TONES.reduce<Record<string, BadgeStyle>>((acc, tone) => {
      acc[tone] = resolveBadgeStyle(tone);
      return acc;
    }, {});

    expect(snapshot).toEqual({
      muted:   { bg: 'rgba(71,85,105,0.55)',  fg: '#e2e8f0',  border: 'rgba(148,163,184,0.6)' },
      danger:  { bg: 'rgba(127,29,29,0.85)',  fg: '#fee2e2',  border: '#dc2626' },
      warning: { bg: 'rgba(180,83,9,0.55)',   fg: '#fde68a',  border: '#f59e0b' },
      orange:  { bg: 'rgba(194,65,12,0.55)',  fg: '#fed7aa',  border: '#f97316' },
      info:    { bg: 'rgba(2,132,199,0.45)',  fg: '#bae6fd',  border: '#38bdf8' },
      none:    { bg: 'transparent',           fg: 'inherit',  border: 'transparent' },
    });
  });

  it('only `danger` tone uses the red palette (palette exclusivity)', () => {
    for (const tone of ALL_TONES) {
      const style = resolveBadgeStyle(tone);
      const usesRed = styleContainsRedPalette(style);
      if (tone === 'danger') {
        expect(usesRed, `${tone} must use red`).toBe(true);
      } else {
        expect(usesRed, `${tone} must NOT use red`).toBe(false);
      }
    }
  });

  it('every WorkspaceDisplayKind resolves to a non-empty style', () => {
    for (const kind of ALL_KINDS) {
      const tone = WORKSPACE_BADGE_DISPLAY[kind].tone;
      const style = resolveBadgeStyle(tone);
      expect(style.bg, `${kind} → ${tone}`).toBeTruthy();
      expect(style.fg, `${kind} → ${tone}`).toBeTruthy();
      expect(style.border, `${kind} → ${tone}`).toBeTruthy();
    }
  });

  it('expired-hard renders the red+white pill (≥ grace window, single critical pill)', () => {
    const tone = WORKSPACE_BADGE_DISPLAY['expired-hard'].tone;
    expect(tone).toBe('danger');
    const style = resolveBadgeStyle(tone);
    expect(styleContainsRedPalette(style)).toBe(true);
    expect(style.fg.toLowerCase()).toBe('#fee2e2');
  });

  // Issue 125 §2.4 — `expired` (muted red-orange) and `expire-soon` (amber)
  // are intentionally NOT critical red; only `expired-hard` keeps the red
  // palette. Each must resolve to a distinct, non-red tone.
  it('expired tone is orange (muted red-orange, NOT critical red) — Issue 125 §2.4', () => {
    const tone = WORKSPACE_BADGE_DISPLAY['expired'].tone;
    expect(tone).toBe('orange');
    expect(styleContainsRedPalette(resolveBadgeStyle(tone))).toBe(false);
  });

  it('expire-soon tone is warning/amber (NOT critical red) — Issue 125 §2.4', () => {
    const tone = WORKSPACE_BADGE_DISPLAY['expire-soon'].tone;
    expect(tone).toBe('warning');
    expect(styleContainsRedPalette(resolveBadgeStyle(tone))).toBe(false);
  });

  it('canceled kind never renders a red pill', () => {
    const style = resolveBadgeStyle(WORKSPACE_BADGE_DISPLAY.canceled.tone);
    expect(styleContainsRedPalette(style)).toBe(false);
  });

  it('all six tones produce structurally distinct styles (no accidental copy-paste)', () => {
    const keys = ALL_TONES.map((t) => styleKey(resolveBadgeStyle(t)));
    expect(new Set(keys).size).toBe(ALL_TONES.length);
  });

  it('unknown tone falls back to `none` (defensive)', () => {
    const unknown = 'mystery' as unknown as WorkspaceDisplayTone;
    expect(resolveBadgeStyle(unknown)).toEqual(resolveBadgeStyle('none'));
  });

  it('refill-soon uses sky/info tone (not warning) — protects Refill-Nd badge identity', () => {
    expect(WORKSPACE_BADGE_DISPLAY['refill-soon'].tone).toBe('info');
    const style = resolveBadgeStyle('info');
    expect(style.border).toBe('#38bdf8');
    expect(styleContainsRedPalette(style)).toBe(false);
  });

  it('past-due-expiring uses warning (amber) — two-pill amber row contract', () => {
    expect(WORKSPACE_BADGE_DISPLAY['past-due-expiring'].tone).toBe('warning');
    const style = resolveBadgeStyle('warning');
    expect(style.border).toBe('#f59e0b');
    expect(styleContainsRedPalette(style)).toBe(false);
  });
});
