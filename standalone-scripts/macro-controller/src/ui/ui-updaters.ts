/**
 * MacroLoop Controller — UI Update Functions
 * Step 2b: Extracted from macro-looping.ts
 *
 * Phase 5 split: Status rendering moved to ui-status-renderer.ts.
 * This file is the orchestrator + barrel re-export.
 *
 * @see spec/04-macro-controller/ts-migration-v2/05-module-splitting.md
 */

import { MacroController } from '../core/MacroController';
import { nsWrite, nsCallTyped } from '../api-namespace';
import { clearSkeletons } from './skeleton';
import { cacheWorkspaceName } from '../workspace-cache';
import { isInvalidWorkspaceCandidateName } from '../ws-name-matching';
import { getTitleBarDisplayState } from './title-bar-display';

function mc() { return MacroController.getInstance(); }
import { IDS, TIMING, state, loopCreditState } from '../shared-state';
import { log } from '../logging';
import { runCycle } from '../loop-engine';
import { trackedSetInterval, trackedClearInterval } from '../interval-registry';
import { domCache } from '../dom-cache';

// Re-export status renderer symbols
export { updateStatus, updateRecordIndicator, statusRenderStats, updateQueueBadge } from './ui-status-renderer';
import { updateStatus, updateRecordIndicator } from './ui-status-renderer';

/**
 * Master UI refresh — calls all sub-updaters and repopulates workspace dropdown.
 * Use this when credit data or workspace identity changes.
 */
export function updateUI(): void {
  updateStatus();
  updateButtons();
  updateRecordIndicator();
  mc().ui?.populateDropdown();
  updateTitleBarWorkspaceName();

  // Persist workspace name to localStorage for instant UI on next load
  if (state.workspaceName && !state.workspaceFromCache && !isInvalidWorkspaceCandidateName(state.workspaceName)) {
    cacheWorkspaceName(
      state.workspaceName,
      loopCreditState.currentWs ? loopCreditState.currentWs.id : undefined,
    );
  }
  // Clear the "from cache" flag once real data arrives
  if (state.workspaceFromApi) {
    state.workspaceFromCache = false;
  }
}

/**
 * Lightweight UI refresh — updates status panel, buttons, and record indicator
 * WITHOUT rebuilding the workspace dropdown list.
 */
export function updateUILight(): void {
  updateStatus();
  updateButtons();
  updateRecordIndicator();
  updateTitleBarWorkspaceName();
}

/**
 * @deprecated — Removed: `loop-project-name` element no longer exists.
 * Workspace/project name is shown exclusively via `loop-title-ws-name` (wsNameEl).
 * Keeping as no-op to prevent runtime errors from any remaining callers.
 */
export function updateProjectNameDisplay(): void {
  // Intentionally empty — the `loop-project-name` element was removed to fix
  // the duplicate project name regression. See spec/22-app-issues/project-name-duplication-rca.md
}

/**
 * Update project name badge in title bar.
 */
export function updateTitleBarWorkspaceName(): void {
  const el = document.getElementById('loop-title-ws-name');
  if (!el) return;

  clearSkeletons(el);

  const syncIcon = document.getElementById('loop-ws-sync-icon');
  if (syncIcon) syncIcon.remove();

  const titleBarState = getTitleBarDisplayState();
  el.textContent = titleBarState.text;
  el.style.color = titleBarState.color;
  el.style.opacity = titleBarState.opacity;
  el.style.fontSize = titleBarState.fontSize;
  el.style.fontWeight = titleBarState.fontWeight;
  el.title = titleBarState.title;
}

/**
 * Sync the start/stop button visual state.
 */
export function updateButtons(): void {
  nsCallTyped('_internal.updateStartStopBtn', !!state.running);

  const stopBtn = document.getElementById(IDS.STOP_BTN);
  if (stopBtn) {
    (stopBtn as HTMLButtonElement).disabled = !state.running;
    stopBtn.style.opacity = state.running ? '1' : '0.5';
    stopBtn.style.cursor = state.running ? 'pointer' : 'not-allowed';
  }
}

/**
 * Button click animation — color flash only, no scale (v1.56).
 */
export function animateBtn(btn: HTMLElement): void {
  if (!btn) return;
  const origBg = btn.style.background || '';
  btn.style.transition = 'filter 100ms ease, background 150ms ease, opacity 100ms ease';
  btn.style.filter = 'brightness(0.75)';
  btn.style.opacity = '0.7';
  setTimeout(function() {
    btn.style.filter = 'brightness(1.2)';
    btn.style.opacity = '1';
    setTimeout(function() {
      btn.style.filter = '';
      btn.style.background = origBg;
    }, 180);
  }, 100);
}

