/**
 * Issue 122 follow-up — Credit Totals modal "Remaining" tile must use the
 * `remaining / granted` framing so it visually matches the workspace-row
 * 💰 chips (e.g. `0 / 100` instead of bare `0`).
 *
 * Spec: Issue 122 / v3.34.2.
 */

import { describe, it, expect } from 'vitest';
import { buildBody } from '../ui/credit-totals-modal';
import type { CreditTotals } from '../credit-totals';
import type { WorkspaceCredit } from '../types';

function totals(p: Partial<CreditTotals>): CreditTotals {
  return {
    used: 0, remaining: 0, granted: 0,
    freeDailyRemaining: 0, freeDailyCap: 0,
    totalCount: 0, missingCount: 0,
    resetAtLocal: '',
    ...p,
  };
}

function tileText(body: HTMLElement, label: string): string {
  const labelEl = Array.from(body.querySelectorAll('span'))
    .find((s) => (s.textContent || '').trim() === label);
  const value = labelEl?.nextElementSibling;
  return (value?.textContent || '').replace(/\s+/g, ' ').trim();
}

describe('Issue 122 — Totals modal "Remaining" tile uses remaining/granted framing', () => {
  it('renders "0 / 100" when fully consumed with a 100-credit grant', () => {
    const body = buildBody(totals({ used: 100, remaining: 0, granted: 100 }), [] as WorkspaceCredit[]);
    expect(tileText(body, 'Remaining')).toBe('0 / 100');
  });

  it('renders "60 / 100" when partially consumed', () => {
    const body = buildBody(totals({ used: 40, remaining: 60, granted: 100 }), [] as WorkspaceCredit[]);
    expect(tileText(body, 'Remaining')).toBe('60 / 100');
  });

  it('renders bare value when granted=0 (no denominator to show)', () => {
    const body = buildBody(totals({ used: 0, remaining: 0, granted: 0 }), [] as WorkspaceCredit[]);
    expect(tileText(body, 'Remaining')).toBe('0');
  });

  it('keeps "Used" and "Total grant" tiles as bare numbers', () => {
    const body = buildBody(totals({ used: 75, remaining: 25, granted: 100 }), [] as WorkspaceCredit[]);
    expect(tileText(body, 'Used')).toBe('75');
    expect(tileText(body, 'Total grant')).toBe('100');
  });
});
