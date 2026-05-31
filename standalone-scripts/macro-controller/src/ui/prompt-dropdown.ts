/**
 * Prompt Dropdown — Dropdown rendering with categories, Task Next, prompt items
 *
 * Phase 5D split from ui/prompt-manager.ts.
 * See: spec/04-macro-controller/ts-migration-v2/05-module-splitting.md
 */

import { log } from '../logging';
import { logError } from '../error-utils';
import type { PromptEntry as LoaderPromptEntry } from '../types';

import { cPanelFg, cPanelFgDim, cPrimary, cPrimaryLight, cBtnMenuHover, lDropdownRadius } from '../shared-state';
import { getByXPath } from '../xpath-utils';
import { pasteIntoEditor, showPasteToast } from './prompt-utils';
import { runTaskNextLoop, openTaskNextSettingsModal, type TaskNextDeps, findNextTasksPrompt } from './task-next-ui';
import { addTaskToQueue } from '../task-queue';
import { getDisplayProjectName } from '../logging';

import type { PromptContext } from './prompt-loader';
import {
  getPromptsConfig,
  sendToExtension,
  loadPromptsFromJson,
  setRevalidateContext,
  setRenderDropdownFn,
  getPromptCategoryFilter,
  getPromptCategoryFilterSet,
  clearLoadedPrompts,
  forceLoadFromDb,
  saveHtmlCopy,
  getSuggestedPrompts,
} from './prompt-loader';
import { openPromptCreationModal } from './prompt-injection';
import {
  computePromptHash,
  writeUISnapshot,
  readUISnapshot,
  clearUISnapshot,
} from './prompt-cache';
import type { CachedPromptEntry } from './prompt-cache';

import { renderPlanTaskSubmenu } from './plan-task-ui';
import { renderFilterMenu } from './prompt-filter-menu';

/** Adapter: getByXPath returns Node|null, pasteIntoEditor needs Element|null */
function getByXPathAsElement(xpath: string): Element | null {
  const node = getByXPath(xpath);
  return node instanceof Element ? node : null;
}

// Register ourselves as the render function for background revalidation
setRenderDropdownFn(renderPromptsDropdown);

// CQ16: Keep the inline Task Next panel visible inside the prompts dropdown.
// Handles both bottom overflow (open-down) and top overflow (open-up flip from Step 3).
function keepTaskNextSubInView(promptsDropdown: HTMLElement, taskNextSub: HTMLElement): void {
  window.requestAnimationFrame(function () {
    const dropRect = promptsDropdown.getBoundingClientRect();
    const subRect = taskNextSub.getBoundingClientRect();
    const PAD = 6;
    if (subRect.bottom > dropRect.bottom) {
      promptsDropdown.scrollTop += Math.ceil(subRect.bottom - dropRect.bottom + PAD);
      return;
    }
    if (subRect.top < dropRect.top) {
      promptsDropdown.scrollTop -= Math.ceil(dropRect.top - subRect.top + PAD);
    }
  });
}

/**
 * Issue 127 Bug B — Anchor the Task Next sub-menu RIGHT of its row by default,
 * fall back to a stacked-below layout when right-side viewport space is
 * insufficient. Never let the menu clip off-screen on the left or right.
 *
 *   Default (right):  sub.position=fixed; left = rowRect.right + GAP; top = rowRect.top
 *   Fallback (below): sub.position=static; menu stacks under the row
 *
 * Sets `data-task-next-anchor` to `right` or `below` for tests / debuggers.
 */
function anchorTaskNextSub(row: HTMLElement, sub: HTMLElement, host: HTMLElement): void {
  const GAP = 6;
  const PAD = 8;
  const MIN_SUB_WIDTH = 180;

  // Measure natural width by briefly forcing the menu visible off-screen.
  const prevVisibility = sub.style.visibility;
  sub.style.visibility = 'hidden';
  sub.style.position = 'fixed';
  sub.style.left = '-9999px';
  sub.style.top = '0px';
  sub.style.display = 'block';
  const measuredWidth = Math.max(sub.getBoundingClientRect().width || 0, MIN_SUB_WIDTH);
  sub.style.visibility = prevVisibility;

  const rowRect = row.getBoundingClientRect();
  const rightSpace = window.innerWidth - rowRect.right - PAD;
  const fitsRight = rightSpace >= measuredWidth;

  if (fitsRight) {
    sub.style.position = 'fixed';
    sub.style.left = (rowRect.right + GAP) + 'px';
    sub.style.top = rowRect.top + 'px';
    sub.style.margin = '0';
    sub.setAttribute('data-task-next-anchor', 'right');
    return;
  }

  // Fallback: stack below the row inside the dropdown column.
  sub.style.position = 'static';
  sub.style.left = '';
  sub.style.top = '';
  sub.style.margin = '0 6px 6px 6px';
  sub.setAttribute('data-task-next-anchor', 'below');
  // Keep the stacked menu visible inside the scrollable prompts dropdown.
  keepTaskNextSubInView(host, sub);
}



// Legacy single-pick chip helper removed in favor of the new Filter menu.
// (Multi-select state lives in prompt-loader.ts via getPromptCategoryFilterSet.)

/**
 * In-memory mirror of the last persisted UI snapshot. Lets the prompts
 * dropdown paint synchronously on click (zero IDB round-trip, zero flicker)
 * — fixes Issue 129 S-1 where Plan Task / Task Next briefly disappeared
 * because the previous render path gated on `readUISnapshot()`.
 *
 * The IDB copy is still written by `_persistSnapshot` and still read once on
 * first paint via `_hydrateMemSnapshotOnce` to survive page reloads.
 */
interface MemSnapshot {
  html: string;
  dataHash: string;
  categoryFilter: string | null;
  promptCount: number;
  scrollTop: number;
}
let _memSnapshot: MemSnapshot | null = null;
let _memHydrated = false;
let _currentSearchQuery = '';

function _hydrateMemSnapshotOnce(): void {
  if (_memHydrated) return;
  _memHydrated = true;
  readUISnapshot().then(function(snapshot) {
    if (snapshot && !_memSnapshot) {
      _memSnapshot = {
        html: snapshot.html,
        dataHash: snapshot.dataHash,
        categoryFilter: snapshot.categoryFilter,
        promptCount: snapshot.promptCount,
        scrollTop: snapshot.scrollTop,
      };
    }
  }).catch(function() { /* swallow — IDB hydration is best-effort */ });
}

/**
 * Render the prompts dropdown with categories, Task Next submenu, and prompt items.
 *
 * SYNCHRONOUS PAINT GUARANTEE (Issue 129 Step 2): If the in-memory snapshot
 * matches the current data hash + filter, the dropdown is painted in the
 * same tick from cached HTML. No `await`, no IndexedDB on the critical
 * path. Loading state is only possible on the very first cold-cache load
 * before `_hydrateMemSnapshotOnce` resolves.
 */
