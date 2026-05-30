/**
 * MacroLoop Controller — Workspace Context Menu & Inline Rename
 * Phase 5A: Extracted from ws-selection-ui.ts
 *
 * Contains: showWsContextMenu, removeWsContextMenu, startInlineRename
 *
 * v2.149.0 — Inline rename now exposes clickable ✓ / ✗ buttons next to the
 * input field so the action is discoverable without keyboard shortcuts.
 * On success a toast confirms the new name. Enter / Escape still work.
 *
 * v2.150.0 — Cancel (✗ button or Esc key) now prompts a confirm dialog
 * when there are unsaved typed changes, preventing accidental data loss.
 * Both cancel paths share the same `doCancel` helper.
 */

import {
  loopCreditState,
  cPanelBg,
  cPanelFg,
  cPrimary,
  cPrimaryLight,
  lDropdownRadius,
  tFontTiny,
} from './shared-state';
import { log } from './logging';
import { renameWorkspace } from './workspace-rename';
import { logError } from './error-utils';
import { showToast } from './toast';
import {
  populateLoopWorkspaceDropdown,
  fetchLoopCreditsWithDetect,
} from './ws-list-renderer';
import { showWsMembersPanel } from './ws-members-panel';
import { actionRemixManual, actionRemixNext } from './remix-dropdown';
import { extractProjectIdFromUrl } from './workspace-detection';
import { getDisplayProjectName } from './logging';
import { DataAttr, DomId } from './types';
import { PRO_ZERO_BALANCE_JSON_FIELD, PRO_ZERO_SOURCE_FIELD } from './pro-zero/pro-zero-enrichment';
import { MacroCreditSource } from './pro-zero/macro-credit-source';
import {
  getGitsyncCache,
  setGitsyncCache,
  invalidateGitsyncCache,
} from './gitsync-cache';
import { fetchGitsyncConfig } from './gitsync-api';
import { fetchAndPersist } from './credit-balance/fetcher';
import { readCreditBalanceCache } from './credit-balance/store';
import { showWorkspaceHoverCardPinned } from './ws-hover-card';
import { resolveConnection } from './gitsync/progress-probe';

// ── Centralized DOM IDs / classnames ──
const ID_CTX_MENU = 'loop-ws-ctx-menu';
const CSS_WS_ITEM = '.loop-ws-item';
const CSS_WS_NAME = '.loop-ws-name';

/**
 * Build a single context-menu row element with hover effect.
 */
function buildCtxMenuItem(label: string, onClick: () => void): HTMLElement {
  const item = document.createElement('div');
  item.textContent = label;
  item.style.cssText =
    'padding:5px 12px;font-size:' + tFontTiny +
    ';color:' + cPanelFg + ';cursor:pointer;white-space:nowrap;';
  item.onmouseover = function () {
    (this as HTMLElement).style.background = 'rgba(139,92,246,0.3)';
  };
  item.onmouseout = function () {
    (this as HTMLElement).style.background = 'transparent';
  };
  item.onclick = onClick;
  return item;
}

/**
 * Build the clipboard payload for a workspace.
 *
 * For PRO_ZERO workspaces (Source = CREDIT_BALANCE), the verbatim
 * /credit-balance JSON captured during enrichment is appended alongside the
 * raw /user/workspaces section. For all other plans, only the workspace JSON
 * is copied (matches legacy behavior).
 *
 * Spec: spec/22-app-issues/110-macro-controller-pro-zero-credit-balance.md §10
 */
function isProOnePlan(ws: import('./types').WorkspaceCredit): boolean {
  return String(ws.plan || '').toLowerCase().trim() === 'pro_1';
}

