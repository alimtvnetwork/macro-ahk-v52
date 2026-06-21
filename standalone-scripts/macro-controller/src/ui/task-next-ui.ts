 
/**
 * MacroLoop Controller — Task Next Automation UI
 * Step 03e: Extracted from createUI() closure
 *
 * Automated multi-task prompt injection with configurable delays and retries.
 */

import { log, logSub } from '../logging';
import type { ResolvedPromptsConfig } from '../types';
import { showPasteToast, pasteIntoEditor } from './prompt-utils';

import { cPanelBg, cPanelFg, cPrimary, cPrimaryLight } from '../shared-state';
import { logError } from '../error-utils';
import { Label } from '../types';
/** Settings shape for Task Next */
export interface TaskNextSettings {
  [key: string]: TaskNextSettingValue;
  preClickDelayMs: number;
  postClickDelayMs: number;
  retryCount: number;
  retryDelayMs: number;
  buttonXPath: string;
  promptSlug: string;
  requireStartForMultiRun: boolean;
}

/** Concrete union of all setting value types — derived from TaskNextSettings */
export type TaskNextSettingValue = TaskNextSettings[keyof TaskNextSettings];

/** Mutable state for Task Next */
export const taskNextState: {
  settings: TaskNextSettings;
  running: boolean;
  cancelled: boolean;
  queue: {
    total: number;
    completed: number;
    running: boolean;
    startedAt: number;
  };
} = {
  settings: {
    preClickDelayMs: 500,
    postClickDelayMs: 2000,
    retryCount: 3,
    retryDelayMs: 1000,
    buttonXPath: '/html/body/div[3]/div/div[2]/main/div/div/div[1]/div/div[2]/div/form/div[2]/div/button[2]',
    promptSlug: Label.NextTasks,
    requireStartForMultiRun: true,
  },
  running: false,
  cancelled: false,
  queue: { total: 0, completed: 0, running: false, startedAt: 0 },
};

