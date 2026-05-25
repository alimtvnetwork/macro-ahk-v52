/**
 * Issue 115 Step 2 — Display tone → CSS style resolver.
 *
 * Single source of truth for badge colors. Maps the abstract `WorkspaceDisplayTone`
 * (defined in `workspace-display-status.ts`) to concrete bg / fg / border
 * values that align with the existing dark-theme palette used elsewhere
 * (sky-400, amber-500, red-600, slate-500).
 *
 * Why this lives in its own file:
 *   - Before Issue 115 each renderer (`ws-list-renderer.ts`, `ws-hover-card.ts`)
 *     carried its own copy of `STATUS_PILL_STYLES`. They drifted.
 *   - Centralising here lets Steps 3, 5, 6 swap renderers to a single source
 *     and lets tests assert "canceled tone never uses a red hex".
 *
 * No DOM, no side effects.
 */

import type { WorkspaceDisplayTone } from './workspace-display-status';

export interface BadgeStyle {
  /** Semi-transparent background. */
  bg: string;
  /** Foreground / text color. */
  fg: string;
  /** Border color. `'transparent'` is valid. */
  border: string;
}

/**
 * Tone → concrete CSS values.
 *
 * `muted` is the new Issue 115 tone used by the collapsed "Cancel" badge.
 * It is intentionally gray (slate-500 family) — NEVER red. Tests assert this.
 */
const TONE_STYLES: Record<WorkspaceDisplayTone, BadgeStyle> = {
  // Slate-500 family — muted, non-focus. White-ish text on a dark gray pill.
  muted:   { bg: 'rgba(71,85,105,0.55)',  fg: '#e2e8f0', border: 'rgba(148,163,184,0.6)' },
  // Red-600 — preserved for the rare hard-expired badge (Step 5 fallback).
  danger:  { bg: 'rgba(127,29,29,0.85)',  fg: '#fee2e2', border: '#dc2626' },
  // Amber-500 — about-to-expire warning.
  warning: { bg: 'rgba(180,83,9,0.55)',   fg: '#fde68a', border: '#f59e0b' },
  // Sky-400 — refill-soon info.
  info:    { bg: 'rgba(2,132,199,0.45)',  fg: '#bae6fd', border: '#38bdf8' },
  // Sentinel — `normal` rows render no badge; resolver returns transparent.
  none:    { bg: 'transparent',           fg: 'inherit', border: 'transparent' },
};

/** Resolve the concrete style for an abstract tone. */
export function resolveBadgeStyle(tone: WorkspaceDisplayTone): BadgeStyle {
  return TONE_STYLES[tone] || TONE_STYLES.none;
}

/**
 * Red-family substring set — used by tests (and could be used by a future
 * lint guard) to assert that the `muted` tone never silently regresses to
 * a red palette. Keep narrow and explicit.
 */
export const RED_PALETTE_FRAGMENTS: readonly string[] = [
  '#dc2626', '#ef4444', '#fca5a5', '#fecaca', '#fee2e2',
  'rgba(127,29,29',  'rgba(153,27,27', 'rgba(220,38,38',
];

/** Returns true when any field of the style contains a red-palette hex/rgb fragment. */
export function styleContainsRedPalette(style: BadgeStyle): boolean {
  const haystack = (style.bg + '|' + style.fg + '|' + style.border).toLowerCase();
  for (const frag of RED_PALETTE_FRAGMENTS) {
    if (haystack.includes(frag.toLowerCase())) return true;
  }
  return false;
}
