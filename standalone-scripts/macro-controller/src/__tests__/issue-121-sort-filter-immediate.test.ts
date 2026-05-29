/**
 * v3.32.1 regression — issues reported in chat msg #1198:
 *
 *  1. Clicking High/Low credit (or Refill-soon) did NOT immediately re-render
 *     the workspace list because `populateLoopWorkspaceDropdown`'s dirty-hash
 *     omitted `creditSortMode` and `refillSoon`. The populate call early-
 *     returned with `recordSkip()` and the user had to trigger another DOM
 *     change before the sort took effect.
 *
 *  2. "Expired w/ credits" filter and "Pro high/low" credit-sort still
 *     surfaced FREE-tier and fully `canceled` workspaces, despite the
 *     v3.30.1 free-plan suppression. The user said: "the free version or
 *     the canceled ones should not be there".
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  filterAndSortWorkspaces,
  populateLoopWorkspaceDropdown,
  invalidateWsDropdownHash,
  setLoopWsCreditSortMode,
  setLoopWsExpiredWithCredits,
  setLoopWsRefillSoon,
} from '../ws-list-renderer';
import { loopCreditState } from '../shared-state';
import type { WorkspaceCredit } from '../types';

function ws(p: Partial<WorkspaceCredit>): WorkspaceCredit {
  return {
    id: 'w', name: 'w', fullName: 'w',
    dailyFree: 0, dailyUsed: 0, dailyLimit: 5,
    rolloverUsed: 0, rolloverLimit: 0,
    freeGranted: 0, freeRemaining: 0,
    used: 0, limit: 0, topupLimit: 0,
    totalCredits: 100, available: 100, rollover: 0, billingAvailable: 100,
    hasFree: false, totalCreditsUsed: 0,
    subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
    plan: 'pro_1', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 0, gitSyncEnabled: false,
    nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
    membershipRole: 'owner', planType: 'monthly',
    ...p,
  };
}

function resetView(): void {
  setLoopWsCreditSortMode('none');
  setLoopWsExpiredWithCredits(false);
  setLoopWsRefillSoon(false);
  invalidateWsDropdownHash();
}

describe('v3.32.1 — Expired w/ credits excludes FREE + canceled', () => {
  beforeEach(resetView);

  it('FREE-tier past_due workspace is NOT surfaced by the "Expired w/ credits" filter', () => {
    setLoopWsExpiredWithCredits(true);
    const rows = [
      ws({ id: 'free', tier: 'FREE', plan: 'free', subscriptionStatus: 'past_due', available: 200 }),
      ws({ id: 'pro', tier: 'PRO', plan: 'pro_1', subscriptionStatus: 'past_due', available: 150 }),
    ];
    const survivors = filterAndSortWorkspaces(rows, '');
    expect(survivors.map((s) => s.ws.id)).toEqual(['pro']);
  });

  it('Fully canceled subscription is NOT surfaced by the "Expired w/ credits" filter', () => {
    setLoopWsExpiredWithCredits(true);
    const rows = [
      ws({ id: 'cancelled', tier: 'PRO', plan: 'pro_1', subscriptionStatus: 'canceled', available: 200 }),
      ws({ id: 'pastdue', tier: 'PRO', plan: 'pro_1', subscriptionStatus: 'past_due', available: 150 }),
    ];
    const survivors = filterAndSortWorkspaces(rows, '');
    expect(survivors.map((s) => s.ws.id)).toEqual(['pastdue']);
  });
});

describe('v3.32.1 — populate dirty-hash includes creditSortMode + refillSoon', () => {
  beforeEach(() => {
    resetView();
    document.body.innerHTML = '<div id="loop-ws-list"></div>';
    loopCreditState.perWorkspace = [
      ws({ id: 'a', fullName: 'Alpha', available: 50 }),
      ws({ id: 'b', fullName: 'Bravo', available: 500 }),
      ws({ id: 'c', fullName: 'Charlie', available: 200 }),
    ];
    loopCreditState.lastCheckedAt = 1_700_000_000_000;
  });

  afterEach(() => {
    loopCreditState.perWorkspace = [];
    document.body.innerHTML = '';
  });

  function rowOrder(): string[] {
    const listEl = document.getElementById('loop-ws-list');
    if (!listEl) return [];
    return Array.from(listEl.querySelectorAll<HTMLElement>('[data-ws-id]'))
      .map((el) => el.getAttribute('data-ws-id') || '');
  }

  it('re-renders immediately when creditSortMode flips none → high', () => {
    populateLoopWorkspaceDropdown();
    const before = rowOrder();
    expect(before.length).toBeGreaterThan(0);

    setLoopWsCreditSortMode('high');
    populateLoopWorkspaceDropdown(); // would early-return with old hash bug
    const after = rowOrder();

    // High mode: DESC by available → Bravo(500), Charlie(200), Alpha(50)
    expect(after).toEqual(['b', 'c', 'a']);
    expect(after).not.toEqual(before);
  });

  it('re-renders immediately when creditSortMode flips high → low', () => {
    setLoopWsCreditSortMode('high');
    populateLoopWorkspaceDropdown();
    const high = rowOrder();
    expect(high).toEqual(['b', 'c', 'a']);

    setLoopWsCreditSortMode('low');
    populateLoopWorkspaceDropdown();
    const low = rowOrder();
    expect(low).toEqual(['a', 'c', 'b']);
  });

  it('re-renders immediately when refillSoon toggles', () => {
    populateLoopWorkspaceDropdown();
    const before = rowOrder();

    setLoopWsRefillSoon(true);
    populateLoopWorkspaceDropdown();
    const after = rowOrder();

    // refill-soon path narrows the survivor set; before/after hashes must
    // differ so the re-render actually fires.
    expect(after).not.toEqual(before);
  });
});