/**
 * Consistent hover feedback — color transition only, no scale/translate (v1.56).
 */
export function attachButtonHoverFx(btn: HTMLElement): void {
  if (!btn) return;
  btn.style.transition = 'filter 150ms ease, background-color 150ms ease, box-shadow 150ms ease';
  btn.onmouseenter = function() {
    if ((btn as HTMLButtonElement).disabled) return;
    btn.style.filter = 'brightness(1.12)';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,.3)';
  };
  btn.onmouseleave = function() {
    btn.style.filter = '';
    btn.style.boxShadow = '';
  };
}

/**
 * Set loop interval dynamically (called from AHK).
 */
export function setLoopInterval(newIntervalMs: number): boolean {
  const oldInterval = TIMING.LOOP_INTERVAL;
  TIMING.LOOP_INTERVAL = newIntervalMs;
  log('Interval changed: ' + oldInterval + 'ms -> ' + newIntervalMs + 'ms', 'success');

  state.countdown = Math.floor(newIntervalMs / 1000);

  if (state.running && state.loopIntervalId) {
    trackedClearInterval(state.loopIntervalId);
    state.loopIntervalId = trackedSetInterval('LoopControls.cycle', runCycle, newIntervalMs);
    log('Loop timer restarted with new interval');
  }

  updateUI();
  return true;
}

/**
 * Fully destroy the controller panel and clean up globals for re-injection.
 *
 * v3.18.0 fix: also tear down the MacroController singleton so re-running
 * the script in the same page builds a fresh instance.
 *
 * v3.60.0 fix (close→reinject bug): teardown was leaving stale satellite
 * state behind, so re-injection showed only the toast and never rebuilt the
 * panel. We now also:
 *   - remove the record indicator + inline repeat strip (their idempotency
 *     guards would otherwise skip rebuild on second injection),
 *   - reset `window.__marcoRouteGuardInstalled` so `installSpaRouteGuard()`
 *     actually re-installs on the next bootstrap,
 *   - invalidate `domCache` so the new `createUI()` cannot reuse a detached
 *     XPath result and append the panel into an orphaned node,
 *   - drop the stale `_internal.createUIWrapper` / `_internal.createUIManager`
 *     factories so a fresh IIFE always wires its own panel-builder deps.
 *
 * See: .lovable/memory/features/macro-controller/close-then-reinject.md and
 * spec/22-app-issues/12-controller-reinject-after-close.md
 */
export function destroyPanel(): void {
  log('MacroLoop panel DESTROYED by user — remove marker + globals for clean re-inject', 'warn');
  nsWrite('_internal.destroyed', true);

  try { nsCallTyped('api.loop.stop'); } catch (e) { log('destroyPanel: loop stop failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }

  const marker = document.getElementById(IDS.SCRIPT_MARKER);
  if (marker) marker.remove();
  const container = document.getElementById(IDS.CONTAINER);
  if (container) container.remove();

  // v3.60.0: also remove satellite elements with their own idempotency guards
  const recordIndicator = document.getElementById(IDS.RECORD_INDICATOR);
  if (recordIndicator) recordIndicator.remove();
  const inlineRepeat = document.getElementById('marco-repeat-inline');
  if (inlineRepeat) inlineRepeat.remove();

  // v3.60.0: clear SPA route-guard sentinel so the next bootstrap re-installs it
  try {
    (window as unknown as { __marcoRouteGuardInstalled?: boolean }).__marcoRouteGuardInstalled = false;
  } catch (e) { log('destroyPanel: route-guard reset failed — ' + (e instanceof Error ? e.message : String(e)), 'warn'); }

  // v3.60.0: invalidate DOM cache — stale detached nodes must not be reused
  try {
    if (typeof domCache.invalidate === 'function') domCache.invalidate();
  } catch (_e) { /* dom-cache may be unavailable in tests — non-fatal */ }

  // v3.60.0: drop stale UI factories so the next IIFE installs fresh closures
  // (otherwise self-heal in startup.ts may revive the OLD createUIWrapper that
  // captured dead managers).
  try {
    nsWrite('_internal.createUIWrapper', undefined as unknown as () => void);
    nsWrite('_internal.createUIManager', undefined as unknown as () => unknown);
  } catch (_e) { /* namespace may already be torn down — non-fatal */ }

  // Tear down the singleton so the next injection bootstraps a fresh one
  try {
    const mc = MacroController.getInstance() as unknown as { destroy?: () => void };
    if (typeof mc.destroy === 'function') mc.destroy();
  } catch (e) {
    log('destroyPanel: MacroController.destroy failed — ' + (e instanceof Error ? e.message : String(e)), 'warn');
  }

  log('Teardown complete — re-inject script to restore controller', 'success');
}
