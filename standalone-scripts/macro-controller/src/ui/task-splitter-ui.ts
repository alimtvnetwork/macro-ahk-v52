/**
 * Task Splitter UI — paste one long instruction, break it into N steps,
 * then walk through them (manual Next ▶ or timed auto-run).
 *
 * Mounts as a collapsible section inside the macro-controller panel,
 * next to the Repeat-loop section. UX answers (2026-06-24):
 *   • Split prompt   = `Plan ${N}` (overridable via dropdown)
 *   • Per-step prompt = `Next ${N} steps` (overridable via dropdown)
 *   • Splitting      = sends `[pasted text]\n\n[split prompt text]` once
 *   • Delay presets  = 2 / 5 / 10 / 15 / 30 / 60 s
 *   • Mount          = inside the existing Macro Controller panel
 *
 * Send mechanism reuses Task Next's primitives:
 *   pasteIntoEditor() → form#chat-input.requestSubmit().
 */

import { log } from '../logging';
import { logError } from '../error-utils';
import { showPasteToast, pasteIntoEditor, findPasteTarget } from './prompt-utils';
import { getPromptsConfig } from './prompt-manager';
import { getByXPath, isReturnButtonVisible } from '../xpath-utils';
import { findAddToTasksButton } from './task-next-ui';
import { cPanelFg, cPrimaryLight, cSectionBg } from '../shared-state';
import type { PromptEntry } from '../types';
import { getSplitterPrompt } from './task-splitter-prompt';
import { parseSplitterSubtasks, SplitterParseError } from './task-splitter-parse';
import { readLatestSplitterReply } from './task-splitter-dom';
import { waitForLovableIdle } from './lovable-idle';
import { getPersistentTaskQueue, resolveTaskQueueProjectId } from '../queue-control/task-queue-project-store';
import { getSettingsOverrides } from '../settings-store';


const DELAY_PRESETS_SEC = [2, 5, 10, 15, 30, 60] as const;
const STEP_MIN = 2;
const STEP_MAX = 20;
const STEP_DEFAULT = 5;
const DELAY_DEFAULT = 15;
const STORAGE_KEY = 'marco-task-splitter-prefs';
const POLL_MS = 500;
const MAX_WAIT_MS = 10 * 60 * 1000;
const ROW_STYLE = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';

interface SplitterState {
  bigText: string;
  stepCount: number;
  delaySec: number;
  splitPromptSlug: string;   // empty = auto (plan-${N})
  perStepPromptSlug: string; // empty = auto (next-${N}-steps)
  running: boolean;
  cancelled: boolean;
  completed: number;
  collapsed: boolean;
  subscribers: Set<() => void>;
  phaseDeadlineAt: number;
}

const state: SplitterState = {
  bigText: '',
  stepCount: STEP_DEFAULT,
  delaySec: DELAY_DEFAULT,
  splitPromptSlug: '',
  perStepPromptSlug: '',
  running: false,
  cancelled: false,
  completed: 0,
  collapsed: false,
  subscribers: new Set(),
  phaseDeadlineAt: 0,
};

function persist(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: 1,
      bigText: state.bigText,
      stepCount: state.stepCount,
      delaySec: state.delaySec,
      splitPromptSlug: state.splitPromptSlug,
      perStepPromptSlug: state.perStepPromptSlug,
      collapsed: state.collapsed,
    }));
  } catch (e) { log('TaskSplitter: persist failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
}

function hydrate(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const o = JSON.parse(raw) as Partial<SplitterState>;
    if (typeof o.bigText === 'string') state.bigText = o.bigText;
    if (typeof o.stepCount === 'number') state.stepCount = clamp(o.stepCount, STEP_MIN, STEP_MAX);
    if (typeof o.delaySec === 'number') state.delaySec = clamp(o.delaySec, 1, 3600);
    if (typeof o.splitPromptSlug === 'string') state.splitPromptSlug = o.splitPromptSlug;
    if (typeof o.perStepPromptSlug === 'string') state.perStepPromptSlug = o.perStepPromptSlug;
    if (typeof o.collapsed === 'boolean') state.collapsed = o.collapsed;
  } catch (e) { log('TaskSplitter: hydrate failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
}
hydrate();

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n) || lo));
}