export function renderPromptsDropdown(ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  setRevalidateContext(ctx, taskNextDeps);
  _hydrateMemSnapshotOnce();

  const promptsDropdown = ctx.promptsDropdown;
  const promptsCfg = getPromptsConfig() as ResolvedPromptsConfig;
  const entries = promptsCfg.entries;
  const currentHash = computePromptHash(entries as CachedPromptEntry[]);
  const currentFilter = _computeFilterKey();

  // Fast path — paint synchronously from the in-memory snapshot.
  if (
    !_currentSearchQuery
    && _memSnapshot
    && _memSnapshot.dataHash === currentHash
    && _memSnapshot.categoryFilter === currentFilter
    && _memSnapshot.promptCount === entries.length
  ) {
    log('[PromptDropdown] Sync paint from in-memory snapshot (' + _memSnapshot.promptCount + ' prompts)', 'info');
    promptsDropdown.innerHTML = _memSnapshot.html;
    promptsDropdown.scrollTop = _memSnapshot.scrollTop;
    _rebindDropdownListeners(promptsDropdown, entries, promptsCfg, ctx, taskNextDeps);
    return;
  }

  // No usable snapshot — render fresh synchronously (no IDB gate).
  _renderFresh(promptsDropdown, entries, promptsCfg, ctx, taskNextDeps, currentHash, currentFilter);
}
// ============================================
// Dropdown header with Load button
// ============================================

/** Build the dropdown header row: Tasks toggle (left) + IO + Load buttons (right). */
function buildDropdownHeader(ctx: PromptContext, taskNextDeps: TaskNextDeps): HTMLElement {
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 8px;border-bottom:1px solid #7c3aed;';
  header.appendChild(buildTasksToggleButton());
  const right = document.createElement('div');
  right.style.cssText = 'display:flex;align-items:center;gap:6px;';
  right.appendChild(buildIOButton());
  right.appendChild(buildLoadButton(ctx, taskNextDeps));
  header.appendChild(right);
  return header;
}

/** Build the "📥 IO" button that opens the Prompts Import/Export dialog. */
function buildIOButton(): HTMLElement {
  const btn = document.createElement('span');
  btn.textContent = '📥 IO';
  btn.title = 'Import / Export prompts as JSON';
  btn.style.cssText = 'cursor:pointer;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:600;color:#fff;background:rgba(124,58,237,0.55);border:1px solid rgba(255,255,255,0.1);';
  btn.onmouseover = function() { btn.style.background = 'rgba(124,58,237,0.85)'; };
  btn.onmouseout = function() { btn.style.background = 'rgba(124,58,237,0.55)'; };
  btn.onclick = function(e: Event) {
    e.stopPropagation();
    void import('./prompt-io-dialog').then(function(mod) { (mod as { renderPromptIODialog: () => void }).renderPromptIODialog(); });
  };
  return btn;
}

/** Build the "🎯 Tasks ▾" toggle that shows/hides the Plan Task + Task Next submenus group. */
function buildTasksToggleButton(): HTMLElement {
  const btn = document.createElement('span');
  btn.setAttribute('data-tasks-toggle', '1');
  btn.textContent = '🎯 Tasks ▸';
  btn.title = 'Plan Task + Task Next controls — hover or click to open';
  btn.style.cssText = 'cursor:pointer;padding:5px 10px;border-radius:5px;font-size:11px;font-weight:700;color:' + cPrimaryLight + ';background:rgba(124,58,237,0.22);border:1px solid rgba(124,58,237,0.5);user-select:none;letter-spacing:0.3px;';

  function findGroup(): HTMLElement | null {
    const dropdown = btn.closest('[data-prompts-dropdown]') as HTMLElement | null
      ?? (btn.parentElement?.parentElement as HTMLElement | null);
    return dropdown?.querySelector('[data-tasks-group]') as HTMLElement | null;
  }
  function openGroup(): void {
    const group = findGroup();
    if (!group) return;
    group.style.display = 'block';
    btn.textContent = '🎯 Tasks ▾';
    btn.style.background = 'rgba(124,58,237,0.4)';
  }
  function closeGroup(): void {
    const group = findGroup();
    if (!group) return;
    group.style.display = 'none';
    btn.textContent = '🎯 Tasks ▸';
    btn.style.background = 'rgba(124,58,237,0.22)';
  }
  // Hover-open with small grace period so users can move into the panel.
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  function cancelClose(): void { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } }
  function scheduleClose(): void {
    cancelClose();
    closeTimer = setTimeout(function() {
      const group = findGroup();
      if (group && group.matches(':hover')) return;
      if (btn.matches(':hover')) return;
      closeGroup();
    }, 180);
  }

  btn.onmouseenter = function() { cancelClose(); openGroup(); };
  btn.onmouseleave = scheduleClose;
  btn.onclick = function(e: Event) {
    e.stopPropagation();
    const group = findGroup();
    const open = group ? group.style.display !== 'none' : false;
    if (open) closeGroup(); else openGroup();
  };
  // Group teardown wiring runs once it exists — handled at render time via
  // the data-tasks-group attribute below in _appendHeaderAndSubmenu.
  btn.setAttribute('data-tasks-hover-bound', '1');
  return btn;
}


/** Build the manual "Load" button for refreshing prompts from DB. */
function buildLoadButton(ctx: PromptContext, taskNextDeps: TaskNextDeps): HTMLElement {
  const btn = document.createElement('span');
  btn.textContent = '↻ Load';
  btn.title = 'Reload prompts from database';
  btn.style.cssText = 'cursor:pointer;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:600;color:#fff;background:' + cPrimary + ';border:1px solid rgba(255,255,255,0.1);';

  btn.onmouseover = function() { btn.style.background = cPrimaryLight; btn.style.transform = 'scale(1.05)'; };
  btn.onmouseout = function() { btn.style.background = cPrimary; btn.style.transform = ''; };

  btn.onclick = function(e: Event) {
    e.stopPropagation();
    handleLoadClick(btn, ctx, taskNextDeps);
  };

  return btn;
}

/** Handle the Load button click — fetch from DB and re-render. */
function handleLoadClick(btn: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  btn.textContent = '⏳…';
  btn.style.pointerEvents = 'none';

  forceLoadFromDb().then(function() {
    log('[PromptDropdown] Manual load complete — re-rendering', 'success');
    renderPromptsDropdown(ctx, taskNextDeps);
  }).catch(function(err: unknown) {
    logError('PromptDropdown', 'Manual load failed: ' + (err instanceof Error ? err.message : String(err)));
    btn.textContent = '↻ Load';
    btn.style.pointerEvents = '';
  });
}

