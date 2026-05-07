/**
 * MacroLoop Controller — Projects Modal
 *
 * Floating popup (styled after bulk-rename) listing every currently open
 * Lovable project tab grouped by workspace. Data source: the existing
 * `GET_OPEN_LOVABLE_TABS` background handler — the macro-controller runs
 * in the MAIN world and cannot call `chrome.tabs` directly
 * (mem://architecture/injection-context-awareness).
 *
 * Spec: prompts/04-projects-map-spec.md (Projects Map entry).
 * Standards applied:
 *   - mem://architecture/extension-error-management — failures surface as
 *     visible UI rows + activity-log entries via `logError`.
 *   - mem://standards/error-logging-via-namespace-logger — `logError` here
 *     is the macro-controller's namespace-bound logger wrapper.
 *   - mem://constraints/no-retry-policy — single fetch, no auto-retry;
 *     user clicks Refresh.
 */

import { cPanelBg, cPrimary, cPrimaryBgA, cPrimaryLighter, cPanelFgDim } from '../shared-state';
import { sendToExtension } from './prompt-loader';
import { log } from '../logging';
import { logError } from '../error-utils';
import type { DraggableElement } from '../types';

const DIALOG_ID = 'marco-projects-modal';

interface OpenTabRow {
    readonly tabId: number | null;
    readonly title: string;
    readonly url: string;
    readonly active: boolean;
    readonly projectId: string | null;
    readonly projectName: string | null;
    readonly detectedWorkspaceName: string | null;
    readonly detectedWorkspaceId: string | null;
    readonly bindingSource: 'injection' | 'probe' | 'none';
}

interface OpenTabsResponse {
    readonly tabs?: ReadonlyArray<OpenTabRow>;
    readonly capturedAt?: string;
    readonly isOk?: boolean;
    readonly errorMessage?: string;
}

/** Public entry — opens (or re-opens) the Projects popup. */
export function showProjectsModal(): void {
    removeProjectsModal();

    const panel = createPanel();
    const titleBar = createTitleBar(panel);
    panel.appendChild(titleBar);

    const body = document.createElement('div');
    body.style.cssText = 'padding:10px;max-height:60vh;overflow-y:auto;';
    body.innerHTML = renderEmpty('Loading…');
    panel.appendChild(body);

    const footer = createFooter(function () { void loadAndRender(body); });
    panel.appendChild(footer);

    document.body.appendChild(panel);
    void loadAndRender(body);
}

export function removeProjectsModal(): void {
    const existing = document.getElementById(DIALOG_ID) as DraggableElement | null;
    if (!existing) return;
    if (existing.__cleanupDrag) existing.__cleanupDrag();
    existing.remove();
}

async function loadAndRender(body: HTMLElement): Promise<void> {
    body.innerHTML = renderEmpty('Loading…');
    try {
        const resp = await sendToExtension('GET_OPEN_LOVABLE_TABS', {}) as unknown as OpenTabsResponse;
        if (!resp || resp.isOk === false) {
            const reason = resp?.errorMessage ?? 'no response from background';
            body.innerHTML = renderError(reason);
            return;
        }
        const tabs = Array.isArray(resp.tabs) ? resp.tabs : [];
        body.innerHTML = renderGrouped(tabs, resp.capturedAt);
        attachRowClicks(body);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logError('Projects', 'Load open tabs failed: ' + msg);
        body.innerHTML = renderError(msg);
    }
}

function attachRowClicks(body: HTMLElement): void {
    body.addEventListener('click', function (e: Event): void {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const row = target.closest('[data-open-url]') as HTMLElement | null;
        if (!row) return;
        const url = row.getAttribute('data-open-url') ?? '';
        if (!url) return;
        try { window.open(url, '_blank', 'noopener'); }
        catch (err) { log('Projects: open tab failed: ' + String(err), 'warn'); }
    });
}

// ── Rendering ──

function renderEmpty(text: string): string {
    return '<div style="color:' + cPanelFgDim + ';font-size:11px;padding:6px;">' + escapeHtml(text) + '</div>';
}

function renderError(reason: string): string {
    return '<div style="color:#fca5a5;font-size:11px;padding:6px;">⚠ ' + escapeHtml(reason) + '</div>';
}

