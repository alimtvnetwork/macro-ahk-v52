/**
 * Repeat Loop UI — chat-box repeat selector
 *
 * Ambiguity 126 — RESOLVED 2026-06-19. Repeats whatever text is currently
 * in the Lovable chat box: paste → submit → wait for completion → repeat N times.
 * Two synchronized mount points (floating macro panel section + inline strip
 * above the chat textarea) share the same state. Manual Stop only.
 */

import { log } from '../logging';
import { showPasteToast, findPasteTarget } from './prompt-utils';
import { getPromptsConfig } from './prompt-manager';
import { getByXPath, isReturnButtonVisible } from '../xpath-utils';
import { findAddToTasksButton } from './task-next-ui';
import { cPanelFg, cPrimary, cPrimaryLight, cSectionBg } from '../shared-state';

const PRESETS = [1, 5, 10, 25, 50, 100] as const;
const DELAY_PRESETS_SEC = [5, 8, 12, 15, 20, 30, 60] as const;
const POLL_MS = 500;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 min per submit
const STORAGE_KEY = 'marco-repeat-loop-prefs';

export type RepeatWaitMode = 'submit-ready' | 'fixed-delay';

interface RepeatState {
  count: number;
  waitMode: RepeatWaitMode;
  /** Fixed delay between iterations, seconds (used when waitMode = 'fixed-delay'). */
  delaySec: number;
  running: boolean;
  cancelled: boolean;
  completed: number;
  capturedText: string;
  /** Mounted controls subscribed to state changes (count/running/completed). */
  subscribers: Set<() => void>;
}

export const repeatLoopState: RepeatState = {
  count: 10,
  waitMode: 'submit-ready',
  delaySec: 15,
  running: false,
  cancelled: false,
  completed: 0,
  capturedText: '',
  subscribers: new Set(),
};

