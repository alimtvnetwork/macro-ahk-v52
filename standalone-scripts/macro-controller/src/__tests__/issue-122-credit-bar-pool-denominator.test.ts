/**
 * Issue 122 — Credit-bar icon labels must show "remaining/limit" so users
 * can see their plan grant alongside what's left. Previously the row badges
 * rendered a bare remaining value ("💰 0") which made a fully-consumed
 * billing pool indistinguishable from "no pool exists" — users mistook a
 * 100-credit plan with 0 remaining for a workspace with 0 credits.
 *
 * Regression: P0065 (pro_1) reported "100 credits, showing 0".
 */

import { describe, it, expect } from 'vitest';
import { renderCreditBar } from '../credit-api';

describe('renderCreditBar — Issue 122 pool denominator', () => {
  it('renders billing as "remaining/limit" so a fully-consumed pool shows 0/100', () => {
    const html = renderCreditBar({
      totalCredits: 105, available: 5, totalUsed: 115,
      freeRemaining: 0, freeGranted: 0,
      billingAvail: 0, billingLimit: 100,
      rollover: 0, rolloverLimit: 0,
      dailyFree: 5, dailyLimit: 5,
    });
    expect(html).toContain('💰0/100');
    expect(html).toContain('📅5/5');
    expect(html).toContain('⚡5/105');
  });

  it('falls back to bare remaining when the limit is 0 (avoid "0/0" noise)', () => {
    const html = renderCreditBar({
      totalCredits: 25, available: 5,
      freeRemaining: 0, billingAvail: 0,
      rollover: 0, dailyFree: 5, dailyLimit: 5,
    });
    expect(html).toContain('💰0<');
    expect(html).toContain('🔄0<');
    expect(html).toContain('🎁0<');
  });
});