/** Build the search input for filtering prompts. */
function buildSearchInput(ctx: PromptContext, taskNextDeps: TaskNextDeps): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'padding:6px 8px;border-bottom:1px solid rgba(124,58,237,0.2);background:rgba(124,58,237,0.05);';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '🔍 Search prompts or #tags...';
  input.value = _currentSearchQuery;
  input.style.cssText = 'width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:#fff;font-size:10px;padding:4px 8px;outline:none;';
  
  input.oninput = function() {
    _currentSearchQuery = input.value.trim().toLowerCase();
    // We re-render the filtered items part without rebuilding the whole dropdown
    // or just re-render the whole dropdown fresh
    renderPromptsDropdown(ctx, taskNextDeps);
  };
  
  // Focus on render if it was already focused? 
  // Actually, re-rendering the whole dropdown will lose focus.
  // Let's try to preserve it.
  if (_currentSearchQuery) {
    setTimeout(() => input.focus(), 0);
  }

  container.appendChild(input);
  return container;
}

function _renderFresh(
  promptsDropdown: HTMLElement,
  entries: LoaderPromptEntry[],
  promptsCfg: ReturnType<typeof getPromptsConfig>,
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
  dataHash: string,
  categoryFilter: string | null,
): void {
  promptsDropdown.textContent = '';

  _appendHeaderAndSubmenu(promptsDropdown, entries, ctx, taskNextDeps);
  
  // Append Search Bar
  promptsDropdown.appendChild(buildSearchInput(ctx, taskNextDeps));

  if (!entries.length) {
    renderEmptyState(promptsDropdown, ctx, taskNextDeps);
    return;
  }

  _appendHeaderAndSubmenu(promptsDropdown, entries, ctx, taskNextDeps);
  _appendFilteredItems(promptsDropdown, entries, promptsCfg, ctx, taskNextDeps);
  promptsDropdown.appendChild(buildAddPromptButton(promptsDropdown, ctx, taskNextDeps));
  _persistSnapshot(promptsDropdown, entries, dataHash, categoryFilter);
}

/** Append header, Task Next + Plan Task (collapsed by default) + Filter inline menus. */
function _appendHeaderAndSubmenu(
  container: HTMLElement,
  entries: LoaderPromptEntry[],
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
): void {
  // Mark dropdown so the Tasks toggle can find the group from any descendant click.
  if (!container.hasAttribute('data-prompts-dropdown')) container.setAttribute('data-prompts-dropdown', '1');
  // Ensure the container can host an absolutely-positioned right-anchored Tasks panel.
  if (!container.style.position) container.style.position = 'relative';
  container.appendChild(buildDropdownHeader(ctx, taskNextDeps));

  // Step 4 (20-step plan): Tasks (Task Next + Plan Task) live in a right-anchored
  // floating panel attached to the prompts dropdown's right edge — keeps the prompts
  // list itself focused and uncluttered. Hidden by default; toggled by 🎯 Tasks button.
  const tasksGroup = document.createElement('div');
  tasksGroup.setAttribute('data-tasks-group', '1');
  tasksGroup.setAttribute('data-tasks-anchor', 'right');
  tasksGroup.style.cssText = [
    'display:none',
    'position:absolute',
    'top:0',
    'left:100%',
    'margin-left:6px',
    'width:260px',
    'max-height:80vh',
    'overflow-y:auto',
    'z-index:10001',
    'border:1px solid rgba(124,58,237,0.5)',
    'border-radius:' + lDropdownRadius,
    'background:rgba(20,16,32,0.96)',
    'box-shadow:0 8px 24px rgba(0,0,0,0.45)',
  ].join(';') + ';';
  renderTaskNextSubmenu(tasksGroup, ctx, taskNextDeps);
  renderPlanTaskSubmenu(tasksGroup, ctx);
  // Auto-close the floating Tasks panel when the pointer leaves it, so the
  // hover-open UX behaves like a real menu (no need to click outside).
  tasksGroup.onmouseleave = function() {
    setTimeout(function() {
      const toggle = container.querySelector('[data-tasks-toggle]') as HTMLElement | null;
      if (toggle && toggle.matches(':hover')) return;
      if (tasksGroup.matches(':hover')) return;
      tasksGroup.style.display = 'none';
      if (toggle) {
        toggle.textContent = '🎯 Tasks ▸';
        toggle.style.background = 'rgba(124,58,237,0.22)';
      }
    }, 180);
  };
  container.appendChild(tasksGroup);

  // Issue 127 Task 3 — Re-add the Plan Task row inline in the prompts dropdown
  // body so users can reach it without first opening the 🎯 Tasks floating
  // panel. The Tasks panel still hosts a copy for backward-compatibility.
  const inlinePlanRow = document.createElement('div');
  inlinePlanRow.setAttribute('data-inline-plan-row', '1');
  renderPlanTaskSubmenu(inlinePlanRow, ctx);
  container.appendChild(inlinePlanRow);

  const categories = collectUniqueCategories(entries);
  renderFilterMenu(container, categories, ctx, taskNextDeps, renderPromptsDropdown);
}

/** Append filtered prompt items or empty-category message. */
function _appendFilteredItems(
  container: HTMLElement,
  entries: LoaderPromptEntry[],
  promptsCfg: ReturnType<typeof getPromptsConfig>,
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
): void {
  // 0. Render Suggestions (if no search and not in a specific category)
  if (!getPromptCategoryFilter() && !_currentSearchQuery) {
    const suggestions = getSuggestedPrompts(entries);
    if (suggestions.length > 0) {
      const sugHeader = document.createElement('div');
      sugHeader.style.cssText = 'padding:6px 10px;font-size:9px;font-weight:700;color:#3daee9;background:rgba(61,174,233,0.05);text-transform:uppercase;letter-spacing:0.5px;';
      sugHeader.textContent = '✨ Suggested';
      container.appendChild(sugHeader);
      suggestions.forEach((p: LoaderPromptEntry, idx: number) => {
        container.appendChild(renderPromptItem(idx, p, container, promptsCfg, ctx, taskNextDeps));
      });
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:rgba(124,58,237,0.2);margin:4px 0;';
      container.appendChild(sep);
    }
  }

  // 1. Render Favorites (pinned to top)

  const favorites = entries.filter(p => p.isFavorite);
  if (favorites.length > 0 && !getPromptCategoryFilter() && !_currentSearchQuery) {
    const favHeader = document.createElement('div');
    favHeader.style.cssText = 'padding:6px 10px;font-size:9px;font-weight:700;color:#facc15;background:rgba(250,204,21,0.05);text-transform:uppercase;letter-spacing:0.5px;';
    favHeader.textContent = '⭐ Favorites';
    container.appendChild(favHeader);
    for (const [idx, p] of favorites.entries()) {
      container.appendChild(renderPromptItem(idx, p, container, promptsCfg, ctx, taskNextDeps));
    }
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:rgba(124,58,237,0.2);margin:4px 0;';
    container.appendChild(sep);
  }

  // 2. Render normal filtered items with folder support
  const filtered = filterByCategory(entries);
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:12px 8px;text-align:center;color:' + cPanelFgDim + ';font-size:11px;';
    empty.textContent = 'No prompts found';
    container.appendChild(empty);
    return;
  }

  // Group by folder if no search active
  if (!_currentSearchQuery) {
    _renderFolderTree(container, filtered, promptsCfg, ctx, taskNextDeps);
  } else {
    for (const [idx, p] of filtered.entries()) {
      container.appendChild(renderPromptItem(idx, p, container, promptsCfg, ctx, taskNextDeps));
    }
  }
}

