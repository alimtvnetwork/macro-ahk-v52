/**
 * Inline strip group collapse — single +/- control for Plan, Next, Repeat.
 *
 * The inline strips are mounted by two modules (`next-inline-ui.ts` and
 * `repeat-loop-ui.ts`), so this tiny shared controller owns the persisted
 * group state and applies it after either mount point appears.
 */

import { log } from '../logging';

const STORAGE_KEY = 'marco-inline-strip-group-prefs';
const PLAN_ID = 'marco-split-inline';
const NEXT_ID = 'marco-next-inline';
const REPEAT_ID = 'marco-repeat-inline';
const SEL_PLAN_BODY = '[data-role="plan-body"]';
const SEL_PLAN_DROPUP = '[data-role="plan-dropup"]';

interface InlineStripGroupPrefs {
  collapsed?: boolean;
}

interface InlineStripGroupState {
  collapsed: boolean;
  subscribers: Set<() => void>;
}

const state: InlineStripGroupState = {
  collapsed: false,
  subscribers: new Set(),
};

function toMessage(caught: CaughtError): string {
  return caught instanceof Error ? caught.message : String(caught);
}

function hydrate(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw) as InlineStripGroupPrefs;
    if (typeof prefs.collapsed === 'boolean') state.collapsed = prefs.collapsed;
  } catch (caught: CaughtError) {
    log('InlineStripGroup: hydrate failed — ' + toMessage(caught), 'warn');
  }
}

function persist(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed: state.collapsed }));
  } catch (caught: CaughtError) {
    log('InlineStripGroup: persist failed — ' + toMessage(caught), 'warn');
  }
}

function notify(): void {
  for (const subscriber of state.subscribers) {
    try { subscriber(); }
    catch (caught: CaughtError) {
      log('InlineStripGroup: subscriber failed — ' + toMessage(caught), 'warn');
    }
  }
}

hydrate();

export function getInlineStripGroupCollapsed(): boolean {
  return state.collapsed;
}

export function setInlineStripGroupCollapsed(collapsed: boolean): void {
  if (state.collapsed === collapsed) return;
  state.collapsed = collapsed;
  persist();
  notify();
}

export function toggleInlineStripGroupCollapsed(): void {
  setInlineStripGroupCollapsed(!state.collapsed);
}

export function subscribeInlineStripGroupCollapse(subscriber: () => void): () => void {
  state.subscribers.add(subscriber);
  return function unsubscribe(): void { state.subscribers.delete(subscriber); };
}

function applyPlanCollapse(plan: HTMLElement, collapsed: boolean): void {
  plan.dataset.groupCollapsed = collapsed ? '1' : '0';
  plan.style.display = 'flex';
  const body = plan.querySelector<HTMLElement>(SEL_PLAN_BODY);
  if (body) body.style.display = collapsed ? 'none' : 'flex';
  if (!collapsed) return;
  const dropup = plan.querySelector<HTMLElement>(SEL_PLAN_DROPUP);
  if (dropup) dropup.style.display = 'none';
}

export function applyInlineStripGroupCollapse(doc: Document = document): void {
  const collapsed = state.collapsed;
  const plan = doc.getElementById(PLAN_ID);
  const next = doc.getElementById(NEXT_ID);
  const repeat = doc.getElementById(REPEAT_ID);

  if (plan instanceof HTMLElement) applyPlanCollapse(plan, collapsed);
  if (next instanceof HTMLElement) next.style.display = collapsed ? 'none' : 'flex';
  if (repeat instanceof HTMLElement) repeat.style.display = collapsed ? 'none' : 'inline-flex';
}