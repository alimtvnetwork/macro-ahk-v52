/**
 * Refill-Soon filter chip — Step 1 of v3.12.0 workspace label refinement.
 *
 * Verifies:
 *   1. Chip id `loop-ws-refill-soon-filter` is rendered inside the popover.
 *   2. Toggling the chip flips the data-active attribute and calls setter.
 *   3. Chip starts in OFF state when getter returns false.
 *   4. Chip starts in ON state when getter returns true.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWsFilterMenuButton, type WsFilterMenuDeps } from '../ui/ws-filter-menu';

function makeDeps(initialRefillSoon: boolean): WsFilterMenuDeps {
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
    getLoopWsRefillSoon: vi.fn(() => initialRefillSoon),
    setLoopWsRefillSoon: vi.fn(),
    getLoopWsRefillPriority: vi.fn(() => false),
    setLoopWsRefillPriority: vi.fn(),
  };
}

function openMenu(deps: WsFilterMenuDeps): HTMLElement {
  const wrap = buildWsFilterMenuButton(deps);
  document.body.appendChild(wrap);
  const btn = wrap.querySelector('button');
  expect(btn).toBeTruthy();
  btn!.click();
  return wrap;
}

describe('Refill-Soon filter chip', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders the refill-soon chip with the canonical DOM id', () => {
    const deps = makeDeps(false);
    openMenu(deps);
    const chip = document.getElementById('loop-ws-refill-soon-filter');
    expect(chip).toBeTruthy();
    expect(chip!.getAttribute('data-active')).toBe('false');
    expect(chip!.textContent).toContain('Refill soon');
  });

  it('starts in ON state when getter returns true', () => {
    const deps = makeDeps(true);
    openMenu(deps);
    const chip = document.getElementById('loop-ws-refill-soon-filter')!;
    expect(chip.getAttribute('data-active')).toBe('true');
  });

  it('toggles data-active and calls setter on click', () => {
    const deps = makeDeps(false);
    openMenu(deps);
    const chip = document.getElementById('loop-ws-refill-soon-filter')!;
    chip.click();
    expect(chip.getAttribute('data-active')).toBe('true');
    expect(deps.setLoopWsRefillSoon).toHaveBeenCalledWith(true);
    chip.click();
    expect(chip.getAttribute('data-active')).toBe('false');
    expect(deps.setLoopWsRefillSoon).toHaveBeenLastCalledWith(false);
  });

  it('triggers list re-population after toggling', () => {
    const deps = makeDeps(false);
    openMenu(deps);
    const chip = document.getElementById('loop-ws-refill-soon-filter')!;
    chip.click();
    expect(deps.populateLoopWorkspaceDropdown).toHaveBeenCalled();
  });
});
