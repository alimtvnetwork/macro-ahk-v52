/**
 * Next Inline Strip — sits above the Lovable chat textarea (next to the
 * Repeat strip). User picks Steps + Delay → clicks Start: the macro pastes
 * the next queued subtask (from Task Splitter) or the legacy "Next Tasks"
 * prompt, submits, waits the fixed delay, then submits the next one.
 * Lovable itself queues the rapid submissions; we do NOT wait for completion
 * between cycles (that's what the Repeat strip is for).
 *
 * Cancel via Stop button or Escape (shared taskNextState.cancelled flag).
 */

import { log } from '../logging';
import { logError } from '../error-utils';
import { showPasteToast, pasteIntoEditor, findPasteTarget } from './prompt-utils';
import { getPromptsConfig } from './prompt-manager';
import { getByXPath } from '../xpath-utils';
import {
  taskNextState,
  dequeueTaskNextPrompt,
  dispatchTaskNextSubmit,
  findNextTasksPrompt,
  type TaskNextDeps,
} from './task-next-ui';
import { triggerPlanPasteFromInline, isSplitterRunning } from './task-splitter-ui';
import { cPanelFg, cPrimaryLight, cSectionBg } from '../shared-state';

const STEP_PRESETS = [1, 2, 3, 5, 8, 10, 15] as const;
const STEP_PRESETS_HIGHLIGHT = new Set<number>([5, 10]);
const PLAN_PRESETS = [
  5, 10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50,
  52, 55, 58, 60, 70, 80, 100, 125, 150, 200,
] as const;
const PLAN_PRESETS_HIGHLIGHT = new Set<number>([5, 10, 12, 15, 30]);
const PLAN_MIN = 2;
const PLAN_MAX = 200;
const DELAY_PRESETS_SEC = [5, 10, 15, 30, 60] as const;
const STORAGE_KEY = 'marco-next-inline-prefs';
const CSS_HINT_LABEL = 'font-size:10px;opacity:0.8;';

interface NextState {
  steps: number;
  delaySec: number;
  completed: number;
  phaseDeadlineAt: number;
  subscribers: Set<() => void>;
}

const state: NextState = {
  steps: 10,
  delaySec: 10,
  completed: 0,
  phaseDeadlineAt: 0,
  subscribers: new Set(),
};