function notify(): void {
  for (const s of state.subscribers) {
    try { s(); } catch (e) { log('TaskSplitter: subscriber failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
  }
}

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

// ── prompt resolution ───────────────────────────────────────────────

function findPromptBySlug(slug: string): PromptEntry | null {
  const entries = getPromptsConfig().entries || [];
  const target = slug.toLowerCase();
  for (const e of entries) {
    if ((e.slug || '').toLowerCase() === target) return e;
  }
  // Substring fallback for legacy/derived slugs
  for (const e of entries) {
    if ((e.slug || '').toLowerCase().indexOf(target) !== -1) return e;
  }
  return null;
}

function resolvePerStepPrompt(): PromptEntry | null {
  if (state.perStepPromptSlug) {
    const p = findPromptBySlug(state.perStepPromptSlug);
    if (p) return p;
  }
  // Auto: next-${N}-steps (cap at 8 — the dropdown's max variant)
  const n = Math.min(state.stepCount, 8);
  return findPromptBySlug('next-' + n + '-steps')
      || findPromptBySlug('next-steps');
}

// ── chat submit (mirrors repeat-loop-ui.dispatchChatSubmit) ─────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function getChatForm(TAG: string): HTMLElement | null {
  try { return document.getElementById('chat-input'); }
  catch (e) {
    const m = errMsg(e);
    showPasteToast('⚠ ' + TAG + ': getElementById threw (' + m + ') — trying button', true);
    log('TaskSplitter: getElementById threw — ' + m, 'warn');
    return null;
  }
}

function trySubmitForm(TAG: string, form: HTMLElement | null): boolean {
  if (form instanceof HTMLFormElement) {
    try {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else {
        showPasteToast('⚠ ' + TAG + ': requestSubmit unsupported — using submit event', false);
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
      return true;
    } catch (e) {
      const m = errMsg(e);
      showPasteToast('⚠ ' + TAG + ': requestSubmit failed (' + m + ') — falling back to button click', true);
      logError('TaskSplitter', 'form#chat-input.requestSubmit() threw — falling back to button click', e);
    }
  } else if (form) {
    showPasteToast('⚠ ' + TAG + ': #chat-input is <' + form.tagName.toLowerCase() + '>, not <form> — using button', true);
    log('TaskSplitter: #chat-input exists but is not <form> (got ' + form.tagName + ')', 'warn');
  } else {
    showPasteToast('⚠ ' + TAG + ': no #chat-input form — using button fallback', true);
  }
  return false;
}

function trySubmitButton(TAG: string): boolean {
  let btn: HTMLElement | null = null;
  try { btn = findAddToTasksButton(); }
  catch (e) { logError('TaskSplitter', 'findAddToTasksButton threw', e); }
  if (!btn || (btn as HTMLButtonElement).disabled) {
    showPasteToast('❌ ' + TAG + ': no enabled submit button found — submit failed', true);
    return false;
  }
  try {
    btn.click();
    showPasteToast('✅ ' + TAG + ': submitted via submit-button fallback', false);
    return true;
  } catch (e) {
    const m = errMsg(e);
    showPasteToast('❌ ' + TAG + ': button click threw (' + m + ')', true);
    logError('TaskSplitter', 'submit-button .click() threw', e);
    return false;
  }
}

function dispatchSubmit(): boolean {
  const TAG = 'Splitter';
  if (typeof document === 'undefined' || !document.body) {
    showPasteToast('❌ ' + TAG + ': submit aborted — document not ready', true);
    log('TaskSplitter: submit aborted — document/body not available', 'warn');
    return false;
  }
  const form = getChatForm(TAG);
  if (trySubmitForm(TAG, form)) return true;
  if (trySubmitButton(TAG)) return true;
  log('TaskSplitter: submit failed — no form#chat-input and no enabled submit button', 'warn');
  return false;
}


async function pasteAndSubmit(text: string): Promise<boolean> {
  try {
    const promptsConfig = getPromptsConfig();
    const outcome = await pasteIntoEditor(text, promptsConfig, (xp) => getByXPath(xp) as Element | null);
    if (String(outcome) === 'failed') {
      log('TaskSplitter: pasteIntoEditor returned failed', 'warn');
      return false;
    }
    // small grace for editor to settle, then submit
    await sleep(200);
    return dispatchSubmit();
  } catch (e) {
    logError('TaskSplitter', 'pasteAndSubmit threw', e);
    return false;
  }
}

async function waitForCompletion(maxMs: number): Promise<void> {
  const deadline = Date.now() + maxMs;
  await sleep(800);
  while (Date.now() < deadline) {
    if (state.cancelled) return;
    const btn = findAddToTasksButton();
    const processing = isReturnButtonVisible() || !btn || (btn as HTMLButtonElement).disabled;
    if (!processing) return;
    await sleep(POLL_MS);
  }
}

// ── actions ─────────────────────────────────────────────────────────

function readEditorText(): string {
  try {
    const target = findPasteTarget(getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
    if (!target) return '';
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return target.value || '';
    return (target.textContent || '');
  } catch (e) { log('TaskSplitter: readEditorText failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); return ''; }
}

async function breakIntoSteps(): Promise<void> {
  if (state.running) {
    showPasteToast('⏸ Task Splitter is already running', true);
    return;
  }
  const text = readEditorText().trim();
  if (!text) {
    showPasteToast('❌ Task Splitter: type your instruction in the Lovable chat box first', true);
    return;
  }
  state.bigText = text;
  state.running = true;
  state.cancelled = false;
  notify();
  try {
    await sendSplitterPromptAndQueue(text, state.stepCount);
  } finally {
    state.running = false;
    state.cancelled = false;
    notify();
  }
}

async function sendSplitterPromptAndQueue(text: string, expectedN: number): Promise<void> {
  const prompt = getSplitterPrompt({ rawInstruction: text, n: expectedN });
  log('TaskSplitter: sending split JSON prompt (' + prompt.length + ' chars, n=' + expectedN + ')', 'info');
  const ok = await pasteAndSubmit(prompt);
  if (!ok) { showPasteToast('❌ Task Splitter: paste/submit failed', true); return; }
  showPasteToast('✂ Task Splitter: split sent — waiting for JSON reply', false);
  const idle = await waitForLovableIdle({ isCancelled: function () { return state.cancelled; } });
  if (idle !== 'idle') { showPasteToast('❌ Task Splitter: idle wait ' + idle, true); return; }
  await parseAndEnqueueLatestReply(expectedN);
}

async function parseAndEnqueueLatestReply(expectedN: number): Promise<void> {
  try {
    const rawReply = readLatestSplitterReply(document);
    const subtasks = parseSplitterSubtasks(rawReply, expectedN);
    const overrides = getSettingsOverrides();
    if (overrides.splitterAutoEnqueue === false) {
      log('TaskSplitter: auto-enqueue disabled — parsed ' + subtasks.length + ' subtasks, skipped enqueue', 'info');
      showPasteToast('ℹ Task Splitter: parsed ' + subtasks.length + ' (auto-enqueue off)', false);
      return;
    }
    const projectId = resolveTaskQueueProjectId();
    const maxQueueSize = overrides.maxQueueSize;
    const added = await getPersistentTaskQueue().enqueueMany(
      projectId,
      subtasks,
      maxQueueSize ? { maxQueueSize } : undefined,
    );
    log('TaskSplitter: enqueued ' + added.length + '/' + expectedN + ' tasks for project ' + projectId, 'info');
    showPasteToast('✅ Task Splitter: queued ' + added.length + ' tasks', false);
  } catch (caught: CaughtError) {
    reportSplitterParseFailure(caught, expectedN);
  }
}


function reportSplitterParseFailure(caught: CaughtError, expectedN: number): void {
  if (caught instanceof SplitterParseError) {
    logError('TaskSplitter.parse', JSON.stringify(caught.failure), caught);
    showPasteToast('❌ Splitter parse failed (got ' + caught.failure.ReceivedN + ' of ' + expectedN + ')', true);
    return;
  }
  logError('TaskSplitter.parse', 'Unexpected splitter queue failure for ExpectedN=' + expectedN, caught);
  showPasteToast('❌ Splitter parse failed (got 0 of ' + expectedN + ')', true);
}

async function sendOneStep(): Promise<boolean> {
  const per = resolvePerStepPrompt();
  if (!per || !per.text) {
    logError('TaskSplitter', 'per-step prompt not found (slug="' + state.perStepPromptSlug + '" / auto next-${N}-steps)');
    showPasteToast('❌ Task Splitter: per-step prompt not found', true);
    return false;
  }
  const ok = await pasteAndSubmit(per.text);
  if (!ok) { showPasteToast('❌ Task Splitter: paste/submit failed', true); return false; }
  state.completed++;
  notify();
  showPasteToast('▶ Task Splitter: ' + state.completed + '/' + state.stepCount, false);
  return true;
}

async function manualNext(): Promise<void> {
  if (state.running) { showPasteToast('⏸ Auto-run is active — stop it first', true); return; }
  await sendOneStep();
}

async function runAuto(): Promise<void> {
  if (state.running) return;
  state.running = true;
  state.cancelled = false;
  notify();
  log('TaskSplitter: auto-run starting (' + state.stepCount + ' steps, ' + state.delaySec + 's delay)', 'info');
  try {
    while (state.completed < state.stepCount && !state.cancelled) {
      const ok = await sendOneStep();
      if (!ok) break;
      if (state.completed >= state.stepCount) break;
      // Wait for Lovable to finish, then fixed delay
      await waitForCompletion(MAX_WAIT_MS);
      if (state.cancelled) break;
      const delayMs = state.delaySec * 1000;
      state.phaseDeadlineAt = Date.now() + delayMs;
      notify();
      const until = Date.now() + delayMs;
      while (Date.now() < until && !state.cancelled) {
        await sleep(Math.min(POLL_MS, until - Date.now()));
        notify();
      }
    }
  } finally {
    const cancelled = state.cancelled;
    const done = state.completed;
    const total = state.stepCount;
    state.running = false;
    state.cancelled = false;
    state.phaseDeadlineAt = 0;
    notify();
    if (cancelled) showPasteToast('⏹ Task Splitter: stopped at ' + done + '/' + total, false);
    else if (done >= total) showPasteToast('✅ Task Splitter: completed ' + total + ' steps', false);
  }
}

function stopAuto(): void {
  if (!state.running) return;
  state.cancelled = true;
  notify();
}

function resetCounter(): void {
  if (state.running) return;
  state.completed = 0;
  notify();
}

// ── UI ──────────────────────────────────────────────────────────────

function makeInput(value: string, width: string): HTMLInputElement {
  const i = document.createElement('input');
  i.value = value;
  i.style.cssText = 'width:' + width + ';padding:3px 6px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';font-size:11px;';
  return i;
}

function makeSelect(): HTMLSelectElement {
  const s = document.createElement('select');
  s.style.cssText = 'padding:3px 6px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';font-size:11px;max-width:170px;';
  return s;
}

function makeBtn(label: string, primary: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  const bg = primary
    ? 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#2563eb 100%)'
    : 'rgba(124,58,237,0.18)';
  const shadow = primary
    ? '0 2px 6px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.18)'
    : 'none';
  b.style.cssText = 'padding:4px 10px;border:1px solid rgba(124,58,237,0.3);border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;color:#fff;background:' + bg + ';box-shadow:' + shadow + ';';
  return b;
}

function populatePromptSelect(sel: HTMLSelectElement, currentSlug: string, autoLabel: string): void {
  sel.innerHTML = '';
  const auto = document.createElement('option');
  auto.value = '';
  auto.textContent = autoLabel;
  sel.appendChild(auto);
  const entries = getPromptsConfig().entries || [];
  // Group by parent title so the giant `Plan ${N}` / `Next ${N} steps` variant lists fold up.
  const seenParents = new Set<string>();
  for (const e of entries) {
    const slug = e.slug || '';
    if (!slug) continue;
    const o = document.createElement('option');
    o.value = slug;
    const label = e.parentTitle && e.variantValue
      ? e.parentTitle.replace('${' + (e.replaceKey || 'N') + '}', e.variantValue) + ' — ' + slug
      : (e.name || slug);
    o.textContent = label;
    sel.appendChild(o);
    if (e.parentSlug) seenParents.add(e.parentSlug);
  }
  sel.value = currentSlug;
}

// eslint-disable-next-line max-lines-per-function
function buildControl(): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:6px 8px;background:' + cSectionBg + ';border:1px solid rgba(124,58,237,0.25);border-radius:6px;font-family:system-ui,-apple-system,sans-serif;color:' + cPanelFg + ';font-size:11px;display:flex;flex-direction:column;gap:6px;';

  // Header (toggle collapse)
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;';
  const title = document.createElement('span');
  title.textContent = '✂️ Task Splitter';
  title.style.cssText = 'font-weight:600;color:' + cPrimaryLight + ';flex:1;';
  const chevron = document.createElement('span');
  chevron.style.cssText = 'font-size:10px;opacity:0.7;';
  const progress = document.createElement('span');
  progress.style.cssText = 'font-size:10px;color:' + cPrimaryLight + ';';
  header.appendChild(title);
  header.appendChild(progress);
  header.appendChild(chevron);
  header.onclick = function () { state.collapsed = !state.collapsed; persist(); notify(); };
  root.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  // Hint — text is read live from Lovable's own chat box (no second editor).
  const hint = document.createElement('div');
  hint.textContent = '↳ Reads the instruction directly from the Lovable chat box.';
  hint.style.cssText = 'font-size:10px;opacity:0.7;font-style:italic;';
  body.appendChild(hint);


  // Row 1: N + Delay
  const row1 = document.createElement('div');
  row1.style.cssText = ROW_STYLE;
  const nLbl = document.createElement('span'); nLbl.textContent = 'Steps'; nLbl.style.opacity = '0.8';
  const nInput = makeInput(String(state.stepCount), '50px');
  nInput.type = 'number'; nInput.min = String(STEP_MIN); nInput.max = String(STEP_MAX);
  nInput.oninput = function () {
    state.stepCount = clamp(parseInt(nInput.value, 10), STEP_MIN, STEP_MAX);
    persist(); notify();
  };
  const dLbl = document.createElement('span'); dLbl.textContent = 'Delay'; dLbl.style.opacity = '0.8'; dLbl.style.marginLeft = '6px';
  const dSel = makeSelect();
  for (const s of DELAY_PRESETS_SEC) {
    const o = document.createElement('option'); o.value = String(s); o.textContent = s + 's'; dSel.appendChild(o);
  }
  dSel.value = String(state.delaySec);
  dSel.onchange = function () { state.delaySec = parseInt(dSel.value, 10) || DELAY_DEFAULT; persist(); };
  row1.appendChild(nLbl); row1.appendChild(nInput);
  row1.appendChild(dLbl); row1.appendChild(dSel);
  body.appendChild(row1);

  // Row 2: Split prompt
  const row2 = document.createElement('div');
  row2.style.cssText = ROW_STYLE;
  const sLbl = document.createElement('span'); sLbl.textContent = 'Split'; sLbl.style.opacity = '0.8';
  const sSel = makeSelect();
  sSel.style.flex = '1';
  populatePromptSelect(sSel, state.splitPromptSlug, '⚙ Auto: Plan ${N}');
  sSel.onchange = function () { state.splitPromptSlug = sSel.value; persist(); };
  row2.appendChild(sLbl); row2.appendChild(sSel);
  body.appendChild(row2);

  // Row 3: Per-step prompt
  const row3 = document.createElement('div');
  row3.style.cssText = ROW_STYLE;
  const pLbl = document.createElement('span'); pLbl.textContent = 'Step'; pLbl.style.opacity = '0.8';
  const pSel = makeSelect();
  pSel.style.flex = '1';
  populatePromptSelect(pSel, state.perStepPromptSlug, '⚙ Auto: Next ${N} steps');
  pSel.onchange = function () { state.perStepPromptSlug = pSel.value; persist(); };
  row3.appendChild(pLbl); row3.appendChild(pSel);
  body.appendChild(row3);

  // Row 4: action buttons
  const row4 = document.createElement('div');
  row4.style.cssText = ROW_STYLE;
  const breakBtn = makeBtn('✂ Break into steps', true);
  breakBtn.onclick = function () { void breakIntoSteps(); };
  const nextBtn = makeBtn('▶ Next', false);
  nextBtn.onclick = function () { void manualNext(); };
  const autoBtn = makeBtn('⏱ Start auto-run', false);
  autoBtn.onclick = function () {
    if (state.running) stopAuto();
    else void runAuto();
  };
  const resetBtn = makeBtn('↺', false);
  resetBtn.title = 'Reset step counter';
  resetBtn.onclick = function () { resetCounter(); };
  row4.appendChild(breakBtn);
  row4.appendChild(nextBtn);
  row4.appendChild(autoBtn);
  row4.appendChild(resetBtn);
  body.appendChild(row4);

  root.appendChild(body);

  const render = (): void => {
    body.style.display = state.collapsed ? 'none' : 'flex';
    chevron.textContent = state.collapsed ? '▸' : '▾';
    nInput.disabled = state.running;
    nInput.value = String(state.stepCount);
    dSel.disabled = state.running;
    dSel.value = String(state.delaySec);
    breakBtn.disabled = state.running;
    nextBtn.disabled = state.running;
    if (state.running) {
      autoBtn.textContent = '⏹ Stop';
      const remain = Math.max(0, Math.ceil((state.phaseDeadlineAt - Date.now()) / 1000));
      const timer = state.phaseDeadlineAt > 0 && remain > 0 ? ' • next in ' + remain + 's' : '';
      progress.textContent = state.completed + '/' + state.stepCount + timer;
    } else {
      autoBtn.textContent = '⏱ Start auto-run';
      progress.textContent = state.completed > 0
        ? 'done ' + state.completed + '/' + state.stepCount
        : '';
    }
  };
  render();
  state.subscribers.add(render);

  const tickId = setInterval(function () {
    if (!document.body.contains(root)) { clearInterval(tickId); return; }
    if (state.running) render();
  }, 1000);

  return root;
}

/** Public mount point — invoked from panel-builder. */
export function buildTaskSplitterPanelSection(): HTMLElement {
  return buildControl();
}

/**
 * External trigger — used by the inline "✂ Split" button above the chat box.
 * Updates the step count, then runs the same break-into-steps flow as the
 * panel's "✂ Break into steps" button.
 */
export async function triggerSplitFromInline(stepCount: number): Promise<void> {
  const n = clamp(stepCount, STEP_MIN, STEP_MAX);
  if (n !== state.stepCount) {
    state.stepCount = n;
    persist();
    notify();
  }
  await breakIntoSteps();
}

export function isSplitterRunning(): boolean {
  return state.running;
}