/** Render prompts in a collapsible folder tree. */
function _renderFolderTree(
  container: HTMLElement,
  entries: LoaderPromptEntry[],
  promptsCfg: unknown,
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
): void {
  const folders: Record<string, LoaderPromptEntry[]> = {};
  const rootItems: LoaderPromptEntry[] = [];

  entries.forEach(p => {
    const cat = p.category || '';
    if (cat.includes('/')) {
      const folderName = cat.split('/')[0];
      if (!folders[folderName]) folders[folderName] = [];
      folders[folderName].push(p);
    } else {
      rootItems.push(p);
    }
  });

  // Render Folders
  Object.keys(folders).sort().forEach(folderName => {
    const folderWrap = document.createElement('div');
    folderWrap.style.cssText = 'border-bottom:1px solid rgba(124,58,237,0.1);';
    
    const folderHeader = document.createElement('div');
    folderHeader.style.cssText = 'padding:6px 10px;font-size:10px;font-weight:700;color:' + cPrimaryLight + ';cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(124,58,237,0.03);';
    folderHeader.innerHTML = `<span>📁</span> <span>${folderName}</span> <span style="font-size:8px;opacity:0.5;margin-left:auto;">(${folders[folderName].length})</span>`;
    
    const folderBody = document.createElement('div');
    folderBody.style.display = 'none';
    folderBody.style.paddingLeft = '8px';
    folderBody.style.borderLeft = '1px solid rgba(124,58,237,0.2)';
    folderBody.style.margin = '2px 0 2px 10px';

    folderHeader.onclick = (e) => {
      e.stopPropagation();
      const isOpen = folderBody.style.display !== 'none';
      folderBody.style.display = isOpen ? 'none' : 'block';
      folderHeader.querySelector('span')!.textContent = isOpen ? '📁' : '📂';
    };

    folders[folderName].forEach((p, idx) => {
      folderBody.appendChild(renderPromptItem(idx, p, container, promptsCfg, ctx, taskNextDeps));
    });

    folderWrap.appendChild(folderHeader);
    folderWrap.appendChild(folderBody);
    container.appendChild(folderWrap);
  });

  // Render root items
  rootItems.forEach((p, idx) => {
    container.appendChild(renderPromptItem(idx, p, container, promptsCfg, ctx, taskNextDeps));
  });
}

/** Save UI snapshot + HtmlCopy for fast restore. */
function _persistSnapshot(container: HTMLElement, entries: LoaderPromptEntry[], dataHash: string, categoryFilter: string | null): void {
  const snapshotHtml = container.innerHTML;

  // Update the in-memory mirror immediately so subsequent renders paint sync
  // (Issue 129 Step 2). IDB writes below remain best-effort and async.
  _memSnapshot = {
    html: snapshotHtml,
    dataHash: dataHash,
    categoryFilter: categoryFilter,
    promptCount: entries.length,
    scrollTop: container.scrollTop,
  };
  _memHydrated = true;

  writeUISnapshot({
    html: snapshotHtml,
    categoryFilter: categoryFilter,
    scrollTop: container.scrollTop,
    promptCount: entries.length,
    dataHash: dataHash,
  }).then(function() {
    log('[PromptDropdown] UI snapshot saved', 'info');
  });

  saveHtmlCopy({
    html: snapshotHtml,
    promptCount: entries.length,
    dataHash: dataHash,
  }).then(function() {
    log('[PromptDropdown] HtmlCopy saved to IndexedDB', 'info');
  });
}

/**
 * Re-bind click/hover/input event listeners on snapshot-restored HTML.
 * Uses data attributes and DOM structure matching to reconnect handlers.
 */
function _rebindDropdownListeners(
  promptsDropdown: HTMLElement,
  entries: LoaderPromptEntry[],
  promptsCfg: ReturnType<typeof getPromptsConfig>,
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
): void {
  _cleanupTaskNextSubs();
  _rebindHeader(promptsDropdown, ctx, taskNextDeps);
  _rebindTaskNextSubmenu(promptsDropdown, ctx, taskNextDeps);
  _rebindPlanTaskSubmenus(promptsDropdown, ctx);
  _rebindFilterMenu(promptsDropdown, entries, ctx, taskNextDeps);
  _rebindPromptItems(promptsDropdown, entries, promptsCfg, ctx, taskNextDeps);
  _rebindAddButton(promptsDropdown, ctx, taskNextDeps);
}

/**
 * Rebuild every Plan Task submenu in the dropdown after a snapshot restore.
 *
 * Issue 129 Step 3 root cause: snapshot restore writes `innerHTML`, which
 * destroys the per-element `onclick` handlers attached by
 * `renderPlanTaskSubmenu()` in plan-task-ui.ts. The previous rebind list
 * only touched the Task Next submenu, so the Plan Task row (inline + inside
 * the 🎯 Tasks floating panel) silently became dead HTML — clicking the
 * "🧠 Plan Task" header toggled nothing, and the preset "Plan in N steps"
 * rows did not inject the prompt.
 *
 * Fix: locate the inline row (`[data-inline-plan-row]`) and the in-Tasks-group
 * copy (the `[data-plan-task-sub]` element's grandparent), clear them, and
 * re-render via `renderPlanTaskSubmenu` so all listeners are fresh.
 */
function _rebindPlanTaskSubmenus(container: HTMLElement, ctx: PromptContext): void {
  // Inline Plan Task row directly under the dropdown.
  const inlineRow = container.querySelector('[data-inline-plan-row]') as HTMLElement | null;
  if (inlineRow) {
    inlineRow.textContent = '';
    renderPlanTaskSubmenu(inlineRow, ctx);
  }

  // Copy inside the 🎯 Tasks floating panel — the `[data-plan-task-sub]`
  // element is the inner sub; its grandparent is the row container appended
  // by `renderPlanTaskSubmenu` (item → row, sub). Walk to the wrapper that
  // sits directly inside `[data-tasks-group]` and replace it.
  const tasksGroup = container.querySelector('[data-tasks-group]') as HTMLElement | null;
  if (tasksGroup) {
    const planSubs = tasksGroup.querySelectorAll('[data-plan-task-sub]');
    planSubs.forEach(function(subEl) {
      const item = subEl.parentElement;
      if (!item || item.parentElement !== tasksGroup) return;
      item.remove();
      renderPlanTaskSubmenu(tasksGroup, ctx);
    });
  }
}

