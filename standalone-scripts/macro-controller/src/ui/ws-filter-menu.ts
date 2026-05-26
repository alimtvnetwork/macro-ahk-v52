/**
 * MacroLoop Controller — Workspace Filter Hamburger Menu
 *
 * v2.148.0 — Replaces the inline filter button row in the WS panel header.
 * "Focus current" stays inline; everything else lives in a popover opened
 * by a ☰ icon at the right of the header.
 *
 * Each row in the popover renders the SAME DOM ID/data-active attribute
 * the existing ws-list-renderer.readFilterState() already queries, so
 * downstream filter logic remains untouched.
 */

import {
  cPanelBg,
  cPrimary,
  cPrimaryBgAS,
  cPrimaryLighter,
} from '../shared-state';
import { logSub } from '../logging';
import { logError } from '../error-utils';
import { DataAttr } from '../types';
import {
  getLoopWsCreditSortMode,
  setLoopWsCreditSortMode,
  type CreditSortMode,
} from '../ws-list-renderer';

// ── Centralized DOM IDs (single source of truth) ──
const ID_FILTER_MENU_BTN = 'loop-ws-filter-menu-btn';
const ID_FILTER_MENU_POPOVER = 'loop-ws-filter-menu-popover';
const ID_FREE_FILTER = 'loop-ws-free-filter';
const ID_ROLLOVER_FILTER = 'loop-ws-rollover-filter';
const ID_BILLING_FILTER = 'loop-ws-billing-filter';
const ID_EXPIRED_CREDITS_FILTER = 'loop-ws-expired-credits-filter';
const ID_EXPIRING_FILTER = 'loop-ws-expiring-filter';
const ID_REFILL_SOON_FILTER = 'loop-ws-refill-soon-filter';
const ID_REFILL_PRIORITY_FILTER = 'loop-ws-refill-priority-filter';
const ID_COMPACT_TOGGLE = 'loop-ws-compact-toggle';
const ID_MIN_CREDITS_INPUT = 'loop-ws-min-credits';

// ── Credit-sort mode (v3.30.0) — radio-style rows ──
const ID_CREDIT_SORT_HIGH = 'loop-ws-credit-sort-high';
const ID_CREDIT_SORT_LOW = 'loop-ws-credit-sort-low';
const ID_CREDIT_SORT_PRO_HIGH = 'loop-ws-credit-sort-pro-high';
const ID_CREDIT_SORT_PRO_LOW = 'loop-ws-credit-sort-pro-low';

const CREDIT_SORT_ROW_IDS: ReadonlyArray<{ id: string; mode: CreditSortMode }> = [
  { id: ID_CREDIT_SORT_HIGH, mode: 'high' },
  { id: ID_CREDIT_SORT_LOW, mode: 'low' },
  { id: ID_CREDIT_SORT_PRO_HIGH, mode: 'pro-high' },
  { id: ID_CREDIT_SORT_PRO_LOW, mode: 'pro-low' },
];

export interface WsFilterMenuDeps {
  populateLoopWorkspaceDropdown: () => void;
  getLoopWsFreeOnly: () => boolean;
  setLoopWsFreeOnly: (v: boolean) => void;
  getLoopWsCompactMode: () => boolean;
  setLoopWsCompactMode: (v: boolean) => void;
  getLoopWsExpiredWithCredits: () => boolean;
  setLoopWsExpiredWithCredits: (v: boolean) => void;
  getLoopWsExpiring: () => boolean;
  setLoopWsExpiring: (v: boolean) => void;
  getLoopWsRefillSoon: () => boolean;
  setLoopWsRefillSoon: (v: boolean) => void;
  getLoopWsRefillPriority: () => boolean;
  setLoopWsRefillPriority: (v: boolean) => void;
}

interface FilterRowConfig {
  id: string;
  icon: string;
  label: string;
  hint: string;
  initialActive: boolean;
  onToggle: (active: boolean) => void;
}

