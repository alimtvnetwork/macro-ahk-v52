/**
 * Step 11 — Credit Totals: filter chips.
 * Covers pure `applyFilters` + DOM chip toggle + empty-state message.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { applyFilters, buildBreakdownTable, type FilterState } from '../ui/credit-totals-modal';
import type { WorkspaceCredit } from '../types';

function ws(partial: Partial<WorkspaceCredit>): WorkspaceCredit {
  return {
    id: 'w', name: 'w', fullName: 'w',
    dailyFree: 0, dailyUsed: 0, dailyLimit: 5,
    rolloverUsed: 0, rolloverLimit: 0,
    freeGranted: 0, freeRemaining: 0,
    used: 0, limit: 0, topupLimit: 0,
    totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
    hasFree: false, totalCreditsUsed: 0,
    subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
    plan: 'pro_3', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false,
    nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
    membershipRole: 'owner', planType: 'monthly',
    ...partial,
  };
}

describe('applyFilters', () => {
  const ALL: ReadonlyArray<WorkspaceCredit> = [
    ws({ id: 'healthy', fullName: 'Healthy', available: 500, hasFree: false }),
    ws({ id: 'low',    fullName: 'Low',    available: 50,  hasFree: false }),
    ws({ id: 'empty',  fullName: 'Empty',  available: 1,   hasFree: true }),
    ws({ id: 'zero',   fullName: 'Zero',   available: 0,   hasFree: false }),
    ws({ id: 'free',   fullName: 'Free',   available: 200, hasFree: true }),
  ];

  it('returns input unchanged when no filters are active', () => {
    const out = applyFilters(ALL, { low: false, empty: false, free: false });
    expect(out.map((w) => w.id)).toEqual(['healthy', 'low', 'empty', 'zero', 'free']);
  });

  it('low filter keeps workspaces with 1..99 remaining (exclusive of 0)', () => {
    const out = applyFilters(ALL, { low: true, empty: false, free: false });
    expect(out.map((w) => w.id)).toEqual(['low', 'empty']);
  });

  it('empty filter keeps workspaces with 0 remaining', () => {
    const out = applyFilters(ALL, { low: false, empty: true, free: false });
    expect(out.map((w) => w.id)).toEqual(['zero']);
  });

  it('free filter keeps workspaces with hasFree === true', () => {
    const out = applyFilters(ALL, { low: false, empty: false, free: true });
    expect(out.map((w) => w.id)).toEqual(['empty', 'free']);
  });

  it('combined filters use OR logic (union)', () => {
    const out = applyFilters(ALL, { low: true, empty: true, free: false });
    expect(out.map((w) => w.id)).toEqual(['low', 'empty', 'zero']);
  });

  it('does not mutate the input array', () => {
    const input = ALL.slice();
    applyFilters(input, { low: true, empty: false, free: false });
    expect(input.map((w) => w.id)).toEqual(['healthy', 'low', 'empty', 'zero', 'free']);
  });
});

describe('buildBreakdownTable — filter chips DOM', () => {
  let table: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function rowIds(): string[] {
    return Array.from(table.querySelectorAll('[data-credit-totals-row]'))
      .map((r) => (r.querySelector('[data-cell="name"]')?.textContent || '').toLowerCase());
  }

  it('renders three filter chips above the table', () => {
    const data = [
      ws({ id: 'a', fullName: 'Alpha' }),
      ws({ id: 'b', fullName: 'Bravo' }),
    ];
    table = buildBreakdownTable(data);
    document.body.appendChild(table);

    const bar = table.querySelector('[data-credit-totals-filters]');
    expect(bar).toBeTruthy();
    const chips = bar!.querySelectorAll('[data-chip]');
    expect(chips.length).toBe(3);
    expect(Array.from(chips).map((c) => c.getAttribute('data-chip'))).toEqual(['low', 'empty', 'free']);
  });

  it('chips start with data-active="false"', () => {
    table = buildBreakdownTable([ws({ id: 'a', fullName: 'Alpha' })]);
    document.body.appendChild(table);
    const chips = table.querySelectorAll('[data-chip]');
    chips.forEach((c) => {
      expect(c.getAttribute('data-active')).toBe('false');
    });
  });

  it('clicking the Low chip filters to low-credit rows', () => {
    table = buildBreakdownTable([
      ws({ id: 'healthy', fullName: 'Healthy', available: 500 }),
      ws({ id: 'low',    fullName: 'Low',    available: 50 }),
    ]);
    document.body.appendChild(table);

    let lowChip = table.querySelector('[data-chip="low"]') as HTMLButtonElement;
    lowChip.click();
    lowChip = table.querySelector('[data-chip="low"]') as HTMLButtonElement;
    expect(lowChip.getAttribute('data-active')).toBe('true');
    expect(rowIds()).toEqual(['low']);
  });

  it('clicking the Empty chip filters to empty rows', () => {
    table = buildBreakdownTable([
      ws({ id: 'has',  fullName: 'Has',  available: 100 }),
      ws({ id: 'zero', fullName: 'Zero', available: 0 }),
    ]);
    document.body.appendChild(table);

    const emptyChip = table.querySelector('[data-chip="empty"]') as HTMLButtonElement;
    emptyChip.click();
    expect(rowIds()).toEqual(['zero']);
  });

  it('clicking the Free chip filters to free-plan rows', () => {
    table = buildBreakdownTable([
      ws({ id: 'paid', fullName: 'Paid', available: 100, hasFree: false }),
      ws({ id: 'free', fullName: 'Free', available: 100, hasFree: true }),
    ]);
    document.body.appendChild(table);

    const freeChip = table.querySelector('[data-chip="free"]') as HTMLButtonElement;
    freeChip.click();
    expect(rowIds()).toEqual(['free']);
  });

  it('shows empty message when filters exclude all rows', () => {
    table = buildBreakdownTable([
      ws({ id: 'only', fullName: 'Only', available: 500, hasFree: false }),
    ]);
    document.body.appendChild(table);

    const lowChip = table.querySelector('[data-chip="low"]') as HTMLButtonElement;
    lowChip.click();
    expect(rowIds()).toEqual([]);
    const msg = table.querySelector('[data-credit-totals-rows]')!.textContent;
    expect(msg).toContain('No workspaces match');
  });

  it('toggling a chip off restores all rows', () => {
    table = buildBreakdownTable([
      ws({ id: 'a', fullName: 'Alpha', available: 500 }),
      ws({ id: 'b', fullName: 'Bravo',  available: 50 }),
    ]);
    document.body.appendChild(table);

    let lowChip = table.querySelector('[data-chip="low"]') as HTMLButtonElement;
    lowChip.click(); // on
    expect(rowIds()).toEqual(['bravo']);
    lowChip = table.querySelector('[data-chip="low"]') as HTMLButtonElement;
    lowChip.click(); // off
    expect(rowIds()).toEqual(['alpha', 'bravo']);
  });
});
