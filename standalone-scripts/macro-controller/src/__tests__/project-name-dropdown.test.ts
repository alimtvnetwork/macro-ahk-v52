/**
 * Issue 129 Step 10 — Project-name ▾ dropdown.
 *
 * Pure DOM-level tests with jsdom; all action handlers are injected
 * mocks so this verifies the wiring + dispatch contract without depending
 * on rename / gitsync / remix internals.
 *
 * Honors `mem://preferences/test-with-features` +
 * `mem://constraints/no-retry-policy` (handlers run once per click).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../shared-state', () => ({
    cPanelBg: '#111',
    cPanelFg: '#eee',
    cPrimaryLight: '#bae6fd',
    lDropdownRadius: '4px',
}));

import {
    buildMenuEntries,
    buildProjectNameCaret,
    removeProjectNameDropdown,
    showProjectNameDropdown,
    type ProjectNameDropdownCtx,
    type ProjectNameDropdownHandlers,
} from '../project-name-dropdown';

function makeHandlers(): { handlers: ProjectNameDropdownHandlers; calls: Record<string, number> } {
    const calls: Record<string, number> = {
        onRename: 0, onConnect: 0, onOpen: 0, onDisconnect: 0, onStatus: 0, onRemix: 0,
    };
    const bump = (k: string) => () => { calls[k]++; };
    return {
        calls,
        handlers: {
            onRename: bump('onRename'),
            onConnect: bump('onConnect'),
            onOpen: bump('onOpen'),
            onDisconnect: bump('onDisconnect'),
            onStatus: bump('onStatus'),
            onRemix: bump('onRemix'),
        },
    };
}

const ctx: ProjectNameDropdownCtx = {
    projectId: 'pid-1', workspaceId: 'ws-1', currentProjectName: 'My App',
};

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('project-name dropdown', () => {
    it('buildMenuEntries returns the six expected actions in order', () => {
        const { handlers } = makeHandlers();
        const entries = buildMenuEntries(handlers);
        expect(entries.map(e => e.id)).toEqual(
            ['rename', 'connect', 'open', 'disconnect', 'status', 'remix'],
        );
        expect(entries.every(e => typeof e.run === 'function')).toBe(true);
    });

    it('showProjectNameDropdown renders six items in the document', () => {
        const { handlers } = makeHandlers();
        const anchor = document.createElement('button');
        document.body.appendChild(anchor);
        const dd = showProjectNameDropdown(anchor, ctx, handlers);
        expect(dd.querySelectorAll('[data-action]').length).toBe(6);
        expect(document.getElementById('marco-project-name-dropdown')).not.toBeNull();
    });

    it('removeProjectNameDropdown removes the menu node', () => {
        const { handlers } = makeHandlers();
        const anchor = document.createElement('button');
        document.body.appendChild(anchor);
        showProjectNameDropdown(anchor, ctx, handlers);
        removeProjectNameDropdown();
        expect(document.getElementById('marco-project-name-dropdown')).toBeNull();
    });

    it('clicking an item invokes the matching handler exactly once and closes the menu', () => {
        const { handlers, calls } = makeHandlers();
        const anchor = document.createElement('button');
        document.body.appendChild(anchor);
        const dd = showProjectNameDropdown(anchor, ctx, handlers);
        const disconnect = dd.querySelector('[data-action="disconnect"]') as HTMLElement;
        disconnect.click();
        expect(calls.onDisconnect).toBe(1);
        expect(document.getElementById('marco-project-name-dropdown')).toBeNull();
    });

    it('a second show replaces the previous menu (no stacking)', () => {
        const { handlers } = makeHandlers();
        const anchor = document.createElement('button');
        document.body.appendChild(anchor);
        showProjectNameDropdown(anchor, ctx, handlers);
        showProjectNameDropdown(anchor, ctx, handlers);
        expect(document.querySelectorAll('#marco-project-name-dropdown').length).toBe(1);
    });

    it('buildProjectNameCaret renders ▾ button that opens the dropdown when ctx is provided', () => {
        const { handlers } = makeHandlers();
        const caret = buildProjectNameCaret(() => ctx, handlers);
        document.body.appendChild(caret);
        expect(caret.textContent).toBe('▾');
        caret.click();
        expect(document.getElementById('marco-project-name-dropdown')).not.toBeNull();
    });

    it('caret does NOT open the dropdown when getCtx returns null', () => {
        const { handlers } = makeHandlers();
        const caret = buildProjectNameCaret(() => null, handlers);
        document.body.appendChild(caret);
        caret.click();
        expect(document.getElementById('marco-project-name-dropdown')).toBeNull();
    });

    it('each handler is dispatched independently with the given ctx', () => {
        const seen: ProjectNameDropdownCtx[] = [];
        const handlers: ProjectNameDropdownHandlers = {
            onRename: c => { seen.push(c); },
            onConnect: c => { seen.push(c); },
            onOpen: c => { seen.push(c); },
            onDisconnect: c => { seen.push(c); },
            onStatus: c => { seen.push(c); },
            onRemix: c => { seen.push(c); },
        };
        const anchor = document.createElement('button');
        document.body.appendChild(anchor);
        for (const id of ['rename', 'connect', 'open', 'disconnect', 'status', 'remix']) {
            const dd = showProjectNameDropdown(anchor, ctx, handlers);
            (dd.querySelector('[data-action="' + id + '"]') as HTMLElement).click();
        }
        expect(seen.length).toBe(6);
        expect(seen.every(c => c.projectId === 'pid-1' && c.workspaceId === 'ws-1')).toBe(true);
    });
});