/** Re-attach the Load button handler in the dropdown header. */
function _rebindHeader(container: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  // Header is the first child — find Load button inside it
  const header = container.firstElementChild as HTMLElement;
  if (!header) return;
  // Replace the old Load button with a fresh one
  const oldLoadBtn = header.querySelector('span[title="Reload prompts from database"]') as HTMLElement;
  if (oldLoadBtn) {
    const newLoadBtn = buildLoadButton(ctx, taskNextDeps);
    oldLoadBtn.replaceWith(newLoadBtn);
  }
}

/** Rebuild the Task Next submenu after snapshot restore. */
function _rebindTaskNextSubmenu(container: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  // Find the Task Next item in the dropdown (second child after header)
  for (const child of Array.from(container.children)) {
    const el = child as HTMLElement;
    if (el.textContent?.includes('Task Next')) {
      // Remove old static item and re-render the submenu in its place
      const parent = el.parentElement;
      if (parent) {
        const idx = Array.from(parent.children).indexOf(el);
        el.remove();
        // Build fresh Task Next submenu
        const tempContainer = document.createElement('div');
        renderTaskNextSubmenu(tempContainer, ctx, taskNextDeps);
        const newItem = tempContainer.firstElementChild;
        if (newItem && parent.children[idx]) {
          parent.insertBefore(newItem, parent.children[idx]);
        } else if (newItem) {
          parent.appendChild(newItem);
        }
      }
      break;
    }
  }
}

/** Remove stale Task Next sub-menus from DOM. */
function _cleanupTaskNextSubs(): void {
  const subs = document.querySelectorAll('[data-task-next-sub]');
  subs.forEach(function(el) { el.remove(); });
}

/** Rebuild the inline Filter menu in the dropdown after snapshot restore. */
function _rebindFilterMenu(
  container: HTMLElement,
  entries: LoaderPromptEntry[],
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
): void {
  // Locate the element with [data-prompt-filter-sub], walk to its item-container and replace it.
  const filterSub = container.querySelector('[data-prompt-filter-sub]');
  if (filterSub) {
    const filterItem = filterSub.parentElement;
    if (filterItem && filterItem.parentElement === container) {
      const categories = collectUniqueCategories(entries);
      filterItem.textContent = '';
      const idx = Array.from(container.children).indexOf(filterItem);
      filterItem.remove();
      renderFilterMenu(container, categories, ctx, taskNextDeps, renderPromptsDropdown);
      // Try to maintain order if possible, though append is usually fine
      const newItem = container.lastElementChild;
      if (newItem && container.children[idx]) {
        container.insertBefore(newItem, container.children[idx]);
      }
    }
  }

}


/** Re-attach prompt item click/hover handlers from snapshot. */
function _rebindPromptItems(
  container: HTMLElement,
  entries: LoaderPromptEntry[],
  promptsCfg: ReturnType<typeof getPromptsConfig>,
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
): void {
  const filtered = filterByCategory(entries);
  const items = _findPromptItemElements(container);

  for (let i = 0; i < Math.min(items.length, filtered.length); i++) {
    _bindSinglePromptItem(items[i], filtered[i], container, promptsCfg, ctx, taskNextDeps);
  }
}

/** Find DOM elements tagged as prompt items via data attribute. */
function _findPromptItemElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-prompt-idx]')) as HTMLElement[];
}

/** Bind hover/click on a single restored prompt item. */
function _bindSinglePromptItem(
  item: HTMLElement, p: PromptEntry, container: HTMLElement,
  promptsCfg: ReturnType<typeof getPromptsConfig>, ctx: PromptContext, taskNextDeps: TaskNextDeps,
): void {
  item.onmouseover = function() { (this as HTMLElement).style.background = cBtnMenuHover; };
  item.onmouseout = function() { (this as HTMLElement).style.background = 'transparent'; };
  if (!p.text) return;

  const actionsSpan = (item.querySelector('[data-prompt-actions]') as HTMLElement)
    || (item.querySelector('span:last-child') as HTMLElement);
  item.onclick = function(e: Event) {
    if (actionsSpan && actionsSpan.contains(e.target as Node)) return;
    pasteIntoEditor(p.text, promptsCfg, getByXPathAsElement);
    container.style.display = 'none';
  };
  if (actionsSpan) {
    _rebindActionIcons(actionsSpan, p, container, ctx, taskNextDeps);
  }
}

/** Re-attach the Add New Prompt button handler. */
function _rebindAddButton(container: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  const lastChild = container.lastElementChild as HTMLElement;
  if (!lastChild || !lastChild.textContent?.includes('Add New Prompt')) return;
  lastChild.onmouseover = function() { (this as HTMLElement).style.background = 'rgba(139,92,246,0.2)'; };
  lastChild.onmouseout = function() { (this as HTMLElement).style.background = 'transparent'; };
  lastChild.onclick = function(e: Event) {
    e.stopPropagation();
    container.style.display = 'none';
    openPromptCreationModal(ctx, taskNextDeps, null);
  };
}

function _rebindActionIcons(
  actionsSpan: HTMLElement,
  p: PromptEntry,
  promptsDropdown: HTMLElement,
  ctx: PromptContext,
  taskNextDeps: TaskNextDeps,
): void {
  const icons = actionsSpan.querySelectorAll('span');
  for (const icon of icons) {
    const el = icon as HTMLElement;
    el.onmouseover = function() { (this as HTMLElement).style.opacity = '1'; };
    el.onmouseout = function() { (this as HTMLElement).style.opacity = el.style.opacity; };
    if (el.title === 'Edit prompt') {
      el.onclick = function(e: Event) {
        e.stopPropagation();
        promptsDropdown.style.display = 'none';
        openPromptCreationModal(ctx, taskNextDeps, { id: p.id, name: p.name, text: p.text, category: p.category, isDefault: p.isDefault });
      };
    } else if (el.title === 'Delete prompt') {
      el.onclick = function(e: Event) {
        e.stopPropagation();
        if (!confirm('Delete prompt "' + p.name + '"?')) return;
        sendToExtension('DELETE_PROMPT', { promptId: p.id }).then(function(resp: Record<string, unknown>) {
          if (resp && resp.isOk) {
            clearLoadedPrompts();
            clearUISnapshot();
            loadPromptsFromJson().then(function() { renderPromptsDropdown(ctx, taskNextDeps); });
          }
        });
      };
    } else if (el.title === 'Copy to clipboard') {
      el.onclick = function(e: Event) {
        e.stopPropagation();
        navigator.clipboard.writeText(p.text).then(function() {
          el.textContent = '✅';
          setTimeout(function() { el.textContent = '📋'; }, 1500);
        });
      };
    }
  }
}

function renderEmptyState(container: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  const emptyState = document.createElement('div');
  emptyState.style.cssText = 'padding:20px 12px;text-align:center;color:' + cPanelFgDim + ';font-size:11px;';
  emptyState.innerHTML = '<div style="font-size:24px;margin-bottom:8px;">📋</div>' +
    '<div style="font-weight:600;margin-bottom:4px;">No prompts available</div>' +
    '<div style="font-size:10px;opacity:0.7;">Click ➕ below to create your first prompt</div>';
  container.appendChild(emptyState);
  container.appendChild(buildAddPromptButton(container, ctx, taskNextDeps));
}