async function buildCopyJsonPayload(ws: import('./types').WorkspaceCredit): Promise<string> {
    const workspaceJson = JSON.stringify(ws.rawApi, null, 2);

    // PRO_ZERO: append the verbatim /credit-balance JSON captured during enrichment.
    const balanceRaw = ws[PRO_ZERO_BALANCE_JSON_FIELD];
    const source = ws[PRO_ZERO_SOURCE_FIELD];
    if (source === MacroCreditSource.CREDIT_BALANCE && typeof balanceRaw === 'string' && balanceRaw.length > 0) {
        return JSON.stringify({
            Source: MacroCreditSource.CREDIT_BALANCE,
            Workspace: JSON.parse(workspaceJson) as unknown,
            CreditBalance: JSON.parse(balanceRaw) as unknown,
        }, null, 2);
    }

    // PRO_ONE: pull cached /credit-balance row from SQLite (populated by fetcher.ts).
    if (isProOnePlan(ws) && ws.id) {
        const row = await readCreditBalanceCache(ws.id);
        if (row && row.RawJson) {
            try {
                return JSON.stringify({
                    Source: 'credit_balance_cache',
                    Plan: 'pro_1',
                    Workspace: JSON.parse(workspaceJson) as unknown,
                    CreditBalance: JSON.parse(row.RawJson) as unknown,
                    CreditBalanceCacheRow: row,
                }, null, 2);
            } catch (caught: unknown) {
                logError('wsContextMenu.buildCopyJsonPayload', 'failed to merge pro_1 credit-balance JSON for ws=' + ws.id, caught);
            }
        }
    }

    return workspaceJson;
}

/**
 * Copy the verbatim raw API JSON for a single workspace to the clipboard.
 * For pro_0 and pro_1 workspaces, also includes the cached /credit-balance JSON.
 */
function copyWorkspaceJson(wsId: string, wsName: string): void {
  const perWs = loopCreditState.perWorkspace || [];
  const ws = perWs.find(function (w) { return w.id === wsId; });
  if (!ws || !ws.rawApi) {
    showToast('❌ No JSON data for "' + wsName + '"', 'error');
    log('[CopyJSON] No rawApi for wsId=' + wsId, 'warn');
    return;
  }
  buildCopyJsonPayload(ws)
    .then(function (json) {
      return navigator.clipboard.writeText(json).then(function () {
        showToast('📋 Copied JSON for "' + wsName + '" (' + json.length + ' chars)', 'success');
        log('[CopyJSON] Copied ' + json.length + ' chars for ' + wsName, 'info');
      });
    })
    .catch(function (e: unknown) {
      logError('wsContextMenu', 'Clipboard write failed for Copy JSON', e);
      showToast('❌ Clipboard copy failed', 'error');
    });
}

/**
 * Right-click context menu for a single workspace.
 * v2.216.0 — adds "👥 Show Members" entry.
 * v2.217.0 — adds "🔀 Remix Project" + "⏭️ Remix Next" entries (current project only).
 */
function buildCreditRefreshItem(wsId: string, wsName: string): HTMLElement {
  return buildCtxMenuItem('💰 Credit Refresh', function () {
    removeWsContextMenu();
    fetchAndPersist(wsId, { force: true, source: 'manual' })
      .then(function (result) {
        if (result.outcome === 'fetched') {
          showToast('💰 Credit refreshed for "' + wsName + '"', 'success');
          fetchLoopCreditsWithDetect(false);
          return;
        }
        if (result.outcome === 'failed') {
          showToast('💰 Credit refresh failed for "' + wsName + '" — kept last cached value', 'warn');
          return;
        }
        showToast('💰 Credit refresh throttled for "' + wsName + '"', 'info');
      })
      .catch(function (err: unknown) {
        logError('Credit Refresh', 'fetchAndPersist rejected for workspaceId=' + wsId, err);
        showToast('💰 Credit refresh error for "' + wsName + '"', 'error');
      });
  });
}