export interface TaskNextDeps {
  sendToExtension: (type: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  getPromptsConfig: () => ResolvedPromptsConfig;
  getByXPath: (xpath: string) => Element | null;
}

export function loadTaskNextSettings(deps: TaskNextDeps, cb?: () => void) {
  deps.sendToExtension('KV_GET', { key: 'task_next_settings', projectId: '_global' }).then(function(resp) {
    if (resp && resp.value) {
      try {
        const saved = JSON.parse(resp.value as string);
        for (const k of Object.keys(saved)) {
          if (k !== 'requireStartForMultiRun' && Object.prototype.hasOwnProperty.call(taskNextState.settings, k)) {
            taskNextState.settings[k] = saved[k];
          }
        }
        taskNextState.settings.requireStartForMultiRun = true;
      } catch (e) { log('Task Next: failed to parse saved settings — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
    }
    if (cb) {
      cb();
    }
  });
}

export function saveTaskNextSettings(deps: TaskNextDeps) {
  deps.sendToExtension('KV_SET', { key: 'task_next_settings', value: JSON.stringify(taskNextState.settings), projectId: '_global' }).then(function() {
    log('Task Next settings saved', 'info');
  });
}

export function findNextTasksPrompt(deps: TaskNextDeps) {
  const promptsCfg = deps.getPromptsConfig();
  const entries = promptsCfg.entries || [];
  const targetSlug = taskNextState.settings.promptSlug || Label.NextTasks;
  // Alias set — accept both the legacy ('next-tasks') and the renamed ('next-steps')
  // canonical slug. Persisted DB entries / older fallbacks may still use the old slug
  // even though Label.NextTasks now points at the new one.
  const aliases = new Set<string>([targetSlug, 'next-tasks', 'next-steps']);

  // Diagnostic: log slug/id of every entry to confirm fields survived the pipeline
  const slugMap = entries.map(function(e) { return e.name + ' → slug=' + (e.slug || '⚠️ MISSING') + ', id=' + (e.id || '—'); });
  log('Task Next: Resolving target="' + targetSlug + '" (aliases=' + Array.from(aliases).join(',') + ') across ' + entries.length + ' entries:\n  ' + slugMap.join('\n  '), 'info');

  // Priority 1: Exact slug field match against any alias
  for (const entry of entries) {
    const entrySlug = (entry.slug || '').toLowerCase();
    if (aliases.has(entrySlug)) {
      log('Task Next: Found prompt by slug field: "' + entry.name + '" (slug=' + entrySlug + ')', 'info');
      return entry;
    }
  }

  // Priority 2: Match by id field against any alias
  for (const entry of entries) {
    const id = (entry.id || '').toLowerCase();
    for (const alias of aliases) {
      if (id === alias || id === 'default-' + alias || id.indexOf(alias) !== -1) {
        log('Task Next: Found prompt by id: "' + entry.name + '" (id=' + entry.id + ', alias=' + alias + ')', 'info');
        return entry;
      }
    }
  }

  // Priority 3: Derive slug from name and match any alias
  for (const entry of entries) {
    const derivedSlug = (entry.name || '').toLowerCase().replace(/\s+/g, '-');
    if (aliases.has(derivedSlug)) {
      log('Task Next: Found prompt by derived name slug: "' + entry.name + '"', 'info');
      return entry;
    }
  }

  // Priority 4: Broader match — name contains "next" AND ("task" OR "step")
  for (const entry of entries) {
    const name = (entry.name || '').toLowerCase();
    if (name.indexOf('next') !== -1 && (name.indexOf('task') !== -1 || name.indexOf('step') !== -1)) {
      log('Task Next: Found prompt by name keywords: "' + entry.name + '"', 'info');
      return entry;
    }
  }

  // Last resort: DO NOT fall back to entries[0] — that caused the "Start Prompt" regression.
  log('Task Next: ❌ No prompt matched target slug "' + targetSlug + '" (aliases: next-tasks/next-steps) across ' + entries.length + ' entries. ' +
    'Ensure a prompt with slug "next-tasks" or "next-steps", or name containing "Next" + "Tasks"/"Steps", exists. Returning null — aborting.', 'error');
  return null;
}


/** Try to find the button via user-configured XPath. */
function findButtonByXPath(): HTMLElement | null {
  try {
    const result = document.evaluate(taskNextState.settings.buttonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const btn = result.singleNodeValue;
    if (btn && (btn as HTMLElement).tagName && !(btn as HTMLButtonElement).disabled) return btn as HTMLElement;
  } catch (e) { log('Task Next: XPath evaluation failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }
  return null;
}

/** Try to find the send/submit button via CSS selectors. */
function findButtonBySelectors(): HTMLElement | null {
  const sendSelectors = [
    'form button[type="submit"]',
    'form button:not([disabled]):last-of-type',
    'form button svg[data-testid="send-icon"]',
    'button[aria-label*="send" i]',
    'button[aria-label*="Send" i]',
    'button[data-testid*="send" i]',
    'form div[role="toolbar"] button:last-child',
    'form button:nth-child(2)',
  ];

  for (const selector of sendSelectors) {
    try {
      const el = document.querySelector(selector);
      if (!el) continue;

      const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
      if (!btn || (btn as HTMLButtonElement).disabled) continue;

      log('Task Next: Found submit button via selector: ' + selector, 'info');
      return btn as HTMLElement;
    } catch (e) { logSub('Task Next: querySelector failed for "' + selector + '": ' + (e instanceof Error ? e.message : String(e)), 1); }
  }

  return null;
}

export function findAddToTasksButton(): HTMLElement | null {
  return findButtonByXPath() || findButtonBySelectors();
}




export function runTaskNextLoop(deps: TaskNextDeps, count: number) {
  if (taskNextState.running) {
    log('Task Next: Already running', 'warn');
    return;
  }

  const prompt = findNextTasksPrompt(deps);

  if (!prompt || !prompt.text) {
    logError('Task Next', '"Next Tasks" prompt not found — aborting');
    showPasteToast('❌ "Next Tasks" prompt not found', true);
    return;
  }

  // PASTE-ONLY behaviour (v3.74.0): the Next button (and any "Next N steps"
  // preset) must only paste the prompt into the chat box. It must NOT click
  // the submit button and must NOT loop / chain follow-up tasks. Repeated
  // submissions belong exclusively to the Repeat `▶ Start` control.
  const requested = Math.max(1, Math.floor(count) || 1);
  if (requested > 1) {
    log('Task Next: multi-run blocked; pasting once only. Use Repeat Start for repeats.', 'warn');
  }

  const promptsCfg = deps.getPromptsConfig();
  const outcome = pasteIntoEditor(prompt.text, promptsCfg, deps.getByXPath);

  if (String(outcome) === 'failed') {
    logError('Task Next', 'Failed to inject prompt');
    showPasteToast('❌ Task Next: Injection failed', true);
    return;
  }

  log('Task Next: pasted prompt (no auto-submit)', 'info');
  showPasteToast('⏭ Task Next: pasted — click Submit to send', false);
}

/**
 * Submit the chat form — same primitive as `repeat-loop-ui.dispatchChatSubmit`.
 * Prefers `form#chat-input.requestSubmit()` over clicking the submit button so
 * Lovable's own form-level handler runs (avoids brittle XPath drift).
 */
function dispatchTaskNextSubmit(): boolean {
  const form = document.getElementById('chat-input');
  if (form instanceof HTMLFormElement) {
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return true;
  }
  const btn = findAddToTasksButton();
  if (btn && !(btn as HTMLButtonElement).disabled) {
    btn.click();
    return true;
  }
  return false;
}

/**
 * Sequential queue: paste prompt #1 → submit → await Lovable idle → paste #2 →
 * submit → await idle → … up to `count`. Cancellable via the existing Escape
 * handler (`setupTaskNextCancelHandler` flips `taskNextState.cancelled`).
 *
 * Fail-fast per `mem://constraints/no-retry-policy`: any failed cycle (paste,
 * submit, idle-timeout) aborts the rest and logs via `logError` with the
 * cycle index + total in the message.
 *
 * N === 1 delegates to the legacy paste-once `runTaskNextLoop` so the
 * split-button label keeps its v3.79.x behaviour (paste, do NOT submit).
 */
export async function runTaskNextQueue(deps: TaskNextDeps, count: number): Promise<void> {
  const n = Math.max(1, Math.floor(count) || 1);

  if (n === 1) {
    runTaskNextLoop(deps, 1);
    return;
  }

  if (taskNextState.running) {
    log('Task Next queue: already running — ignoring re-entry', 'warn');
    return;
  }

  const prompt = findNextTasksPrompt(deps);
  if (!prompt || !prompt.text) {
    logError('Task Next queue', '"Next Tasks" prompt not found — aborting queue of ' + n);
    showPasteToast('❌ "Next Tasks" prompt not found', true);
    return;
  }

  // Lazy import to dodge a circular dep (lovable-idle.ts → task-next-ui.ts for findAddToTasksButton).
  const { waitForLovableIdle } = await import('./lovable-idle');

  taskNextState.running = true;
  taskNextState.cancelled = false;
  taskNextState.queue = { total: n, completed: 0, running: true, startedAt: Date.now() };

  log('[TaskNextQueue] starting queue of ' + n + ' — Escape to cancel', 'info');
  showPasteToast('🔁 Task Next queue: 0/' + n + ' — Escape to cancel', false);

  try {
    for (let k = 0; k < n; k++) {
      if (taskNextState.cancelled) {
        showPasteToast('🛑 Task Next queue cancelled at ' + k + '/' + n, false);
        log('[TaskNextQueue] cancelled at cycle ' + k + '/' + n, 'warn');
        break;
      }

      const cycleStart = Date.now();
      const promptsCfg = deps.getPromptsConfig();
      const outcome = pasteIntoEditor(prompt.text, promptsCfg, deps.getByXPath);
      if (String(outcome) === 'failed') {
        logError('Task Next queue', 'cycle ' + (k + 1) + '/' + n + ' — paste failed; aborting queue');
        showPasteToast('❌ Task Next queue: paste failed at ' + (k + 1) + '/' + n, true);
        break;
      }

      if (!dispatchTaskNextSubmit()) {
        logError('Task Next queue', 'cycle ' + (k + 1) + '/' + n + ' — no form#chat-input and no submit button; aborting queue');
        showPasteToast('❌ Task Next queue: submit failed at ' + (k + 1) + '/' + n, true);
        break;
      }

      const idleResult = await waitForLovableIdle({
        isCancelled: function() { return taskNextState.cancelled; },
      });
      if (idleResult === 'cancelled') {
        showPasteToast('🛑 Task Next queue cancelled at ' + (k + 1) + '/' + n, false);
        log('[TaskNextQueue] cancelled mid-idle at cycle ' + (k + 1) + '/' + n, 'warn');
        break;
      }
      if (idleResult === 'timeout') {
        logError('Task Next queue', 'cycle ' + (k + 1) + '/' + n + ' — idle gate timed out after 10 min; aborting queue');
        showPasteToast('❌ Task Next queue: timed out waiting at ' + (k + 1) + '/' + n, true);
        break;
      }

      taskNextState.queue.completed = k + 1;
      log('[TaskNextQueue] cycle ' + (k + 1) + '/' + n + ' done in ' + (Date.now() - cycleStart) + 'ms', 'info');
      showPasteToast('🔁 Task Next queue: ' + (k + 1) + '/' + n, false);
    }

    if (!taskNextState.cancelled && taskNextState.queue.completed >= n) {
      showPasteToast('✅ Task Next queue finished ' + n + '/' + n, false);
      log('[TaskNextQueue] completed ' + n + '/' + n + ' in ' + (Date.now() - taskNextState.queue.startedAt) + 'ms', 'info');
    }
  } catch (err) {
    logError('Task Next queue', 'unexpected failure at cycle ' + (taskNextState.queue.completed + 1) + '/' + n, err);
    showPasteToast('❌ Task Next queue: unexpected error at ' + (taskNextState.queue.completed + 1) + '/' + n, true);
  } finally {
    taskNextState.queue.running = false;
    taskNextState.running = false;
    taskNextState.cancelled = false;
  }
}

// Escape key cancel handler — call once at init
export function setupTaskNextCancelHandler() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && taskNextState.running) {
      taskNextState.cancelled = true;
      log('Task Next: Cancel requested via Escape', 'info');
    }
  });
}

// eslint-disable-next-line max-lines-per-function
export function openTaskNextSettingsModal(deps: TaskNextDeps) {
  const existing = document.getElementById('marco-tasknext-settings');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'marco-tasknext-settings';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000010;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:' + cPanelBg + ';border:1px solid ' + cPrimary + ';border-radius:12px;width:400px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,0.8);';

  const title = document.createElement('div');
  title.textContent = '⚙ Task Next Settings';
  title.style.cssText = 'font-size:14px;font-weight:700;color:' + cPanelFg + ';margin-bottom:16px;';
  modal.appendChild(title);

  const fields = [
    { key: 'preClickDelayMs', label: 'Pre-click delay (ms)', type: 'number' },
    { key: 'postClickDelayMs', label: 'Post-click delay (ms)', type: 'number' },
    { key: 'retryCount', label: 'Retry count', type: 'number' },
    { key: 'retryDelayMs', label: 'Retry delay (ms)', type: 'number' },
    { key: 'buttonXPath', label: 'Button XPath', type: 'text' },
    { key: 'promptSlug', label: 'Prompt slug', type: 'text' },
  ];

  const inputs: Record<string, HTMLInputElement> = {};
  for (const field of fields) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:10px;';
    const lbl = document.createElement('label');
    lbl.textContent = field.label;
    lbl.style.cssText = 'display:block;font-size:10px;color:' + cPrimaryLight + ';margin-bottom:3px;';
    row.appendChild(lbl);
    const inp = document.createElement('input');
    inp.type = field.type;
    if (field.type === 'checkbox') {
      inp.checked = taskNextState.settings[field.key] === true;
    } else {
      inp.value = String(taskNextState.settings[field.key]);
    }
    inp.style.cssText = 'width:100%;padding:6px 8px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:6px;color:' + cPanelFg + ';font-size:11px;box-sizing:border-box;';
    row.appendChild(inp);
    modal.appendChild(row);
    inputs[field.key] = inp;
  }

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'padding:6px 16px;border:1px solid rgba(124,58,237,0.3);border-radius:6px;background:transparent;color:' + cPanelFg + ';cursor:pointer;font-size:11px;';
  cancelBtn.onclick = function() { overlay.remove(); };
  btnRow.appendChild(cancelBtn);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'padding:6px 16px;border:none;border-radius:6px;background:' + cPrimary + ';color:#fff;cursor:pointer;font-size:11px;font-weight:600;';
  saveBtn.onclick = function() {
    taskNextState.settings.preClickDelayMs = parseInt(inputs.preClickDelayMs.value) || 500;
    taskNextState.settings.postClickDelayMs = parseInt(inputs.postClickDelayMs.value) || 2000;
    taskNextState.settings.retryCount = parseInt(inputs.retryCount.value) || 3;
    taskNextState.settings.retryDelayMs = parseInt(inputs.retryDelayMs.value) || 1000;
    taskNextState.settings.buttonXPath = inputs.buttonXPath.value || taskNextState.settings.buttonXPath;
    taskNextState.settings.promptSlug = inputs.promptSlug.value || Label.NextTasks;
    taskNextState.settings.requireStartForMultiRun = true;
    saveTaskNextSettings(deps);
    overlay.remove();
    showPasteToast('✅ Task Next settings saved', false);
  };
  btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  overlay.appendChild(modal);
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  };
  document.body.appendChild(overlay);
}