function persist(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ steps: state.steps, delaySec: state.delaySec }));
  } catch (e) { log('NextInline: persist failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
}

function hydrate(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const o = JSON.parse(raw) as { steps?: number; delaySec?: number };
    if (typeof o.steps === 'number' && o.steps >= 1) state.steps = Math.min(200, Math.floor(o.steps));
    if (typeof o.delaySec === 'number' && o.delaySec >= 1) state.delaySec = Math.min(3600, Math.floor(o.delaySec));
  } catch (e) { log('NextInline: hydrate failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
}
hydrate();

function notify(): void {
  for (const s of state.subscribers) {
    try { s(); } catch (e) { log('NextInline: subscriber failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
  }
}

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

async function resolveText(deps: TaskNextDeps): Promise<string | null> {
  const q = await dequeueTaskNextPrompt();
  if (q.failed) return null;
  if (q.selection) return q.selection.text;
  const legacy = findNextTasksPrompt(deps);
  if (legacy && legacy.text) return legacy.text;
  return null;
}

async function runOneCycle(deps: TaskNextDeps, k: number, n: number): Promise<boolean> {
  const text = await resolveText(deps);
  if (!text) {
    showPasteToast('❌ Next: no queued task and no "Next Tasks" prompt', true);
    return false;
  }
  const outcome = pasteIntoEditor(text, deps.getPromptsConfig(), deps.getByXPath);
  if (String(outcome) === 'failed') {
    showPasteToast('❌ Next: paste failed at ' + (k + 1) + '/' + n, true);
    return false;
  }
  if (!dispatchTaskNextSubmit()) {
    showPasteToast('❌ Next: submit failed at ' + (k + 1) + '/' + n, true);
    return false;
  }
  state.completed = k + 1;
  showPasteToast('▶ Next ' + (k + 1) + '/' + n + ' submitted', false);
  notify();
  return true;
}

async function runNextQueue(deps: TaskNextDeps): Promise<void> {
  if (taskNextState.running) { showPasteToast('⏸ Next is already running', true); return; }
  const n = Math.max(1, Math.floor(state.steps) || 1);
  taskNextState.running = true;
  taskNextState.cancelled = false;
  state.completed = 0;
  notify();
  try {
    for (let k = 0; k < n; k++) {
      if (taskNextState.cancelled) { showPasteToast('🛑 Next cancelled at ' + k + '/' + n, false); break; }
      const ok = await runOneCycle(deps, k, n);
      if (!ok) break;
      if (k === n - 1) break;
      const delayMs = state.delaySec * 1000;
      state.phaseDeadlineAt = Date.now() + delayMs;
      notify();
      const until = Date.now() + delayMs;
      while (Date.now() < until && !taskNextState.cancelled) {
        await sleep(Math.min(250, until - Date.now()));
        notify();
      }
    }
    if (!taskNextState.cancelled && state.completed >= n) {
      showPasteToast('✅ Next: queued ' + n + ' submissions', false);
    }
  } catch (e) {
    logError('NextInline', 'unexpected failure in next-queue runner', e);
  } finally {
    taskNextState.running = false;
    taskNextState.cancelled = false;
    state.phaseDeadlineAt = 0;
    notify();
  }
}

function stopNextQueue(): void {
  if (!taskNextState.running) return;
  taskNextState.cancelled = true;
  notify();
}

// ── UI ──────────────────────────────────────────────────────────────


function buildSplitStrip(): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 6px;background:' + cSectionBg + ';border:1px solid rgba(245,158,11,0.35);border-radius:6px;font-family:system-ui,-apple-system,sans-serif;color:' + cPanelFg + ';font-size:11px;box-sizing:border-box;';

  const label = document.createElement('span');
  label.textContent = '📋 Plan';
  label.style.cssText = 'font-weight:600;color:#fbbf24;';
  root.appendChild(label);

  const stepsLbl = document.createElement('span');
  stepsLbl.textContent = 'into';
  stepsLbl.style.cssText = CSS_HINT_LABEL;
  root.appendChild(stepsLbl);

  const stepsInput = document.createElement('input');
  stepsInput.type = 'number'; stepsInput.min = String(PLAN_MIN); stepsInput.max = String(PLAN_MAX);
  stepsInput.value = String(Math.min(PLAN_MAX, Math.max(PLAN_MIN, state.steps)));
  stepsInput.style.cssText = 'width:56px;padding:2px 4px;background:rgba(0,0,0,0.3);border:1px solid rgba(245,158,11,0.35);border-radius:4px;color:' + cPanelFg + ';font-size:11px;';
  stepsInput.dataset.role = 'split-steps-input';
  root.appendChild(stepsInput);

  const unitLbl = document.createElement('span');
  unitLbl.textContent = 'steps';
  unitLbl.style.cssText = CSS_HINT_LABEL;
  root.appendChild(unitLbl);

  for (const n of PLAN_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = String(n); b.title = 'Plan into ' + n + ' steps';
    const highlighted = PLAN_PRESETS_HIGHLIGHT.has(n);
    const bg = highlighted ? 'rgba(245,158,11,0.55)' : 'rgba(245,158,11,0.12)';
    const border = highlighted ? '1px solid rgba(245,158,11,0.85)' : '1px solid rgba(245,158,11,0.3)';
    const weight = highlighted ? '700' : '500';
    b.style.cssText = 'padding:2px 6px;background:' + bg + ';border:' + border + ';border-radius:4px;color:' + cPanelFg + ';cursor:pointer;font-size:10px;font-weight:' + weight + ';';
    b.onclick = function () { stepsInput.value = String(n); };
    root.appendChild(b);
  }

  const planBtn = document.createElement('button');
  planBtn.type = 'button';
  planBtn.textContent = '📋 Plan';
  planBtn.title = 'Append the "Plan ${N}" prompt to the chat box (does NOT submit)';
  planBtn.dataset.role = 'plan-btn';
  planBtn.style.cssText = 'margin-left:auto;padding:5px 14px;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;color:#1a1a2e;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%);box-shadow:0 2px 6px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.25);';
  planBtn.onclick = function () {
    if (taskNextState.running || isSplitterRunning()) {
      showPasteToast('⏸ Another run is in progress', true);
      return;
    }
    const n = Math.max(PLAN_MIN, Math.min(PLAN_MAX, parseInt(stepsInput.value, 10) || 10));
    void triggerPlanPasteFromInline(n);
  };
  root.appendChild(planBtn);
  return root;
}


function buildStepsSection(root: HTMLElement): void {
  const stepsLbl = document.createElement('span'); stepsLbl.textContent = 'steps'; stepsLbl.style.cssText = CSS_HINT_LABEL;
  root.appendChild(stepsLbl);
  const stepsInput = document.createElement('input');
  stepsInput.type = 'number'; stepsInput.min = '1'; stepsInput.max = '100';
  stepsInput.value = String(state.steps);
  stepsInput.style.cssText = 'width:54px;padding:2px 4px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';font-size:11px;';
  stepsInput.dataset.role = 'steps-input';
  stepsInput.oninput = function () {
    const v = parseInt(stepsInput.value, 10);
    if (v >= 1) { state.steps = Math.min(100, v); persist(); }
  };
  root.appendChild(stepsInput);
  for (const n of STEP_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = String(n); b.title = 'Set step count to ' + n;
    const hi = STEP_PRESETS_HIGHLIGHT.has(n);
    const bg = hi ? 'rgba(124,58,237,0.55)' : 'rgba(124,58,237,0.15)';
    const bd = hi ? '1px solid rgba(124,58,237,0.85)' : '1px solid rgba(124,58,237,0.3)';
    const fw = hi ? '700' : '500';
    b.style.cssText = 'padding:2px 6px;background:' + bg + ';border:' + bd + ';border-radius:4px;color:' + cPanelFg + ';cursor:pointer;font-size:10px;font-weight:' + fw + ';';
    b.onclick = function () { state.steps = n; stepsInput.value = String(n); persist(); notify(); };
    root.appendChild(b);
  }
}

function buildDelaySection(root: HTMLElement): void {
  const delayLbl = document.createElement('span'); delayLbl.textContent = 'delay'; delayLbl.style.cssText = CSS_HINT_LABEL;
  root.appendChild(delayLbl);
  const delayInput = document.createElement('input');
  delayInput.type = 'number'; delayInput.min = '1'; delayInput.max = '3600';
  delayInput.value = String(state.delaySec);
  delayInput.style.cssText = 'width:54px;padding:2px 4px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';font-size:11px;';
  delayInput.dataset.role = 'delay-input';
  delayInput.oninput = function () {
    const v = parseInt(delayInput.value, 10);
    if (v >= 1) { state.delaySec = Math.min(3600, v); persist(); }
  };
  root.appendChild(delayInput);
  const sUnit = document.createElement('span'); sUnit.textContent = 's'; sUnit.style.cssText = 'font-size:10px;opacity:0.7;'; root.appendChild(sUnit);
  for (const s of DELAY_PRESETS_SEC) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = s + 's'; b.title = 'Set delay to ' + s + 's';
    b.style.cssText = 'padding:1px 4px;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.25);border-radius:3px;color:' + cPanelFg + ';cursor:pointer;font-size:9px;';
    b.onclick = function () { state.delaySec = s; delayInput.value = String(s); persist(); notify(); };
    root.appendChild(b);
  }
}

function buildActionButton(deps: TaskNextDeps): HTMLButtonElement {
  const action = document.createElement('button');
  action.type = 'button';
  action.style.marginLeft = 'auto';
  const startGradient = 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#2563eb 100%)';
  action.style.cssText = 'padding:5px 14px;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;color:#fff;background:' + startGradient + ';box-shadow:0 2px 6px rgba(79,70,229,0.45), inset 0 1px 0 rgba(255,255,255,0.18);';
  action.onclick = function () {
    if (taskNextState.running) stopNextQueue();
    else void runNextQueue(deps);
  };
  return action;
}

function wireRender(root: HTMLElement, action: HTMLButtonElement, progress: HTMLElement): void {
  const startGradient = 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#2563eb 100%)';
  const stopGradient = 'linear-gradient(135deg,#dc2626 0%,#b91c1c 50%,#7f1d1d 100%)';
  const stepsInput = root.querySelector('input[data-role="steps-input"]') as HTMLInputElement | null;
  const delayInput = root.querySelector('input[data-role="delay-input"]') as HTMLInputElement | null;
  const render = (): void => {
    if (stepsInput) stepsInput.disabled = taskNextState.running;
    if (delayInput) delayInput.disabled = taskNextState.running;
    if (taskNextState.running) {
      action.textContent = '⏹ Stop';
      action.style.background = stopGradient;
      const remain = Math.max(0, Math.ceil((state.phaseDeadlineAt - Date.now()) / 1000));
      const timer = state.phaseDeadlineAt > 0 && remain > 0 ? ' • next in ' + remain + 's' : '';
      progress.textContent = state.completed + '/' + state.steps + timer;
    } else {
      action.textContent = '▶ Start';
      action.style.background = startGradient;
      progress.textContent = state.completed > 0 ? 'done ' + state.completed + '/' + state.steps : '';
    }
  };
  render();
  state.subscribers.add(render);
  const tickId = setInterval(function () {
    if (!document.body.contains(root)) { clearInterval(tickId); state.subscribers.delete(render); return; }
    if (taskNextState.running) render();
  }, 500);
}

function buildControl(deps: TaskNextDeps): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 6px;background:' + cSectionBg + ';border:1px solid rgba(124,58,237,0.25);border-radius:6px;font-family:system-ui,-apple-system,sans-serif;color:' + cPanelFg + ';font-size:11px;box-sizing:border-box;';

  const label = document.createElement('span');
  label.textContent = '▶ Next';
  label.style.cssText = 'font-weight:600;color:' + cPrimaryLight + ';';
  root.appendChild(label);
  buildStepsSection(root);


  const sep = document.createElement('span');
  sep.style.cssText = 'border-left:1px solid rgba(124,58,237,0.25);height:14px;margin:0 2px;';
  root.appendChild(sep);

  buildDelaySection(root);

  const progress = document.createElement('span');
  progress.style.cssText = 'font-size:10px;color:' + cPrimaryLight + ';margin-left:4px;min-width:42px;';
  root.appendChild(progress);

  const action = buildActionButton(deps);
  root.appendChild(action);
  wireRender(root, action, progress);
  return root;
}


// ── Mount above chat box ────────────────────────────────────────────

const INLINE_ID = 'marco-next-inline';
const SPLIT_ID = 'marco-split-inline';

function tryMountInline(deps: TaskNextDeps): boolean {
  if (document.getElementById(INLINE_ID) && document.getElementById(SPLIT_ID)) return true;
  const target = findPasteTarget(getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
  if (!target) return false;
  const host = (target.closest && target.closest('form')) || target.parentElement;
  if (!host || !host.parentElement) return false;

  if (!document.getElementById(INLINE_ID)) {
    const strip = buildControl(deps);
    strip.id = INLINE_ID;
    strip.style.margin = '4px 0 2px';
    host.parentElement.insertBefore(strip, host);
  }
  if (!document.getElementById(SPLIT_ID)) {
    const splitStrip = buildSplitStrip();
    splitStrip.id = SPLIT_ID;
    splitStrip.style.margin = '0 0 4px';
    const nextStrip = document.getElementById(INLINE_ID);
    if (nextStrip && nextStrip.parentElement) {
      nextStrip.parentElement.insertBefore(splitStrip, nextStrip.nextSibling);
    } else {
      host.parentElement.insertBefore(splitStrip, host);
    }
  }
  log('NextInline: strips mounted (next + split) above chat box', 'info');
  return true;
}

let _observer: MutationObserver | null = null;

export function mountNextInlineStrip(deps: TaskNextDeps): void {
  if (tryMountInline(deps)) return;
  if (_observer) return;
  _observer = new MutationObserver(function () {
    if (typeof document === 'undefined' || !document.body) return;
    if (!document.getElementById(INLINE_ID) || !document.getElementById(SPLIT_ID)) tryMountInline(deps);
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}