function renderGrouped(tabs: ReadonlyArray<OpenTabRow>, capturedAt: string | undefined): string {
    if (tabs.length === 0) {
        return renderEmpty('No Lovable project tabs are open.');
    }

    const groups = new Map<string, OpenTabRow[]>();
    for (const t of tabs) {
        const key = t.detectedWorkspaceName || t.projectName || '(unbound)';
        const list = groups.get(key);
        if (list) list.push(t);
        else groups.set(key, [t]);
    }

    let html = '<div style="font-size:10px;color:#94a3b8;padding:0 0 6px 0;">'
        + tabs.length + ' open tab' + (tabs.length === 1 ? '' : 's')
        + ' across ' + groups.size + ' workspace' + (groups.size === 1 ? '' : 's')
        + (capturedAt ? ' · ' + escapeHtml(formatTime(capturedAt)) : '')
        + '</div>';

    const sortedKeys = Array.from(groups.keys()).sort(function (a, b) { return a.localeCompare(b); });
    for (const ws of sortedKeys) {
        const rows = groups.get(ws) ?? [];
        html += '<div style="margin-bottom:8px;">'
            + '<div style="font-size:10px;color:' + cPrimaryLighter + ';font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:2px 0;border-bottom:1px solid rgba(124,58,237,0.3);margin-bottom:2px;">'
            + escapeHtml(ws) + ' <span style="color:#64748b;font-weight:400;">(' + rows.length + ')</span>'
            + '</div>';
        for (const t of rows) html += renderProjectRow(t);
        html += '</div>';
    }
    return html;
}

function renderProjectRow(t: OpenTabRow): string {
    const name = t.projectName || extractProjectIdFromUrl(t.url) || t.title || '(untitled)';
    const activeDot = t.active
        ? '<span style="color:#fbbf24;margin-right:4px;" title="Active in window">●</span>'
        : '<span style="margin-right:4px;opacity:0;">●</span>';
    const idLabel = t.projectId
        ? '<span style="color:#64748b;font-size:9px;">' + escapeHtml(t.projectId) + '</span>'
        : '';
    return ''
        + '<div data-open-url="' + escapeHtml(t.url) + '" '
        +   'title="' + escapeHtml(t.title) + '\nClick to open in new tab" '
        +   'style="display:flex;align-items:center;gap:6px;padding:3px 4px;cursor:pointer;border-radius:3px;font-size:11px;font-family:monospace;" '
        +   'onmouseover="this.style.background=\'rgba(124,58,237,0.15)\'" '
        +   'onmouseout="this.style.background=\'transparent\'">'
        +   activeDot
        +   '<span style="color:#67e8f9;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(name) + '</span>'
        +   idLabel
        + '</div>';
}

function extractProjectIdFromUrl(url: string): string | null {
    try {
        const m = /\/projects\/([^/?#]+)/.exec(new URL(url).pathname);
        return m ? m[1] : null;
    } catch { return null; }
}

// ── Shell / chrome ──

function createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = DIALOG_ID;
    panel.style.cssText =
        'position:fixed;top:80px;right:40px;z-index:100002;background:' + cPanelBg
        + ';border:1px solid ' + cPrimary
        + ';border-radius:8px;padding:0;min-width:420px;max-width:560px;'
        + 'box-shadow:0 8px 32px rgba(0,0,0,.6);font-family:monospace;resize:both;overflow:hidden;';
    return panel;
}

function createTitleBar(panel: HTMLElement): HTMLElement {
    const bar = document.createElement('div');
    bar.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:' + cPrimaryBgA
        + ';cursor:grab;user-select:none;border-bottom:1px solid rgba(124,58,237,0.3);';
    const title = document.createElement('span');
    title.style.cssText = 'font-size:11px;color:' + cPrimaryLighter + ';font-weight:700;';
    title.textContent = '📂 Projects — Open Lovable Tabs';
    const closeBtn = document.createElement('span');
    closeBtn.style.cssText = 'cursor:pointer;color:#94a3b8;font-size:14px;padding:0 4px;';
    closeBtn.textContent = '✕';
    closeBtn.onclick = function (): void { removeProjectsModal(); };
    bar.appendChild(title);
    bar.appendChild(closeBtn);
    attachDrag(panel, bar, closeBtn);
    return bar;
}

function createFooter(onRefresh: () => void): HTMLElement {
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:6px 10px;border-top:1px solid rgba(124,58,237,0.3);display:flex;justify-content:flex-end;gap:6px;';
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = '⟳ Refresh';
    refresh.style.cssText = 'padding:3px 10px;background:#1e3a5f;color:#cbd5e1;border:1px solid #3b6fa0;border-radius:3px;font-size:10px;cursor:pointer;';
    refresh.onclick = function (): void { onRefresh(); };
    footer.appendChild(refresh);
    return footer;
}

function attachDrag(panel: HTMLElement, bar: HTMLElement, closeBtn: HTMLElement): void {
    let dragging = false, offX = 0, offY = 0;
    const onDown = function (e: MouseEvent): void {
        if (e.target === closeBtn) return;
        dragging = true;
        const r = panel.getBoundingClientRect();
        offX = e.clientX - r.left; offY = e.clientY - r.top;
        bar.style.cursor = 'grabbing';
        e.preventDefault();
    };
    const onMove = function (e: MouseEvent): void {
        if (!dragging) return;
        panel.style.left = (e.clientX - offX) + 'px';
        panel.style.top = (e.clientY - offY) + 'px';
        panel.style.right = 'auto';
    };
    const onUp = function (): void { dragging = false; bar.style.cursor = 'grab'; };
    bar.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    (panel as DraggableElement).__cleanupDrag = function (): void {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };
}

function formatTime(iso: string): string {
    try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}