function collectUniqueCategories(entries: Array<{ category?: string }>): string[] {
  const categories: string[] = [];
  const catSeen: Record<string, boolean> = {};
  for (const entry of entries) {
    const cat = (entry.category || '').trim();
    if (cat && !catSeen[cat.toLowerCase()]) {
      categories.push(cat);
      catSeen[cat.toLowerCase()] = true;
    }
  }
  return categories;
}

/** Combined filter key for snapshot validation — covers legacy single + new multi set. */
function _computeFilterKey(): string {
  const legacy = getPromptCategoryFilter() || '';
  const multi = Array.from(getPromptCategoryFilterSet()).sort().join(',');
  return legacy + '|' + multi + '|' + _currentSearchQuery;
}

function filterByCategory<T extends { name: string; text: string; category?: string; tags?: string[] }>(entries: T[]): T[] {
  let filtered = entries;
  const set = getPromptCategoryFilterSet();
  
  if (set.size > 0) {
    filtered = entries.filter(entry => set.has(String(entry.category || '').trim().toLowerCase()));
  } else {
    const legacy = getPromptCategoryFilter();
    if (legacy) {
      filtered = entries.filter(entry => (String(entry.category || '')).trim().toLowerCase() === legacy);
    }
  }

  if (_currentSearchQuery) {
    const q = _currentSearchQuery.toLowerCase();
    filtered = filtered.filter(entry => {
      const name = (entry.name || '').toLowerCase();
      const text = (entry.text || '').toLowerCase();
      const tags = (entry.tags || []).join(' ').toLowerCase();
      return name.includes(q) || text.includes(q) || tags.includes(q);
    });
  }

  return filtered;
}

function renderTaskNextSubmenu(container: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  const promptsDropdown = ctx.promptsDropdown;
  const { taskNextItem, taskNextSub } = _buildTaskNextMenuShell(promptsDropdown);

  _appendPresetCounts(taskNextSub, promptsDropdown, taskNextDeps);
  _appendCustomCountRow(taskNextSub, promptsDropdown, taskNextDeps);
  _appendTaskNextSettings(taskNextSub, promptsDropdown, taskNextDeps);
  container.appendChild(taskNextItem);
}

function _buildTaskNextMenuShell(promptsDropdown: HTMLElement): { taskNextItem: HTMLElement; taskNextSub: HTMLElement } {
  const taskNextItem = document.createElement('div');
  taskNextItem.style.cssText = 'border-bottom:1px solid rgba(124,58,237,0.3);';
  const taskNextRow = document.createElement('div');
  taskNextRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;cursor:pointer;font-size:11px;color:' + cPrimaryLight + ';font-weight:600;';
  taskNextRow.textContent = '⏭ Task Next';
  const taskNextArrow = document.createElement('span');
  taskNextArrow.textContent = '▸';
  taskNextArrow.style.cssText = 'font-size:10px;margin-left:4px;';
  taskNextRow.appendChild(taskNextArrow);

  const taskNextSub = document.createElement('div');
  taskNextSub.setAttribute('data-task-next-sub', '1');
  taskNextSub.setAttribute('data-task-next-anchor', 'right');
  // Issue 127 Bug B: sub-menu opens RIGHTWARD of the Task Next row by default
  // (position:fixed + computed left/top against row's getBoundingClientRect).
  // When right-side viewport space is insufficient, anchorTaskNextSub() flips
  // back to a static stacked-below layout so the menu never clips off-screen.
  taskNextSub.style.cssText = 'display:none;position:fixed;min-width:180px;max-width:240px;background:rgba(20,16,32,0.96);border:1px solid ' + cPrimary + ';border-radius:' + lDropdownRadius + ';box-shadow:0 8px 24px rgba(0,0,0,0.45);z-index:10002;';
  taskNextItem.appendChild(taskNextRow);
  taskNextItem.appendChild(taskNextSub);

  const showSub = function(): void {
    taskNextRow.style.background = cBtnMenuHover;
    taskNextArrow.textContent = '▾';
    taskNextSub.style.display = 'block';
    anchorTaskNextSub(taskNextRow, taskNextSub, promptsDropdown);
  };
  const hideSub = function(): void {
    taskNextRow.style.background = 'transparent';
    taskNextArrow.textContent = '▸';
    taskNextSub.style.display = 'none';
  };
  taskNextRow.onmouseover = showSub;
  taskNextRow.onclick = function(e: Event) {
    e.stopPropagation();
    if (taskNextSub.style.display === 'none') showSub(); else hideSub();
  };
  taskNextItem.onmouseout = function() {
    setTimeout(function() {
      if (!taskNextItem.matches(':hover')) hideSub();
    }, 100);
  };

  return { taskNextItem, taskNextSub };
}

function _appendPresetCounts(taskNextSub: HTMLElement, promptsDropdown: HTMLElement, taskNextDeps: TaskNextDeps): void {
  const presetCounts = [1, 2, 3, 5, 7, 10, 12, 15, 20, 30, 40];
  for (const count of presetCounts) {
    const subItem = document.createElement('div');
    subItem.style.cssText = 'padding:5px 12px;cursor:pointer;font-size:10px;color:' + cPanelFg + ';display:flex;justify-content:space-between;align-items:center;';
    
    const label = document.createElement('span');
    label.textContent = 'Next ' + count + ' task' + (count > 1 ? 's' : '');
    subItem.appendChild(label);

    const queueBtn = document.createElement('span');
    queueBtn.textContent = '➕';
    queueBtn.title = 'Add ' + count + ' tasks to queue';
    queueBtn.style.cssText = 'padding:2px 4px;font-size:10px;cursor:pointer;opacity:0.6;';
    queueBtn.onclick = async (e: Event) => {
      e.stopPropagation();
      const prompt = findNextTasksPrompt(taskNextDeps);
      if (!prompt) {
        showPasteToast('❌ "Next Tasks" prompt not found', true);
        return;
      }
      const projectName = getDisplayProjectName();
      for (let i = 0; i < count; i++) {
        await addTaskToQueue(prompt.text, projectName);
      }
      showPasteToast(`✅ Queued ${count} tasks`, false);
      const queueList = document.getElementById('task-queue-list');
      if (queueList) {
        // Force refresh Task Queue UI if visible
        queueList.dispatchEvent(new CustomEvent('refresh-queue'));
      }
    };
    subItem.appendChild(queueBtn);

    subItem.onmouseover = function() { (this as HTMLElement).style.background = cBtnMenuHover; queueBtn.style.opacity = '1'; };
    subItem.onmouseout = function() { (this as HTMLElement).style.background = 'transparent'; queueBtn.style.opacity = '0.6'; };
    
    label.onclick = function(e: Event) {
      e.stopPropagation();
      promptsDropdown.style.display = 'none';
      taskNextSub.style.display = 'none';
      runTaskNextLoop(taskNextDeps, count);
    };
    taskNextSub.appendChild(subItem);
  }
}