/** Build a single filter row in the popover. Returns the row element. */
function buildFilterRow(config: FilterRowConfig, populate: () => void): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText =
    'display:flex;align-items:center;gap:6px;padding:5px 8px;cursor:pointer;' +
    'border-radius:3px;transition:background 0.12s;font-size:10px;color:#e2e8f0;';
  row.setAttribute(DataAttr.Active, config.initialActive ? 'true' : 'false');

  // The id-bearing chip is what readFilterState() queries — it must exist in
  // the DOM with the data-active attribute even when the popover is closed,
  // so we make it the row itself.
  row.id = config.id;

  const checkChip = document.createElement('span');
  checkChip.textContent = config.initialActive ? '☑' : '☐';
  checkChip.style.cssText = 'font-size:11px;color:#a78bfa;width:12px;flex-shrink:0;';

  const iconSpan = document.createElement('span');
  iconSpan.textContent = config.icon;
  iconSpan.style.cssText = 'font-size:11px;width:14px;text-align:center;flex-shrink:0;';

  const labelSpan = document.createElement('span');
  labelSpan.textContent = config.label;
  labelSpan.style.cssText = 'flex:1;';

  const hintSpan = document.createElement('span');
  hintSpan.textContent = config.hint;
  hintSpan.style.cssText = 'font-size:8px;color:#94a3b8;';

  row.appendChild(checkChip);
  row.appendChild(iconSpan);
  row.appendChild(labelSpan);
  row.appendChild(hintSpan);

  row.onmouseover = function () { row.style.background = 'rgba(139,92,246,0.18)'; };
  row.onmouseout = function () { row.style.background = 'transparent'; };
  row.onclick = function (e: Event) {
    e.preventDefault();
    e.stopPropagation();
    const wasActive = row.getAttribute(DataAttr.Active) === 'true';
    const next = !wasActive;
    row.setAttribute(DataAttr.Active, next ? 'true' : 'false');
    checkChip.textContent = next ? '☑' : '☐';
    config.onToggle(next);
    populate();
  };

  return row;
}

/** Build the Min⚡ numeric input row (shared with renderer via ID_MIN_CREDITS_INPUT). */
function buildMinCreditsRow(populate: () => void): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText =
    'display:flex;align-items:center;gap:6px;padding:5px 8px;font-size:10px;color:#e2e8f0;';

  const labelWrap = document.createElement('span');
  labelWrap.style.cssText = 'flex:1;display:flex;align-items:center;gap:4px;';
  labelWrap.innerHTML = '<span style="font-size:11px;width:14px;text-align:center;margin-left:18px;">⚡</span>'
    + '<span>Min available</span>';

  const input = document.createElement('input');
  input.type = 'number';
  input.id = ID_MIN_CREDITS_INPUT;
  input.placeholder = '0';
  input.min = '0';
  input.style.cssText =
    'width:48px;padding:2px 4px;border:1px solid ' + cPrimary +
    ';border-radius:3px;background:' + cPanelBg +
    ';color:#22d3ee;font-size:10px;outline:none;font-family:monospace;text-align:right;';
  input.oninput = function () { populate(); };

  row.appendChild(labelWrap);
  row.appendChild(input);
  return row;
}

/** Build the legend block displayed at the bottom of the popover. */
function buildLegendBlock(): HTMLElement {
  const legend = document.createElement('div');
  legend.style.cssText =
    'display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;border-top:1px solid rgba(255,255,255,.1);' +
    'margin-top:2px;background:rgba(0,0,0,0.25);';
  legend.innerHTML =
    '<span style="font-size:8px;color:#4ade80;" title="Billing credits from subscription">💰Billing</span>'
    + '<span style="font-size:8px;color:#c4b5fd;" title="Rollover from previous period">🔄Rollover</span>'
    + '<span style="font-size:8px;color:#facc15;" title="Daily free credits">📅Daily</span>'
    + '<span style="font-size:8px;color:#22d3ee;" title="Total available credits">⚡Total</span>'
    + '<span style="font-size:8px;color:#4ade80;" title="Trial credits">🎁Trial</span>'
    + '<span style="font-size:8px;color:#94a3b8;" title="📍=Current 🟢=OK 🟡=Low 🔴=Empty">📍🟢🟡🔴</span>';
  return legend;
}

/** Persist compact-mode preference (best-effort). */
function persistCompactMode(active: boolean): void {
  try {
    localStorage.setItem('ml_compact_mode', active ? 'true' : 'false');
  } catch (ex: unknown) {
    logSub('Failed to persist compact mode: ' + (ex instanceof Error ? ex.message : String(ex)), 1);
  }
}

