/**
 * MacroLoop Controller — Project-name ▾ dropdown (Issue 129 / Step 10)
 *
 * Builds the dropdown menu attached to the project-name caret in the panel
 * header. Wires Steps 5–9 (ensureGithubRepo, gitsync cache, remix cache,
 * navigate-to-remixed, invalidate-sentinel, disconnect-repo) plus the
 * existing rename/open/status helpers into six menu entries:
 *
 *   ✏️  Rename project
 *   🔗  Connect GitHub repo
 *   🌐  Open GitHub repo
 *   ⛓️‍💥 Disconnect GitHub repo
 *   📡  Gitsync status
 *   🔀  Remix this project
 *
 * Concerns we deliberately do NOT own here:
 *   - The action implementations themselves live in their own modules
 *     (rename-*.ts, gitsync/*.ts, remix-*.ts). This module only composes
 *     them so the dropdown is a pure presentation+wiring layer that is
 *     trivial to unit-test with mock handlers.
 *   - Confirmation prompts: `confirmAndDisconnectGithubRepo` already wraps
 *     `disconnectGithubRepo` with a native confirm() and is the caller's
 *     responsibility to pass in.
 *
 * Standards:
 *   - `mem://architecture/logging-data-contract` — PascalCase + Logger.
 *   - `mem://standards/formatting-and-logic` — CQ14 braces, no `unknown`
 *     except in CaughtError.
 *   - `mem://preferences/test-with-features` — companion unit tests in
 *     `__tests__/project-name-dropdown.test.ts`.
 */

import { cPanelBg, cPanelFg, cPrimaryLight, lDropdownRadius } from './shared-state';

const DROPDOWN_ID = 'marco-project-name-dropdown';

export interface ProjectNameDropdownCtx {
  readonly projectId: string;
  readonly workspaceId: string;
  readonly currentProjectName: string;
}

export interface ProjectNameDropdownHandlers {
  onRename(ctx: ProjectNameDropdownCtx): void | Promise<void>;
  onConnect(ctx: ProjectNameDropdownCtx): void | Promise<void>;
  onOpen(ctx: ProjectNameDropdownCtx): void | Promise<void>;
  onDisconnect(ctx: ProjectNameDropdownCtx): void | Promise<void>;
  onStatus(ctx: ProjectNameDropdownCtx): void | Promise<void>;
  onRemix(ctx: ProjectNameDropdownCtx): void | Promise<void>;
}

interface MenuEntry {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly sublabel: string;
  readonly run: (ctx: ProjectNameDropdownCtx) => void | Promise<void>;
}

/** Pure factory — exported for testing. */
export function buildMenuEntries(handlers: ProjectNameDropdownHandlers): readonly MenuEntry[] {
  return [
    { id: 'rename',     icon: '✏️',  label: 'Rename project',       sublabel: 'Change the project title',          run: handlers.onRename },
    { id: 'connect',    icon: '🔗',  label: 'Connect GitHub repo',  sublabel: 'Link a GitHub repository',          run: handlers.onConnect },
    { id: 'open',       icon: '🌐',  label: 'Open GitHub repo',     sublabel: 'View the linked repository',        run: handlers.onOpen },
    { id: 'disconnect', icon: '⛓️‍💥', label: 'Disconnect GitHub repo', sublabel: 'Stop syncing to GitHub',           run: handlers.onDisconnect },
    { id: 'status',     icon: '📡',  label: 'Gitsync status',       sublabel: 'Show last sync result',             run: handlers.onStatus },
    { id: 'remix',      icon: '🔀',  label: 'Remix this project',   sublabel: 'Duplicate into a new project',      run: handlers.onRemix },
  ] as const;
}

export function removeProjectNameDropdown(): void {
  const old = document.getElementById(DROPDOWN_ID);
  if (old) {
    old.remove();
  }
}

function buildDropdownItem(entry: MenuEntry, ctx: ProjectNameDropdownCtx): HTMLElement {
  const item = document.createElement('div');
  item.setAttribute('data-action', entry.id);
  item.style.cssText = 'padding:7px 10px;cursor:pointer;font-size:11px;color:' + cPanelFg
    + ';display:flex;align-items:flex-start;gap:8px;border-bottom:1px solid rgba(148,163,184,0.10);';
  item.innerHTML =
    '<span style="font-size:12px;line-height:14px;">' + entry.icon + '</span>'
    + '<span style="display:flex;flex-direction:column;gap:1px;">'
    +   '<span style="font-weight:600;">' + entry.label + '</span>'
    +   '<span style="font-size:9px;color:#94a3b8;">' + entry.sublabel + '</span>'
    + '</span>';
  item.onmouseenter = function (): void { item.style.background = 'rgba(0,122,204,0.18)'; };
  item.onmouseleave = function (): void { item.style.background = 'transparent'; };
  item.onclick = function (e: MouseEvent): void {
    e.stopPropagation();
    removeProjectNameDropdown();
    void entry.run(ctx);
  };
  return item;
}

/**
 * Show the dropdown anchored beneath `anchorEl`. Caller is responsible
 * for providing the current project/workspace context AND for supplying
 * the action handlers — making this module zero-dependency for tests.
 */
export function showProjectNameDropdown(
  anchorEl: HTMLElement,
  ctx: ProjectNameDropdownCtx,
  handlers: ProjectNameDropdownHandlers,
): HTMLElement {
  removeProjectNameDropdown();
  const rect = anchorEl.getBoundingClientRect();
  const dd = document.createElement('div');
  dd.id = DROPDOWN_ID;
  dd.style.cssText = [
    'position:fixed',
    'top:' + (rect.bottom + 4) + 'px',
    'left:' + Math.max(8, rect.left) + 'px',
    'z-index:100001',
    'min-width:210px',
    'background:' + cPanelBg,
    'color:' + cPanelFg,
    'border:1px solid ' + cPrimaryLight,
    'border-radius:' + lDropdownRadius,
    'box-shadow:0 6px 16px rgba(0,0,0,0.55)',
    'overflow:hidden',
  ].join(';') + ';';

  const entries = buildMenuEntries(handlers);
  for (const entry of entries) {
    dd.appendChild(buildDropdownItem(entry, ctx));
  }
  const last = dd.lastElementChild as HTMLElement | null;
  if (last) {
    last.style.borderBottom = 'none';
  }

  document.body.appendChild(dd);
  setTimeout(function () {
    document.addEventListener('click', removeProjectNameDropdown, { once: true });
  }, 10);
  return dd;
}

/**
 * Build the project-name caret button. Caller wires it into the panel
 * header next to the project-name label. The caret opens the dropdown
 * using the supplied `getCtx` (re-evaluated on every click so workspace
 * switches reflect immediately) and `handlers`.
 */
export function buildProjectNameCaret(
  getCtx: () => ProjectNameDropdownCtx | null,
  handlers: ProjectNameDropdownHandlers,
): HTMLElement {
  const arrow = document.createElement('button');
  arrow.type = 'button';
  arrow.setAttribute('data-marco-role', 'project-name-caret');
  arrow.title = 'Project actions';
  arrow.style.cssText = 'background:transparent;color:#bae6fd;border:none;padding:2px 5px;'
    + 'font-size:12px;cursor:pointer;line-height:1;';
  arrow.textContent = '▾';
  arrow.onclick = function (e: Event): void {
    e.stopPropagation();
    const ctx = getCtx();
    if (!ctx) {
      return;
    }
    showProjectNameDropdown(arrow, ctx, handlers);
  };
  return arrow;
}
