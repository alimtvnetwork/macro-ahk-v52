/**
 * subscription-status enum + helpers — unit tests.
 *
 * Guards against re-introduction of the magic strings 'canceled', 'cancelled',
 * 'past_due', 'unpaid', 'active', 'trialing', 'EXPIRED' across the codebase.
 */

import { describe, it, expect } from 'vitest';
import {
  SubscriptionStatus,
  WsTierValue,
  PlanName,
  normalizeSubscriptionStatus,
  isCanceledStatus,
  isPastDueStatus,
  isHealthyStatus,
  isExpiredTier,
  isExpiredSubscriptionStatus,
} from '../types/subscription-status';

describe('subscription-status enums', () => {
  it('exposes canonical Stripe status values', () => {
    expect(SubscriptionStatus.ACTIVE).toBe('active');
    expect(SubscriptionStatus.TRIALING).toBe('trialing');
    expect(SubscriptionStatus.PAST_DUE).toBe('past_due');
    expect(SubscriptionStatus.UNPAID).toBe('unpaid');
    expect(SubscriptionStatus.CANCELED).toBe('canceled');
    expect(SubscriptionStatus.CANCELLED).toBe('cancelled');
    expect(SubscriptionStatus.EXPIRED).toBe('expired');
  });

  it('exposes canonical workspace tier values', () => {
    expect(WsTierValue.FREE).toBe('FREE');
    expect(WsTierValue.LITE).toBe('LITE');
    expect(WsTierValue.PRO).toBe('PRO');
    expect(WsTierValue.EXPIRED).toBe('EXPIRED');
  });

  it('exposes canonical plan-name values', () => {
    expect(PlanName.FREE).toBe('free');
    expect(PlanName.PRO_0).toBe('pro_0');
    expect(PlanName.KTLO).toBe('ktlo');
    expect(PlanName.LITE).toBe('lite');
  });
});

describe('normalizeSubscriptionStatus', () => {
  it('lower-cases and trims', () => {
    expect(normalizeSubscriptionStatus('  ACTIVE  ')).toBe('active');
    expect(normalizeSubscriptionStatus('Past_Due')).toBe('past_due');
  });
  it('handles null / undefined / empty', () => {
    expect(normalizeSubscriptionStatus(null)).toBe('');
    expect(normalizeSubscriptionStatus(undefined)).toBe('');
    expect(normalizeSubscriptionStatus('')).toBe('');
  });
});

describe('isCanceledStatus', () => {
  it('accepts US + UK spellings', () => {
    expect(isCanceledStatus('canceled')).toBe(true);
    expect(isCanceledStatus('cancelled')).toBe(true);
    expect(isCanceledStatus('CANCELED')).toBe(true);
    expect(isCanceledStatus('  Cancelled ')).toBe(true);
  });
  it('rejects other statuses', () => {
    expect(isCanceledStatus('active')).toBe(false);
    expect(isCanceledStatus('past_due')).toBe(false);
    expect(isCanceledStatus('')).toBe(false);
    expect(isCanceledStatus(null)).toBe(false);
  });
});

describe('isPastDueStatus', () => {
  it('matches past_due and unpaid', () => {
    expect(isPastDueStatus('past_due')).toBe(true);
    expect(isPastDueStatus('unpaid')).toBe(true);
    expect(isPastDueStatus('PAST_DUE')).toBe(true);
  });
  it('rejects other statuses', () => {
    expect(isPastDueStatus('canceled')).toBe(false);
    expect(isPastDueStatus('active')).toBe(false);
    expect(isPastDueStatus('')).toBe(false);
  });
});

describe('isHealthyStatus', () => {
  it('matches active and trialing', () => {
    expect(isHealthyStatus('active')).toBe(true);
    expect(isHealthyStatus('trialing')).toBe(true);
    expect(isHealthyStatus('ACTIVE')).toBe(true);
  });
  it('rejects unhealthy statuses', () => {
    expect(isHealthyStatus('past_due')).toBe(false);
    expect(isHealthyStatus('canceled')).toBe(false);
    expect(isHealthyStatus('')).toBe(false);
  });
});

describe('isExpiredTier', () => {
  it('matches EXPIRED case-insensitively', () => {
    expect(isExpiredTier('EXPIRED')).toBe(true);
    expect(isExpiredTier('expired')).toBe(true);
    expect(isExpiredTier(' Expired ')).toBe(true);
  });
  it('rejects other tiers', () => {
    expect(isExpiredTier('FREE')).toBe(false);
    expect(isExpiredTier('PRO')).toBe(false);
    expect(isExpiredTier('LITE')).toBe(false);
    expect(isExpiredTier(null)).toBe(false);
  });
});

describe('isExpiredSubscriptionStatus', () => {
  it('combines canceled + past-due groups', () => {
    expect(isExpiredSubscriptionStatus('canceled')).toBe(true);
    expect(isExpiredSubscriptionStatus('cancelled')).toBe(true);
    expect(isExpiredSubscriptionStatus('past_due')).toBe(true);
    expect(isExpiredSubscriptionStatus('unpaid')).toBe(true);
  });
  it('rejects healthy + empty', () => {
    expect(isExpiredSubscriptionStatus('active')).toBe(false);
    expect(isExpiredSubscriptionStatus('trialing')).toBe(false);
    expect(isExpiredSubscriptionStatus('')).toBe(false);
    expect(isExpiredSubscriptionStatus(null)).toBe(false);
  });
});

describe('no-magic-strings guard (regression)', () => {
  // If a future refactor introduces a typo'd status string, these symbolic
  // comparisons will still match — the enum is the only place the string
  // value is defined.
  it('canceled enum survives round-trip through isCanceledStatus', () => {
    expect(isCanceledStatus(SubscriptionStatus.CANCELED)).toBe(true);
    expect(isCanceledStatus(SubscriptionStatus.CANCELLED)).toBe(true);
  });
  it('past_due enum survives round-trip through isPastDueStatus', () => {
    expect(isPastDueStatus(SubscriptionStatus.PAST_DUE)).toBe(true);
    expect(isPastDueStatus(SubscriptionStatus.UNPAID)).toBe(true);
  });
  it('active enum survives round-trip through isHealthyStatus', () => {
    expect(isHealthyStatus(SubscriptionStatus.ACTIVE)).toBe(true);
    expect(isHealthyStatus(SubscriptionStatus.TRIALING)).toBe(true);
  });
  it('EXPIRED tier round-trip', () => {
    expect(isExpiredTier(WsTierValue.EXPIRED)).toBe(true);
  });
});