function _appendCustomCountRow(taskNextSub: HTMLElement, promptsDropdown: HTMLElement, taskNextDeps: TaskNextDeps): void {
  const customRow = document.createElement('div');
  customRow.style.cssText = 'display:flex;align-items:center;gap:4px;padding:5px 12px;border-top:1px solid rgba(124,58,237,0.2);';
  const customLabel = document.createElement('span');
  customLabel.textContent = 'Custom:';
  customLabel.style.cssText = 'font-size:10px;color:' + cPrimaryLight + ';';
  customRow.appendChild(customLabel);
  const customInput = document.createElement('input');
  customInput.type = 'number'; customInput.min = '1'; customInput.max = '999'; customInput.placeholder = '#';
  customInput.style.cssText = 'width:50px;padding:3px 5px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';font-size:10px;';
  customInput.onclick = function(e: Event) { e.stopPropagation(); };
  customRow.appendChild(customInput);
  const goBtn = document.createElement('span');
  goBtn.textContent = '▶'; goBtn.title = 'Go';
  goBtn.style.cssText = 'cursor:pointer;font-size:11px;color:' + cPrimary + ';';
  goBtn.onclick = function(e: Event) {
    e.stopPropagation();
    const n = parseInt(customInput.value);
    if (!n || n < 1 || n > 999) { showPasteToast('⚠️ Enter 1–999', true); return; }
    promptsDropdown.style.display = 'none';
    taskNextSub.style.display = 'none';
    runTaskNextLoop(taskNextDeps, n);
  };
  customInput.onkeydown = function(e: KeyboardEvent) { if (e.key === 'Enter') { e.stopPropagation(); goBtn.click(); } };
  customRow.appendChild(goBtn);
  taskNextSub.appendChild(customRow);
}

function _appendTaskNextSettings(taskNextSub: HTMLElement, promptsDropdown: HTMLElement, taskNextDeps: TaskNextDeps): void {
  const settingsItem = document.createElement('div');
  settingsItem.style.cssText = 'padding:5px 12px;cursor:pointer;font-size:10px;color:' + cPrimaryLight + ';border-top:1px solid rgba(124,58,237,0.2);';
  settingsItem.textContent = '⚙ Settings';
  settingsItem.onmouseover = function() { (this as HTMLElement).style.background = cBtnMenuHover; };
  settingsItem.onmouseout = function() { (this as HTMLElement).style.background = 'transparent'; };
  settingsItem.onclick = function(e: Event) {
    e.stopPropagation();
    promptsDropdown.style.display = 'none';
    taskNextSub.style.display = 'none';
    openTaskNextSettingsModal(taskNextDeps);
  };
  taskNextSub.appendChild(settingsItem);
}

interface PromptEntry { id?: string; slug?: string; name: string; text: string; category?: string; isDefault?: boolean; tags?: string[] }

function renderPromptItem(
  idx: number, p: PromptEntry, promptsDropdown: HTMLElement,
  promptsCfg: ReturnType<typeof getPromptsConfig>, ctx: PromptContext, taskNextDeps: TaskNextDeps
): HTMLElement {
  const item = document.createElement('div');
  item.setAttribute('data-prompt-idx', String(idx));
  const hasText = Boolean(p.text);
  item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;cursor:pointer;font-size:10px;color:' + (hasText ? '#c9a8ef' : '#6b5a8a') + ';border-bottom:1px solid rgba(124,58,237,0.15);' + (hasText ? '' : 'opacity:0.6;');
  item.onmouseover = function() { (this as HTMLElement).style.background = cBtnMenuHover; };
  item.onmouseout = function() { (this as HTMLElement).style.background = 'transparent'; };

  const badge = document.createElement('span');
  badge.textContent = String(idx + 1);
  badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:3px;background:' + (hasText ? cPrimary : 'rgba(124,58,237,0.3)') + ';color:' + cPanelFg + ';font-size:8px;font-weight:700;margin-right:6px;flex-shrink:0;';
  item.appendChild(badge);

  const nameSpan = document.createElement('span');
  nameSpan.textContent = p.name + (hasText ? '' : ' (text not loaded)');
  nameSpan.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  nameSpan.title = p.text || 'Prompt text not available — click Load to refresh';
  
  const contentWrap = document.createElement('div');
  contentWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
  contentWrap.appendChild(nameSpan);

  if (p.tags && p.tags.length > 0) {
    const tagsWrap = document.createElement('div');
    tagsWrap.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:2px;';
    p.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.textContent = tag;
      tagEl.style.cssText = 'font-size:8px;background:rgba(124,58,237,0.2);color:' + cPrimaryLight + ';padding:0px 4px;border-radius:2px;border:1px solid rgba(124,58,237,0.2);';
      tagsWrap.appendChild(tagEl);
    });
    contentWrap.appendChild(tagsWrap);
  }

  item.appendChild(contentWrap);

  const actions = document.createElement('span');
  actions.setAttribute('data-prompt-actions', '');
  actions.style.cssText = 'display:flex;align-items:center;gap:2px;margin-left:4px;flex-shrink:0;';

  if (hasText) {
    appendPromptActions(actions, p, promptsDropdown, promptsCfg, ctx, taskNextDeps);
    item.onclick = async function(e: MouseEvent) {
      if (actions.contains(e.target as Node)) return;
      
      // Inline Editor Trigger (Alt + Click)
      if (e.altKey) {
        e.stopPropagation();
        _openInlinePromptEditor(item, p, ctx, taskNextDeps);
        return;
      }

      log('Prompt clicked: "' + p.name + '" (' + p.text.length + ' chars)', 'info');
      const outcome = await pasteIntoEditor(p.text, promptsCfg, getByXPathAsElement);
      if (outcome === 'injected' || outcome === 'clipboard') {
        promptsDropdown.style.display = 'none';
      }
    };
  } else {
    // Prompt text not loaded — show a helpful message on click
    item.onclick = function() {
      showPasteToast('⚠️ Prompt text not loaded — click ↻ Load to refresh', true);
    };
  }
  item.appendChild(actions);
  return item;
}

