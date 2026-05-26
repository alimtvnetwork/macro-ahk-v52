/**
 * Workspace Display Status — Step 1 of Issue 115
 *
 * Pure module. Collapses the granular lifecycle `WorkspaceStatusKind` from
 * `workspace-status.ts` into a *display kind* used by the badge renderer.
 *
 * Display rules (per Issue 115 spec):
 *   - `expired-canceled`, `fully-expired`, plain `expired` → display `canceled`
 *     (single muted gray badge labeled "Cancel" — never red).
 *   - `about-to-expire` (past_due / unpaid) → display `expire-soon` ("Expire {N}d").
 *     When the underlying date has already passed (daysSince ≥ 1) → display
 *     `expired` ("Expired {N}d").
 *   - `about-to-refill` → display `refill-soon` ("Refill {N}d" / "Refill today").
 *   - `normal` → display `normal` (no badge).
 *
 * Tone tokens are abstract names; the renderer maps them to actual styles.
 * This keeps colors out of the classifier and aligned with semantic tokens.
 *
 * No DOM, no side effects, fully unit-testable.
 */

import type { WorkspaceCredit } from './types';
import type { WorkspaceLifecycleConfig } from './workspace-lifecycle-config';
import { daysToRefillForWs } from './workspace-refill-priority';
import { daysBetween, getEffectiveStatus, type WorkspaceStatus } from './workspace-status';

/** Display-side badge categories. Decoupled from internal lifecycle enum. */
export type WorkspaceDisplayKind =
  | 'canceled'
  | 'expired'
  | 'expire-soon'
  | 'past-due-expiring'
  | 'refill-soon'
  | 'normal';

/** Abstract tone names. Renderer maps these to CSS. */
export type WorkspaceDisplayTone =
  | 'muted'      // canceled — gray bg, light text, no red
  | 'danger'     // expired — red
  | 'warning'    // expire-soon / past-due 0–4d — amber
  | 'orange'     // past-due 5–9d — orange
  | 'info'       // refill-soon — sky
  | 'none';      // normal — no badge

export interface WorkspaceDisplayStatus {
  kind: WorkspaceDisplayKind;
  /** Short badge label, ≤10 chars. Empty for `normal`. */
  label: string;
  /** Secondary pill text (e.g. 'Passed 7d' / 'Today') — only set for past-due. */
  sublabel?: string;
  tone: WorkspaceDisplayTone;
  /** Long-form tooltip text, may include dates / internal reason. */
  tooltip: string;
  /**
   * The underlying lifecycle status that produced this display row.
   * Carried through so downstream callers (filters, hover card) keep
   * access to the granular data without recomputing.
   */
  source: WorkspaceStatus;
}

/* ------------------------------------------------------------------ */
/*  Display token map — tone names only. Renderer owns the CSS.        */
/* ------------------------------------------------------------------ */

export const WORKSPACE_BADGE_DISPLAY: Record<WorkspaceDisplayKind, { tone: WorkspaceDisplayTone }> = {
  'canceled':           { tone: 'muted' },
  'expired':            { tone: 'danger' },
  'expire-soon':        { tone: 'warning' },
  'past-due-expiring':  { tone: 'orange' },
  'refill-soon':        { tone: 'info' },
  'normal':             { tone: 'none' },
};

/* ------------------------------------------------------------------ */
/*  Label formatters                                                   */
/* ------------------------------------------------------------------ */

const MAX_DAY_BADGE = 99;

function clampDays(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > MAX_DAY_BADGE) return MAX_DAY_BADGE;
  return Math.floor(n);
}

export function formatRefillLabel(daysToRefill: number): string {
  const d = clampDays(daysToRefill);
  if (d === 0) return 'Refill today';
  return 'Refill ' + d + 'd';
}

export function formatExpireSoonLabel(daysUntilExpiry: number): string {
  const d = clampDays(daysUntilExpiry);
  if (d === 0) return 'Expire today';
  return 'Expire ' + d + 'd';
}

export function formatExpiredLabel(daysSinceExpiry: number): string {
  const d = clampDays(daysSinceExpiry);
  if (d === 0) return 'Expired';
  return 'Expired ' + d + 'd';
}

/** Issue 118: past-due countdown label — 'Today' when 0d, 'Passed Nd' otherwise. */
export function formatPassedLabel(daysPassed: number): string {
  const d = clampDays(daysPassed);
  if (d === 0) return 'Today';
  return 'Passed ' + d + 'd';
}