// ── persistence (count + waitMode + delaySec only, never running state) ──
function persist(): void {
  try {
    const payload = { count: repeatLoopState.count, waitMode: repeatLoopState.waitMode, delaySec: repeatLoopState.delaySec };
    const cs = (globalThis as { chrome?: { storage?: { local?: { set?: (i: Record<string, unknown>) => void } } } }).chrome;
    if (cs?.storage?.local?.set) {
      cs.storage.local.set({ [STORAGE_KEY]: payload });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch (e) { log('Repeat: persist failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
}

function hydrate(): void {
  try {
    const apply = (raw: unknown): void => {
      if (!raw || typeof raw !== 'object') return;
      const o = raw as { count?: unknown; waitMode?: unknown; delaySec?: unknown };
      if (typeof o.count === 'number' && o.count >= 1) repeatLoopState.count = Math.min(1000, Math.floor(o.count));
      if (o.waitMode === 'submit-ready' || o.waitMode === 'fixed-delay') repeatLoopState.waitMode = o.waitMode;
      if (typeof o.delaySec === 'number' && o.delaySec >= 1) repeatLoopState.delaySec = Math.min(3600, Math.floor(o.delaySec));
      notify();
    };
    const cs = (globalThis as { chrome?: { storage?: { local?: { get?: (k: string, cb: (r: Record<string, unknown>) => void) => void } } } }).chrome;
    if (cs?.storage?.local?.get) {
      cs.storage.local.get(STORAGE_KEY, function (result) { apply(result?.[STORAGE_KEY]); });
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) apply(JSON.parse(raw));
    }
  } catch (e) { log('Repeat: hydrate failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
}
hydrate();

function notify(): void {
  for (const fn of repeatLoopState.subscribers) {
    try { fn(); } catch (e) { log('Repeat: subscriber failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
  }
}

function readEditorText(): string {
  const target = findPasteTarget(getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
  if (!target) return '';
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    return target.value || '';
  }
  return (target.textContent || '');
}

function setEditorText(text: string): boolean {
  const target = findPasteTarget(getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
  if (!target) return false;

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
      || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (nativeSetter?.set) nativeSetter.set.call(target, text);
    else (target as HTMLInputElement).value = text;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // contenteditable
  const el = target as HTMLElement;
  el.focus();
  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  document.execCommand('delete', false);
  const ok = document.execCommand('insertText', false, text);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  return ok;
}

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/** Wait for the submit button to be present and enabled. */
async function waitForSubmitReady(maxMs: number): Promise<HTMLElement | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (repeatLoopState.cancelled) return null;
    const btn = findAddToTasksButton();
    if (btn && !(btn as HTMLButtonElement).disabled) return btn;
    await sleep(POLL_MS);
  }
  return null;
}

/** Wait until Lovable finishes processing (submit becomes disabled then re-enabled, or Return button visible→hidden). */
async function waitForCompletion(maxMs: number): Promise<void> {
  const deadline = Date.now() + maxMs;
  // Brief wait for state transition into "processing"
  await sleep(800);
  while (Date.now() < deadline) {
    if (repeatLoopState.cancelled) return;
    const btn = findAddToTasksButton();
    const processing = isReturnButtonVisible() || !btn || (btn as HTMLButtonElement).disabled;
    if (!processing) return;
    await sleep(POLL_MS);
  }
}

async function runRepeatLoopAsync(): Promise<void> {
  for (let i = repeatLoopState.completed; i < repeatLoopState.count; i++) {
    if (repeatLoopState.cancelled) break;

    if (!setEditorText(repeatLoopState.capturedText)) {
      showPasteToast('❌ Repeat: editor not found — stopped at ' + repeatLoopState.completed + '/' + repeatLoopState.count, true);
      break;
    }

    const btn = await waitForSubmitReady(MAX_WAIT_MS);
    if (!btn) {
      if (!repeatLoopState.cancelled) {
        showPasteToast('❌ Repeat: submit button never ready — stopped at ' + repeatLoopState.completed + '/' + repeatLoopState.count, true);
      }
      break;
    }

    btn.click();
    repeatLoopState.completed++;
    log('Repeat: iteration ' + repeatLoopState.completed + '/' + repeatLoopState.count + ' submitted', 'info');
    showPasteToast('🔁 Repeat: ' + repeatLoopState.completed + '/' + repeatLoopState.count, false);
    notify();

    if (repeatLoopState.completed >= repeatLoopState.count) break;
    if (repeatLoopState.waitMode === 'fixed-delay') {
      const ms = Math.max(1, repeatLoopState.delaySec) * 1000;
      const until = Date.now() + ms;
      while (Date.now() < until) {
        if (repeatLoopState.cancelled) break;
        await sleep(Math.min(POLL_MS, until - Date.now()));
      }
    } else {
      await waitForCompletion(MAX_WAIT_MS);
    }
  }

  const wasCancelled = repeatLoopState.cancelled;
  const done = repeatLoopState.completed;
  const total = repeatLoopState.count;
  repeatLoopState.running = false;
  repeatLoopState.cancelled = false;
  notify();

  if (wasCancelled) {
    showPasteToast('⏹ Repeat: stopped at ' + done + '/' + total, false);
  } else if (done >= total) {
    showPasteToast('✅ Repeat: completed ' + total + ' submissions', false);
  }
}

export function startRepeatLoop(): void {
  if (repeatLoopState.running) {
    log('Repeat: already running', 'warn');
    return;
  }
  // Per Ambiguity 126 follow-up (2026-06-19): empty chat box is allowed
  // — user explicitly chose "start anyway". No guard.
  const text = readEditorText();
  if (!text.trim()) {
    log('Repeat: starting with empty chat box (user-allowed)', 'warn');
  }
  const n = Math.max(1, Math.min(1000, Math.floor(repeatLoopState.count) || 1));
  repeatLoopState.count = n;
  repeatLoopState.capturedText = text;
  repeatLoopState.completed = 0;
  repeatLoopState.cancelled = false;
  repeatLoopState.running = true;
  notify();
  log('Repeat: starting ' + n + ' submissions of ' + text.length + ' chars', 'info');
  showPasteToast('🔁 Repeat: starting ' + n + ' submissions…', false);
  void runRepeatLoopAsync();
}

export function stopRepeatLoop(): void {
  if (!repeatLoopState.running) return;
  repeatLoopState.cancelled = true;
  log('Repeat: stop requested', 'warn');
  notify();
}

export function setRepeatCount(n: number): void {
  const v = Math.max(1, Math.min(1000, Math.floor(n) || 1));
  repeatLoopState.count = v;
  notify();
  persist();
}

export function setRepeatWaitMode(mode: RepeatWaitMode): void {
  repeatLoopState.waitMode = mode;
  notify();
  persist();
}

export function setRepeatDelaySec(sec: number): void {
  const v = Math.max(1, Math.min(3600, Math.floor(sec) || 1));
  repeatLoopState.delaySec = v;
  notify();
  persist();
}

// ─────────────────────────────────────────────
// UI building blocks
// ─────────────────────────────────────────────

function buildControl(opts: { compact: boolean }): HTMLElement {
  const root = document.createElement('div');
  const pad = opts.compact ? '4px 6px' : '6px 8px';
  root.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:' + pad + ';background:' + cSectionBg + ';border:1px solid rgba(124,58,237,0.25);border-radius:6px;font-family:system-ui,-apple-system,sans-serif;color:' + cPanelFg + ';font-size:11px;';

  const label = document.createElement('span');
  label.textContent = '🔁 Repeat';
  label.style.cssText = 'font-weight:600;color:' + cPrimaryLight + ';';
  root.appendChild(label);

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = '1000';
  input.value = String(repeatLoopState.count);
  input.style.cssText = 'width:60px;padding:3px 6px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';font-size:11px;';
  input.oninput = function () { setRepeatCount(parseInt(input.value, 10) || 1); };
  root.appendChild(input);

  for (const n of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(n);
    b.title = 'Set repeat count to ' + n;
    b.style.cssText = 'padding:2px 6px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';cursor:pointer;font-size:10px;';
    b.onclick = function () { setRepeatCount(n); };
    root.appendChild(b);
  }

  const progress = document.createElement('span');
  progress.style.cssText = 'font-size:10px;color:' + cPrimaryLight + ';margin-left:4px;min-width:42px;';
  root.appendChild(progress);

  const action = document.createElement('button');
  action.type = 'button';
  action.style.cssText = 'padding:4px 12px;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;color:#fff;background:' + cPrimary + ';margin-left:auto;';
  action.onclick = function () {
    if (repeatLoopState.running) stopRepeatLoop();
    else startRepeatLoop();
  };
  root.appendChild(action);

  function render(): void {
    input.value = String(repeatLoopState.count);
    input.disabled = repeatLoopState.running;
    if (repeatLoopState.running) {
      action.textContent = '⏹ Stop';
      action.style.background = '#dc2626';
      progress.textContent = repeatLoopState.completed + '/' + repeatLoopState.count;
    } else {
      action.textContent = '▶ Start';
      action.style.background = cPrimary;
      progress.textContent = repeatLoopState.completed > 0
        ? 'done ' + repeatLoopState.completed + '/' + repeatLoopState.count
        : '';
    }
  }
  render();
  repeatLoopState.subscribers.add(render);
  return root;
}

/** Macro-panel section (compact, sits in the panel body). */
export function buildRepeatPanelSection(): HTMLElement {
  return buildControl({ compact: true });
}

// ─────────────────────────────────────────────
// Inline strip above Lovable's chat textarea
// ─────────────────────────────────────────────

const INLINE_ID = 'marco-repeat-inline';

function tryMountInline(): boolean {
  if (document.getElementById(INLINE_ID)) return true;
  const target = findPasteTarget(getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
  if (!target) return false;
  // Mount above the closest form, falling back to the editor's parent.
  const host = (target.closest && target.closest('form')) || target.parentElement;
  if (!host || !host.parentElement) return false;
  const strip = buildControl({ compact: true });
  strip.id = INLINE_ID;
  strip.style.margin = '4px 0';
  host.parentElement.insertBefore(strip, host);
  log('Repeat: inline strip mounted above chat box', 'info');
  return true;
}

let _inlineObserver: MutationObserver | null = null;

export function mountRepeatInlineStrip(): void {
  if (tryMountInline()) return;
  if (_inlineObserver) return;
  _inlineObserver = new MutationObserver(function () {
    if (!document.getElementById(INLINE_ID) && tryMountInline()) {
      // Keep observing — Lovable re-renders the chat shell on route changes
      // and we want to remount when it disappears.
    }
  });
  _inlineObserver.observe(document.body, { childList: true, subtree: true });
}
