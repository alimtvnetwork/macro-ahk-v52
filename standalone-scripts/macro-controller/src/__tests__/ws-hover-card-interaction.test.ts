/**
 * ws-hover-card — end-to-end interaction test (jsdom).
 *
 * Verifies two contracts of the workspace hover tooltip:
 *
 *   1. POSITIONING — when there is room on the right of the anchor row, the
 *      card mounts to the RIGHT of it (left == anchor.right + GAP). This
 *      protects the workspace list and its action icons from being covered.
 *
 *   2. STAY-CLICKABLE — when the cursor leaves the name span and enters the
 *      card itself, the hide timer is cancelled so the user can click into
 *      <details> / copy IDs. After the configured hide-grace period, an
 *      ordinary mouseout (relatedTarget outside the card) still hides it.
 *
 * Exercises the real `attachWorkspaceHoverCard` delegated listeners via
 * dispatched MouseEvents — no mocks of internal helpers.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attachWorkspaceHoverCard, hideWorkspaceHoverCard } from '../ws-hover-card';
import type { WorkspaceCredit } from '../types';

declare global {
  interface Window { __MARCO_CONFIG__?: Record<string, unknown>; }
}

const HOVERCARD_ID = 'marco-ws-hovercard';
const GAP = 8;
const HIDE_GRACE_MS = 50;

function makeWs(): WorkspaceCredit {
  return {
    id: 'ws_e2e', name: 'E2E', fullName: 'E2E Workspace',
    dailyFree: 50, dailyUsed: 8, dailyLimit: 50,
    rolloverUsed: 0, rolloverLimit: 0,
    freeGranted: 0, freeRemaining: 0,
    used: 8, limit: 200, topupLimit: 0,
    totalCredits: 200, available: 142, rollover: 0, billingAvailable: 142,
    hasFree: false, totalCreditsUsed: 8,
    subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
    plan: 'pro_1', role: 'owner', tier: 'PRO',
    raw: {}, rawApi: {},
    numProjects: 3, gitSyncEnabled: false,
    nextRefillAt: '2026-05-01T00:00:00Z',
    billingPeriodEndAt: '2026-05-22T00:00:00Z',
    createdAt: '2025-01-15T00:00:00Z',
    membershipRole: 'Owner', planType: 'PRO',
  };
}

/** Build a workspace list DOM with one item and stub its bounding rect. */
function setupList(itemRect: { left: number; top: number; width: number; height: number }) {
  document.body.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'loop-ws-list';
  const item = document.createElement('div');
  item.className = 'loop-ws-item';
  item.setAttribute('data-ws-id', 'ws_e2e');
  const name = document.createElement('span');
  name.className = 'loop-ws-name';
  name.textContent = 'E2E Workspace';
  item.appendChild(name);
  list.appendChild(item);
  document.body.appendChild(list);

  const rect = {
    left: itemRect.left,
    top: itemRect.top,
    width: itemRect.width,
    height: itemRect.height,
    right: itemRect.left + itemRect.width,
    bottom: itemRect.top + itemRect.height,
    x: itemRect.left, y: itemRect.top,
    toJSON() { return this; },
  } as DOMRect;
  item.getBoundingClientRect = () => rect;
  name.getBoundingClientRect = () => rect;

  return { list, item, name };
}

/** Fire a delegated MouseEvent with explicit target + relatedTarget. */
function fireMouse(
  type: 'mouseover' | 'mouseout',
  list: HTMLElement,
  target: HTMLElement,
  relatedTarget: HTMLElement | null,
): void {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'target', { value: target, configurable: true });
  Object.defineProperty(ev, 'relatedTarget', { value: relatedTarget, configurable: true });
  list.dispatchEvent(ev);
}

describe('ws-hover-card — interaction (positioning + stay-clickable)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    setWorkspaceLifecycleConfigOverride({
      enableWorkspaceHoverDetails: true,
      hoverCardHideGracePeriodMs: HIDE_GRACE_MS,
    });
  });

  afterEach(() => {
    hideWorkspaceHoverCard();
    setWorkspaceLifecycleConfigOverride(null);
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('mounts the tooltip to the RIGHT of the anchor row', () => {
    const { list, item, name } = setupList({ left: 40, top: 120, width: 200, height: 28 });
    attachWorkspaceHoverCard(list, () => makeWs());

    fireMouse('mouseover', list, name, null);

    const card = document.getElementById(HOVERCARD_ID) as HTMLDivElement | null;
    expect(card).not.toBeNull();
    expect(card!.style.display).toBe('block');
    expect(card!.style.visibility).toBe('visible');
    // Expected x = item.right + GAP = 40 + 200 + 8 = 248
    const expectedLeft = item.getBoundingClientRect().right + GAP;
    expect(parseInt(card!.style.left, 10)).toBe(expectedLeft);
    // Card content reflects the workspace.
    expect(card!.innerHTML).toContain('E2E Workspace');
  });

  it('keeps the tooltip open and clickable when the cursor moves onto the card', () => {
    const { list, name } = setupList({ left: 40, top: 120, width: 200, height: 28 });
    attachWorkspaceHoverCard(list, () => makeWs());

    fireMouse('mouseover', list, name, null);
    const card = document.getElementById(HOVERCARD_ID)!;
    expect(card.style.display).toBe('block');

    // Cursor leaves the name span and enters the card → no hide must be
    // scheduled. We dispatch mouseout with relatedTarget set to the card
    // itself (the path the real browser takes), then advance well past the
    // grace period to prove the card stays visible.
    fireMouse('mouseout', list, name, card);
    vi.advanceTimersByTime(HIDE_GRACE_MS * 4);
    expect(card.style.display).toBe('block');

    // <details> inside the card must be reachable + toggleable by click,
    // proving the card itself is interactive (pointer-events on, not hidden).
    const details = card.querySelector('details') as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
    const summary = details!.querySelector('summary') as HTMLElement;
    summary.click();
    // jsdom toggles the open property on summary click.
    expect(details!.open).toBe(true);
    expect(card.style.display).toBe('block');
  });

  it('hides the tooltip after the grace period when the cursor leaves to empty space', () => {
    const { list, name } = setupList({ left: 40, top: 120, width: 200, height: 28 });
    attachWorkspaceHoverCard(list, () => makeWs());

    fireMouse('mouseover', list, name, null);
    const card = document.getElementById(HOVERCARD_ID)!;
    expect(card.style.display).toBe('block');

    // Move cursor onto unrelated DOM (relatedTarget = body, outside card).
    fireMouse('mouseout', list, name, document.body);
    // Before the timer fires the card is still visible.
    vi.advanceTimersByTime(HIDE_GRACE_MS - 1);
    expect(card.style.display).toBe('block');
    // After the grace period it hides.
    vi.advanceTimersByTime(2);
    expect(card.style.display).toBe('none');
  });
});