/* ------------------------------------------------------------------ */
/*  Tone ramp for past-due                                             */
/* ------------------------------------------------------------------ */

/**
 * Issue 118: pick the display tone for a past-due row based on how many
 * days have passed since subscription_status_changed_at.
 *   0–4d  → warning (amber)
 *   5–9d  → orange
 *   ≥10d  → danger (red)
 */
export function pickPastDueTone(daysPassed: number): WorkspaceDisplayTone {
  if (!Number.isFinite(daysPassed) || daysPassed < 0) return 'warning';
  if (daysPassed >= 10) return 'danger';
  if (daysPassed >= 5) return 'orange';
  return 'warning';
}

/* ------------------------------------------------------------------ */
/*  Classifier                                                         */
/* ------------------------------------------------------------------ */

/**
 * Collapse a granular `WorkspaceStatus` into a display row.
 *
 * Pass the same `nowMs` that drove `getEffectiveStatus` to keep day counts
 * consistent across the row.
 */
export function classifyFromStatus(
  source: WorkspaceStatus,
  ws: WorkspaceCredit,
  nowMs?: number,
): WorkspaceDisplayStatus {
  // canceled bucket — all dead-workspace variants collapse here.
  if (
    source.kind === 'expired-canceled'
    || source.kind === 'fully-expired'
    || source.kind === 'expired'
  ) {
    return {
      kind: 'canceled',
      label: 'Cancel',
      tone: 'muted',
      tooltip: buildCanceledTooltip(source),
      source,
    };
  }

  // Issue 118: past-due-expiring — always Expire + Passed Nd / Today.
  if (source.kind === 'past-due-expiring') {
    const daysPassed = source.daysSince;
    return {
      kind: 'past-due-expiring',
      label: 'Expire',
      sublabel: formatPassedLabel(daysPassed),
      tone: pickPastDueTone(daysPassed),
      tooltip: 'Past due since ' + (source.sinceIso || 'unknown'),
      source,
    };
  }

  // about-to-expire: kept for backward compat; no longer produced by
  // getEffectiveStatus for past_due as of Issue 118.
  if (source.kind === 'about-to-expire') {
    const daysUntilExpiry = computeDaysUntilExpiry(ws, nowMs);
    return {
      kind: 'expire-soon',
      label: daysUntilExpiry !== null ? formatExpireSoonLabel(daysUntilExpiry) : 'Expire soon',
      tone: 'warning',
      tooltip: 'Past due — ' + (source.sinceIso || 'no date'),
      source,
    };
  }

  // about-to-refill
  if (source.kind === 'about-to-refill') {
    const d = source.daysToRefill >= 0 ? source.daysToRefill : 0;
    return {
      kind: 'refill-soon',
      label: formatRefillLabel(d),
      tone: 'info',
      tooltip: 'Refills ' + (source.refillIso || 'soon'),
      source,
    };
  }

  return {
    kind: 'normal',
    label: '',
    tone: 'none',
    tooltip: '',
    source,
  };
}

/**
 * One-shot helper: derive the display row directly from a workspace + config.
 */
export function classifyWorkspaceDisplayStatus(
  ws: WorkspaceCredit,
  cfg: WorkspaceLifecycleConfig,
  nowMs?: number,
): WorkspaceDisplayStatus {
  const source = getEffectiveStatus(ws, cfg, nowMs);
  return classifyFromStatus(source, ws, nowMs);
}

/* ------------------------------------------------------------------ */
/*  Internal                                                           */
/* ------------------------------------------------------------------ */

function buildCanceledTooltip(source: WorkspaceStatus): string {
  if (source.kind === 'expired-canceled') {
    return source.sinceIso ? 'Canceled on ' + source.sinceIso : 'Canceled';
  }
  if (source.kind === 'fully-expired') {
    return source.sinceIso ? 'Fully expired since ' + source.sinceIso : 'Fully expired';
  }
  if (source.kind === 'expired') {
    return source.sinceIso ? 'Expired since ' + source.sinceIso : 'Expired';
  }
  return 'Canceled';
}

/**
 * Days remaining until the workspace's billing period (or refill) ends.
 * Returns null when no usable date. Mirrors `daysToRefillForWs` semantics
 * because the same date drives the "Expire in N days" copy for past_due rows.
 */
function computeDaysUntilExpiry(ws: WorkspaceCredit, nowMs?: number): number | null {
  const days = daysToRefillForWs(ws, nowMs);
  if (days === null) return null;
  return days;
}

// Re-export for tests that want to mirror the day-count math.
export { daysBetween };