/** Build the popover panel (initially hidden). */
function buildFilterRowConfigs(deps: WsFilterMenuDeps): FilterRowConfig[] {
  return [
    {
      id: ID_FREE_FILTER, icon: '🆓', label: 'Free only', hint: 'daily > 0',
      initialActive: deps.getLoopWsFreeOnly(),
      onToggle: function (active: boolean) { deps.setLoopWsFreeOnly(active); },
    },
    {
      id: ID_ROLLOVER_FILTER, icon: '🔄', label: 'Rollover only', hint: 'rollover > 0',
      initialActive: false,
      onToggle: function () { /* state lives on data-active attr */ },
    },
    {
      id: ID_BILLING_FILTER, icon: '💰', label: 'Billing only', hint: 'billing > 0',
      initialActive: false,
      onToggle: function () { /* state lives on data-active attr */ },
    },
    {
      id: ID_EXPIRED_CREDITS_FILTER, icon: '⏰', label: 'Expired w/ credits',
      hint: 'available > 5, sorted desc',
      initialActive: deps.getLoopWsExpiredWithCredits(),
      onToggle: function (active: boolean) { deps.setLoopWsExpiredWithCredits(active); },
    },
    {
      id: ID_EXPIRING_FILTER, icon: '⚠️', label: 'Expiring',
      hint: 'past-due only, sorted by urgency',
      initialActive: deps.getLoopWsExpiring(),
      onToggle: function (active: boolean) { deps.setLoopWsExpiring(active); },
    },
    {
      id: ID_REFILL_SOON_FILTER, icon: '🔁', label: 'Refill soon',
      hint: 'about-to-refill only',
      initialActive: deps.getLoopWsRefillSoon(),
      onToggle: function (active: boolean) { deps.setLoopWsRefillSoon(active); },
    },
    {
      id: ID_REFILL_PRIORITY_FILTER, icon: '⏳', label: 'Refill priority',
      hint: 'sort by urgency × credits',
      initialActive: deps.getLoopWsRefillPriority(),
      onToggle: function (active: boolean) { deps.setLoopWsRefillPriority(active); },
    },
    {
      id: ID_COMPACT_TOGGLE, icon: '⚡', label: 'Compact view', hint: 'available/total only',
      initialActive: deps.getLoopWsCompactMode(),
      onToggle: function (active: boolean) {
        deps.setLoopWsCompactMode(active);
        persistCompactMode(active);
      },
    },
  ];
}

/**
 * Build the credit-sort section header (separator label inside the popover).
 */
function buildCreditSortHeader(): HTMLElement {
  const h = document.createElement('div');
  h.style.cssText =
    'padding:6px 8px 2px 8px;font-size:9px;color:#94a3b8;font-weight:700;'
    + 'text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid rgba(255,255,255,.1);'
    + 'margin-top:2px;';
  h.textContent = 'Credit sort';
  return h;
}

/**
 * Set of all credit-sort rows — clicking one activates exclusively (radio).
 * Returns the list of row elements so the caller can append them.
 */
function buildCreditSortRows(populate: () => void): HTMLElement[] {
  const rows: HTMLElement[] = [];

  function syncVisualState(activeMode: CreditSortMode): void {
    for (const { id, mode } of CREDIT_SORT_ROW_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const isActive = mode === activeMode;
      el.setAttribute(DataAttr.Active, isActive ? 'true' : 'false');
      const chip = el.querySelector('.marco-credit-sort-chip') as HTMLElement | null;
      if (chip) chip.textContent = isActive ? '◉' : '○';
    }
  }

  const meta: ReadonlyArray<{ id: string; mode: CreditSortMode; icon: string; label: string; hint: string }> = [
    { id: ID_CREDIT_SORT_HIGH, mode: 'high', icon: '⬇', label: 'High credit', hint: 'all, desc' },
    { id: ID_CREDIT_SORT_LOW, mode: 'low', icon: '⬆', label: 'Low credit', hint: 'all, asc' },
    { id: ID_CREDIT_SORT_PRO_HIGH, mode: 'pro-high', icon: '💎⬇', label: 'Pro high', hint: 'pro expiring, desc' },
    { id: ID_CREDIT_SORT_PRO_LOW, mode: 'pro-low', icon: '💎⬆', label: 'Pro low', hint: 'pro expiring, asc' },
  ];

  const currentMode = getLoopWsCreditSortMode();

  for (const m of meta) {
    const row = document.createElement('div');
    row.id = m.id;
    const isActive = currentMode === m.mode;
    row.setAttribute(DataAttr.Active, isActive ? 'true' : 'false');
    row.style.cssText =
      'display:flex;align-items:center;gap:6px;padding:5px 8px;cursor:pointer;' +
      'border-radius:3px;transition:background 0.12s;font-size:10px;color:#e2e8f0;';

    const chip = document.createElement('span');
    chip.className = 'marco-credit-sort-chip';
    chip.textContent = isActive ? '◉' : '○';
    chip.style.cssText = 'font-size:11px;color:#a78bfa;width:12px;flex-shrink:0;';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = m.icon;
    iconSpan.style.cssText = 'font-size:11px;width:18px;text-align:center;flex-shrink:0;';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = m.label;
    labelSpan.style.cssText = 'flex:1;';

    const hintSpan = document.createElement('span');
    hintSpan.textContent = m.hint;
    hintSpan.style.cssText = 'font-size:8px;color:#94a3b8;';

    row.appendChild(chip);
    row.appendChild(iconSpan);
    row.appendChild(labelSpan);
    row.appendChild(hintSpan);

    row.onmouseover = function () { row.style.background = 'rgba(139,92,246,0.18)'; };
    row.onmouseout = function () { row.style.background = 'transparent'; };
    row.onclick = function (e: Event) {
      e.preventDefault();
      e.stopPropagation();
      const wasActive = row.getAttribute(DataAttr.Active) === 'true';
      // Radio behavior: clicking the active row clears it; otherwise activate it.
      const nextMode: CreditSortMode = wasActive ? 'none' : m.mode;
      setLoopWsCreditSortMode(nextMode);
      syncVisualState(nextMode);
      populate();
    };

    rows.push(row);
  }

  return rows;
}

