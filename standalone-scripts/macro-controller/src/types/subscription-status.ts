/**
 * Subscription Status & Tier Enums — single source of truth
 *
 * Eliminates repeated magic strings ('canceled', 'cancelled', 'past_due',
 * 'unpaid', 'active', 'trialing', 'expired', 'EXPIRED', 'PRO', 'FREE', …)
 * scattered across credit-parser, workspace-status, status-explainer,
 * ws-hover-card, ws-list-renderer, etc.
 *
 * Per `mem://architecture/constant-naming-convention` and
 * `mem://standards/unknown-usage-policy`: SCREAMING_SNAKE_CASE constants,
 * fully-typed helpers, no `unknown` casts.
 *
 * Spec: spec/22-app-issues/118-past-due-expire-countdown-and-progress-bar.md
 */

/** Canonical Stripe subscription_status values returned by Lovable's billing API. */
export const enum SubscriptionStatus {
  ACTIVE     = 'active',
  TRIALING   = 'trialing',
  PAST_DUE   = 'past_due',
  UNPAID     = 'unpaid',
  CANCELED   = 'canceled',
  /** British spelling — Stripe historically emitted both. Treat as alias of CANCELED. */
  CANCELLED  = 'cancelled',
  EXPIRED    = 'expired',
  INCOMPLETE = 'incomplete',
}

/** Derived workspace tier (computed by resolveWsTier). */
export const enum WsTierValue {
  FREE    = 'FREE',
  LITE    = 'LITE',
  PRO     = 'PRO',
  EXPIRED = 'EXPIRED',
}

/** Plan-name strings (lowercase) emitted by the workspace API. */
export const enum PlanName {
  FREE  = 'free',
  PRO_0 = 'pro_0',
  KTLO  = 'ktlo',
  LITE  = 'lite',
}

/* ------------------------------------------------------------------ */
/*  Normalisation + group predicates                                  */
/* ------------------------------------------------------------------ */

/** Lower-case + trim a subscription status string for safe comparison. */
export function normalizeSubscriptionStatus(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim();
}

/** True for canceled / cancelled (US + UK spelling). */
export function isCanceledStatus(s: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(s);
  return n === SubscriptionStatus.CANCELED || n === SubscriptionStatus.CANCELLED;
}

/** True for past_due / unpaid — Stripe's "needs payment, grants still live" states. */
export function isPastDueStatus(s: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(s);
  return n === SubscriptionStatus.PAST_DUE || n === SubscriptionStatus.UNPAID;
}

/** True for active / trialing — healthy subscriptions. */
export function isHealthyStatus(s: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(s);
  return n === SubscriptionStatus.ACTIVE || n === SubscriptionStatus.TRIALING;
}

/** True when the workspace tier string represents the EXPIRED tier. */
export function isExpiredTier(tier: string | null | undefined): boolean {
  return (tier || '').toUpperCase().trim() === WsTierValue.EXPIRED;
}

/**
 * Aggregate: subscription_status indicates the workspace is in any
 * expired-ish state (canceled OR past_due OR unpaid). Used by
 * `isExpiredWs` filter / sort logic.
 */
export function isExpiredSubscriptionStatus(s: string | null | undefined): boolean {
  return isCanceledStatus(s) || isPastDueStatus(s);
}
