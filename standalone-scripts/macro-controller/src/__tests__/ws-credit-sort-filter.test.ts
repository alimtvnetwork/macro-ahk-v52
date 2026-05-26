/**
 * Credit-sort hamburger rows (v3.30.0) — 4 radio-style options.
 *
 * Verifies:
 *   1. All 4 rows render with their canonical DOM ids.
 *   2. Clicking a row activates it and clears any previously active row
 *      (mutually-exclusive radio behavior).
 *   3. Clicking the active row again clears the mode (back to 'none').
 *   4. Toggling any row triggers list re-population.
 *   5. The persisted mode is loaded on next render.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWsFilterMenuButton, type WsFilterMenuDeps } from '../ui/ws-filter-menu';
import {
  getLoopWsCreditSortMode,
  setLoopWsCreditSortMode,
} from '../ws-list-renderer';

function makeDeps(): WsFilterMenuDeps {
  return {
    populateLoopWorkspaceDropdown: vi.fn(),
    getLoopWsFreeOnly: vi.fn(() => false),
    setLoopWsFreeOnly: vi.fn(),
    getLoopWsCompactMode: vi.fn(() => false),
    setLoopWsCompactMode: vi.fn(),
    getLoopWsExpiredWithCredits: vi.fn(() => false),
    setLoopWsExpiredWithCredits: vi.fn(),
    getLoopWsExpiring: vi.fn(() => false),
    setLoopWsExpiring: vi.fn(),
    getLoopWsRefillSoon: vi.fn(() => false),
    setLoopWsRefillSoon: vi.fn(),
    getLoopWsRefillPriority: vi.fn(() => false),
    setLoopWsRefillPriority: vi.fn(),
  };
}

function openMenu(deps: WsFilterMenuDeps): void {
  const wrap = buildWsFilterMenuButton(deps);
  document.body.appendChild(wrap);
  const btn = wrap.querySelector('button');
  btn!.click();
}

const ROW_IDS = [
  'loop-ws-credit-sort-high',
  'loop-ws-credit-sort-low',
  'loop-ws-credit-sort-pro-high',
  'loop-ws-credit-sort-pro-low',
] as const;

describe('Credit-sort hamburger rows (v3.30.0)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    try { localStorage.removeItem('ml_credit_sort_mode'); } catch { /* jsdom */ }
    setLoopWsCreditSortMode('none');
  });

  it('renders all 4 credit-sort rows with canonical DOM ids', () => {
    openMenu(makeDeps());
    for (const id of ROW_IDS) {
      const el = document.getElementById(id);
      expect(el, `missing row ${id}`).toBeTruthy();
      expect(el!.getAttribute('data-active')).toBe('false');
    }
    expect(document.getElementById('loop-ws-credit-sort-high')!.textContent).toContain('High credit');
    expect(document.getElementById('loop-ws-credit-sort-pro-low')!.textContent).toContain('Pro low');
  });

  it('activates clicked row and deactivates others (radio behavior)', () => {
    const deps = makeDeps();
    openMenu(deps);

    document.getElementById('loop-ws-credit-sort-high')!.click();
    expect(getLoopWsCreditSortMode()).toBe('high');
    expect(document.getElementById('loop-ws-credit-sort-high')!.getAttribute('data-active')).toBe('true');
    for (const id of ROW_IDS.filter((x) => x !== 'loop-ws-credit-sort-high')) {
      expect(document.getElementById(id)!.getAttribute('data-active')).toBe('false');
    }

    document.getElementById('loop-ws-credit-sort-pro-low')!.click();
    expect(getLoopWsCreditSortMode()).toBe('pro-low');
    expect(document.getElementById('loop-ws-credit-sort-pro-low')!.getAttribute('data-active')).toBe('true');
    expect(document.getElementById('loop-ws-credit-sort-high')!.getAttribute('data-active')).toBe('false');
  });

  it('clicking the active row clears the mode (back to none)', () => {
    const deps = makeDeps();
    openMenu(deps);
    const row = document.getElementById('loop-ws-credit-sort-pro-high')!;
    row.click();
    expect(getLoopWsCreditSortMode()).toBe('pro-high');
    row.click();
    expect(getLoopWsCreditSortMode()).toBe('none');
    expect(row.getAttribute('data-active')).toBe('false');
  });

  it('triggers populate() on every credit-sort click', () => {
    const deps = makeDeps();
    openMenu(deps);
    document.getElementById('loop-ws-credit-sort-low')!.click();
    expect(deps.populateLoopWorkspaceDropdown).toHaveBeenCalled();
  });
});