function appendRemixAndGithubItems(menu: HTMLElement, wsId: string): void {
  const projectId = extractProjectIdFromUrl();
  const projectName = getDisplayProjectName();
  if (!projectId) { return; }
  menu.appendChild(buildCtxMenuItem('🔀 Remix Project…', function () {
    removeWsContextMenu();
    actionRemixManual({ projectId, workspaceId: wsId, currentProjectName: projectName });
  }));
  menu.appendChild(buildCtxMenuItem('⏭️ Remix Next', function () {
    removeWsContextMenu();
    void actionRemixNext({ projectId, workspaceId: wsId, currentProjectName: projectName });
  }));
  menu.appendChild(buildCtxMenuItem('🐙 Open GitHub repo', function () {
    removeWsContextMenu();
    void openGithubRepoFlow(wsId, projectId, false);
  }));
  menu.appendChild(buildCtxMenuItem('🔄 Refresh gitsync', function () {
    removeWsContextMenu();
    void openGithubRepoFlow(wsId, projectId, true);
  }));
}

export function showWsContextMenu(
  wsId: string,
  wsName: string,
  x: number,
  y: number,
): void {
  removeWsContextMenu();
  const menu = document.createElement('div');
  menu.id = ID_CTX_MENU;
  menu.style.cssText =
    'position:fixed;left:' + x + 'px;top:' + y +
    'px;z-index:100001;background:' + cPanelBg +
    ';border:1px solid ' + cPrimary +
    ';border-radius:' + lDropdownRadius +
    ';padding:2px 0;box-shadow:0 4px 12px rgba(0,0,0,.5);min-width:170px;';

  menu.appendChild(buildCtxMenuItem('✏️ Rename', function () {
    removeWsContextMenu();
    startInlineRename(wsId, wsName);
  }));
  menu.appendChild(buildCtxMenuItem('📋 Copy JSON', function () {
    removeWsContextMenu();
    copyWorkspaceJson(wsId, wsName);
  }));
  menu.appendChild(buildCtxMenuItem('🛈 Show Tooltip', function () {
    removeWsContextMenu();
    showWorkspaceHoverCardPinned(wsId);
  }));
  menu.appendChild(buildCtxMenuItem('👥 Show Members', function () {
    removeWsContextMenu();
    showWsMembersPanel(wsId, wsName, x, y);
  }));
  menu.appendChild(buildCreditRefreshItem(wsId, wsName));
  appendRemixAndGithubItems(menu, wsId);

  document.body.appendChild(menu);

  setTimeout(function () {
    document.addEventListener('click', removeWsContextMenu, { once: true });
  }, 10);
}

export function removeWsContextMenu(): void {
  const existing = document.getElementById(ID_CTX_MENU);
  if (existing) existing.remove();
}

/**
 * Open the GitHub repo linked to (wsId, projectId).
 *
 * v3.10.0 — spec/22-app-issues/workspace-github-open/01-overview.md.
 *
 * Flow:
 *   1. If `forceRefresh` is true, drop any cached row first.
 *   2. Check the SQLite gitsync cache. If we already know the repo URL,
 *      open it directly — zero network. If we already know it's
 *      `not_linked`, toast and stop — zero network.
 *   3. Otherwise call the gitsync API once (no retry) and cache the
 *      result, including the negative case so future right-clicks stay
 *      offline.
 */