/** Open an inline editor for a prompt. */
function _openInlinePromptEditor(item: HTMLElement, p: LoaderPromptEntry, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  const originalHtml = item.innerHTML;
  item.innerHTML = '';
  item.style.background = 'rgba(0,0,0,0.3)';
  item.style.padding = '8px';
  item.onclick = (e) => e.stopPropagation();

  const nameInput = document.createElement('input');
  nameInput.value = p.name;
  nameInput.placeholder = 'Prompt Name';
  nameInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(124,58,237,0.3);color:#fff;font-size:10px;padding:4px;border-radius:3px;margin-bottom:4px;';
  
  const textInput = document.createElement('textarea');
  textInput.value = p.text;
  textInput.placeholder = 'Prompt Content';
  textInput.style.cssText = 'width:100%;height:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(124,58,237,0.3);color:#fff;font-size:10px;padding:4px;border-radius:3px;resize:vertical;';

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;justify-content:flex-end;gap:4px;margin-top:6px;';

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.style.cssText = 'padding:2px 8px;font-size:9px;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:3px;cursor:pointer;';
  cancel.onclick = () => {
    item.innerHTML = originalHtml;
    item.style.background = 'transparent';
    item.style.padding = '6px 8px';
    // Re-render whole dropdown to restore listeners correctly
    renderPromptsDropdown(ctx, taskNextDeps);
  };

  const save = document.createElement('button');
  save.textContent = 'Save';
  save.style.cssText = 'padding:2px 10px;font-size:9px;background:#6d28d9;border:none;color:#fff;border-radius:3px;cursor:pointer;font-weight:600;';
  save.onclick = () => {
    const updated = { ...p, name: nameInput.value.trim(), text: textInput.value.trim() };
    if (!updated.name || !updated.text) return;
    
    sendToExtension('SAVE_PROMPT', { prompt: updated }).then(function(resp: Record<string, unknown>) {
      if (resp && resp.isOk) {
        log('Prompt updated inline: ' + updated.name, 'success');
        clearLoadedPrompts();
        clearUISnapshot();
        loadPromptsFromJson().then(function() { renderPromptsDropdown(ctx, taskNextDeps); });
      }
    });
  };

  footer.appendChild(cancel);
  footer.appendChild(save);
  item.appendChild(nameInput);
  item.appendChild(textInput);
  item.appendChild(footer);
  
  nameInput.focus();
}


function appendPromptActions(
  actions: HTMLElement, p: PromptEntry, promptsDropdown: HTMLElement,
  _promptsCfg: ReturnType<typeof getPromptsConfig>, ctx: PromptContext, taskNextDeps: TaskNextDeps,
): void {
  actions.appendChild(_buildFavoriteIcon(p, promptsDropdown, ctx, taskNextDeps));
  actions.appendChild(_buildEditIcon(p, promptsDropdown, ctx, taskNextDeps));
  if (!p.isDefault) {
    actions.appendChild(_buildDeleteIcon(p, promptsDropdown, ctx, taskNextDeps));
  }
  actions.appendChild(_buildCopyIcon(p));
}

/** Build the favorite ⭐ toggle icon for a prompt item. */
function _buildFavoriteIcon(p: PromptEntry, _dropdown: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): HTMLElement {
  const isFav = !!p.isFavorite;
  const icon = _makeActionIcon(isFav ? '⭐' : '☆', isFav ? 'Remove from favorites' : 'Mark as favorite', isFav ? '1' : '0.4');
  icon.onclick = function(e: Event) {
    e.stopPropagation();
    const updated = { ...p, isFavorite: !isFav };
    sendToExtension('SAVE_PROMPT', { prompt: updated }).then(function(resp: Record<string, unknown>) {
      if (resp && resp.isOk) {
        log((!isFav ? 'Added to' : 'Removed from') + ' favorites: ' + p.name, 'success');
        clearLoadedPrompts();
        clearUISnapshot();
        loadPromptsFromJson().then(function() { renderPromptsDropdown(ctx, taskNextDeps); });
      }
    });
  };
  return icon;
}


/** Build the edit ✏️ action icon for a prompt item. */
function _buildEditIcon(p: PromptEntry, dropdown: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): HTMLElement {
  const icon = _makeActionIcon('✏️', 'Edit prompt', '0.6');
  icon.onclick = function(e: Event) {
    e.stopPropagation();
    dropdown.style.display = 'none';
    openPromptCreationModal(ctx, taskNextDeps, { id: p.id, name: p.name, text: p.text, category: p.category, isDefault: p.isDefault });
  };
  return icon;
}

/** Build the delete 🗑️ action icon for a prompt item. */
function _buildDeleteIcon(p: PromptEntry, dropdown: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): HTMLElement {
  const icon = _makeActionIcon('🗑️', 'Delete prompt', '0.6');
  icon.onclick = function(e: Event) {
    e.stopPropagation();
    if (!confirm('Delete prompt "' + p.name + '"?')) return;
    _executeDeletePrompt(p, dropdown, ctx, taskNextDeps);
  };
  return icon;
}

/** Execute prompt deletion via extension message. */
function _executeDeletePrompt(p: PromptEntry, _dropdown: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  sendToExtension('DELETE_PROMPT', { promptId: p.id }).then(function(resp: Record<string, unknown>) {
    if (resp && resp.isOk) {
      log('Deleted prompt: ' + p.name, 'success');
      clearLoadedPrompts();
      clearUISnapshot();
      loadPromptsFromJson().then(function() { renderPromptsDropdown(ctx, taskNextDeps); });
    } else {
      logError('Failed to delete prompt', '' + p.name);
    }
  });
}

/** Build the copy 📋 action icon for a prompt item. */
function _buildCopyIcon(p: PromptEntry): HTMLElement {
  const icon = _makeActionIcon('📋', 'Copy to clipboard', '0.7');
  icon.style.fontSize = '11px';
  icon.onclick = function(e: Event) {
    e.stopPropagation();
    navigator.clipboard.writeText(p.text).then(function() {
      log('Prompt copied: ' + p.name, 'success');
      icon.textContent = '✅';
      setTimeout(function() { icon.textContent = '📋'; }, 1500);
    });
  };
  return icon;
}

/** Create a styled action icon span with hover opacity. */
function _makeActionIcon(emoji: string, title: string, baseOpacity: string): HTMLElement {
  const icon = document.createElement('span');
  icon.textContent = emoji;
  icon.title = title;
  icon.style.cssText = 'cursor:pointer;font-size:10px;opacity:' + baseOpacity + ';';
  icon.onmouseover = function() { (this as HTMLElement).style.opacity = '1'; };
  icon.onmouseout = function() { (this as HTMLElement).style.opacity = baseOpacity + ';'; };
  return icon;
}

function buildAddPromptButton(promptsDropdown: HTMLElement, ctx: PromptContext, taskNextDeps: TaskNextDeps): HTMLElement {
  const addBtn = document.createElement('div');
  addBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:8px;cursor:pointer;font-size:11px;color:' + cPrimaryLight + ';border-top:1px solid rgba(124,58,237,0.3);';
  addBtn.textContent = '➕ Add New Prompt';
  addBtn.onmouseover = function() { (this as HTMLElement).style.background = 'rgba(139,92,246,0.2)'; };
  addBtn.onmouseout = function() { (this as HTMLElement).style.background = 'transparent'; };
  addBtn.onclick = function(e: Event) {
    e.stopPropagation();
    promptsDropdown.style.display = 'none';
    openPromptCreationModal(ctx, taskNextDeps, null);
  };
  return addBtn;
}