function buildPopover(deps: WsFilterMenuDeps): HTMLElement {
  const popover = document.createElement('div');
  popover.id = ID_FILTER_MENU_POPOVER;
  popover.style.cssText =
    'position:absolute;top:100%;right:0;margin-top:4px;z-index:100002;display:none;' +
    'min-width:220px;background:' + cPanelBg + ';border:1px solid ' + cPrimary +
    ';border-radius:5px;padding:4px;box-shadow:0 6px 20px rgba(0,0,0,.55);';

  for (const config of buildFilterRowConfigs(deps)) {
    popover.appendChild(buildFilterRow(config, deps.populateLoopWorkspaceDropdown));
  }
  popover.appendChild(buildMinCreditsRow(deps.populateLoopWorkspaceDropdown));

  popover.appendChild(buildCreditSortHeader());
  for (const r of buildCreditSortRows(deps.populateLoopWorkspaceDropdown)) {
    popover.appendChild(r);
  }

  popover.appendChild(buildLegendBlock());

  return popover;
}

/**
 * Build the ☰ trigger button + popover wrapped in a positioning container.
 * The container is what the caller appends to the WS dropdown header.
 */
export function buildWsFilterMenuButton(deps: WsFilterMenuDeps): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:inline-block;';

  const btn = document.createElement('button');
  btn.id = ID_FILTER_MENU_BTN;
  btn.textContent = '☰';
  btn.title = 'Filters & view options';
  btn.style.cssText =
    'padding:2px 7px;background:' + cPrimaryBgAS + ';color:' + cPrimaryLighter +
    ';border:1px solid rgba(139,92,246,0.4);border-radius:3px;font-size:11px;cursor:pointer;font-weight:700;';

  let popover: HTMLElement | null = null;
  let outsideHandler: ((e: MouseEvent) => void) | null = null;

  function close(): void {
    if (popover) popover.style.display = 'none';
    if (outsideHandler) {
      document.removeEventListener('mousedown', outsideHandler, true);
      outsideHandler = null;
    }
  }

  btn.onclick = function (e: Event) {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (!popover) {
        popover = buildPopover(deps);
        wrap.appendChild(popover);
      }
      const isOpen = popover.style.display !== 'none';
      if (isOpen) {
        close();
        return;
      }
      popover.style.display = 'block';
      outsideHandler = function (ev: MouseEvent) {
        const target = ev.target as Node | null;
        if (popover && target && !popover.contains(target) && target !== btn) {
          close();
        }
      };
      // attach in the next tick so the click that opened us isn't treated as outside
      setTimeout(function () {
        if (outsideHandler) document.addEventListener('mousedown', outsideHandler, true);
      }, 0);
    } catch (err: unknown) {
      logError('wsFilterMenu', 'Failed to toggle filter menu popover', err);
    }
  };

  wrap.appendChild(btn);
  return wrap;
}