async function openGithubRepoFlow(
  wsId: string,
  pid: string,
  forceRefresh: boolean,
): Promise<void> {
  if (forceRefresh) invalidateGitsyncCache(wsId, pid);

  const cached = forceRefresh ? null : await getGitsyncCache(wsId, pid);
  if (cached && cached.Status === 'found' && cached.RepoUrl) {
    window.open(cached.RepoUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (cached && cached.Status === 'not_linked') {
    showToast('🐙 No GitHub repo linked (cached). Use Refresh gitsync to re-check.', 'warn');
    return;
  }

  const outcome = await fetchGitsyncConfig(wsId, pid);
  if (outcome.status === 'found') {
    setGitsyncCache(wsId, pid, 'found', outcome.repoUrl);
    window.open(outcome.repoUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (outcome.status === 'not_linked') {
    setGitsyncCache(wsId, pid, 'not_linked');
    showToast('🐙 No GitHub repo linked to this project.', 'warn');
    return;
  }
  setGitsyncCache(wsId, pid, 'error');
  showToast('❌ Failed to fetch GitHub repo: ' + outcome.message, 'error');
}

// ── Inline rename helpers ──

function buildIconButton(
  glyph: string,
  title: string,
  bg: string,
  fg: string,
  onClick: (e: MouseEvent) => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = glyph;
  btn.title = title;
  btn.style.cssText =
    'flex-shrink:0;width:18px;height:18px;padding:0;line-height:1;' +
    'background:' + bg + ';color:' + fg +
    ';border:1px solid ' + cPrimary +
    ';border-radius:3px;font-size:11px;font-weight:700;cursor:pointer;';
  btn.onmouseover = function () { btn.style.filter = 'brightness(1.25)'; };
  btn.onmouseout = function () { btn.style.filter = ''; };
  btn.onclick = function (e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  };
  return btn;
}

function buildRenameInput(currentName: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.style.cssText =
    'flex:1;min-width:0;padding:1px 3px;border:1px solid ' + cPrimaryLight +
    ';border-radius:2px;background:' + cPanelBg +
    ';color:' + cPanelFg +
    ';font-size:11px;outline:none;box-sizing:border-box;';
  return input;
}

function commitRename(wsId: string, currentName: string, newName: string): void {
  if (!newName) {
    log('[Rename] Empty name — cancelled', 'warn');
    populateLoopWorkspaceDropdown();
    return;
  }
  if (newName === currentName) {
    populateLoopWorkspaceDropdown();
    return;
  }
  renameWorkspace(wsId, newName)
    .then(function () {
      const perWs = loopCreditState.perWorkspace || [];
      for (const ws of perWs) {
        if (ws.id === wsId) {
          ws.fullName = newName;
          ws.name = newName;
          break;
        }
      }
      showToast('✏️ Renamed to "' + newName + '"', 'success');
      populateLoopWorkspaceDropdown();
      fetchLoopCreditsWithDetect(false);
    })
    .catch(function (e: unknown) {
      logError('wsContextMenu', 'Workspace rename failed', e);
      showToast('❌ Rename failed', 'error');
      populateLoopWorkspaceDropdown();
    });
}

function findNameDiv(wsId: string): HTMLElement | null {
  const listEl = document.getElementById(DomId.LoopWsList);
  if (!listEl) return null;
  const items = listEl.querySelectorAll(CSS_WS_ITEM);
  for (const item of Array.from(items)) {
    if (item.getAttribute(DataAttr.WsId) !== wsId) continue;
    return item.querySelector(CSS_WS_NAME);
  }
  return null;
}

/**
 * Start inline rename of a workspace in the list.
 * Renders an editable input flanked by ✓ (confirm) and ✗ (cancel) buttons.
 */
export function startInlineRename(wsId: string, currentName: string): void {
  const nameDiv = findNameDiv(wsId);
  if (!nameDiv) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:3px;width:100%;';

  const input = buildRenameInput(currentName);
  let committed = false;

  const doCommit = function (): void {
    if (committed) return;
    committed = true;
    commitRename(wsId, currentName, input.value.trim());
  };
  const doCancel = function (): void {
    if (committed) return;
    const typed = input.value.trim();
    const hasUnsaved = typed.length > 0 && typed !== currentName;
    if (hasUnsaved) {
      const ok = window.confirm(
        'Discard unsaved rename?\n\n"' + currentName + '" → "' + typed + '"',
      );
      if (!ok) {
        input.focus();
        return;
      }
    }
    committed = true;
    populateLoopWorkspaceDropdown();
  };

  input.onkeydown = function (e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); doCommit(); }
    else if (e.key === 'Escape') { e.preventDefault(); doCancel(); }
  };
  wrap.onclick = function (e: MouseEvent) { e.stopPropagation(); };

  wrap.appendChild(input);
  wrap.appendChild(buildIconButton('✓', 'Confirm rename (Enter)', '#059669', '#fff', doCommit));
  wrap.appendChild(buildIconButton('✗', 'Cancel rename (Esc)', 'rgba(100,116,139,0.4)', '#e2e8f0', doCancel));

  nameDiv.textContent = '';
  nameDiv.appendChild(wrap);
  input.focus();
  input.select();
}
