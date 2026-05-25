/**
 * ws-members-panel — verifies basic dispatch:
 *   - showWsMembersPanel mounts a single panel element with the workspace name
 *   - calling it again for a different workspace re-uses the same element
 *   - hideWsMembersPanel hides without removing
 *   - showWsMembersPanel is a no-op for empty wsId
 *
 * Closes spec/22-app-issues/113 acceptance: "Vitest coverage exercises
 * tooltip structure + members panel dispatch."
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logging', () => ({ log: vi.fn() }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../toast', () => ({ showToast: vi.fn() }));
vi.mock('../credit-poll-events', () => ({ onCreditPollTick: () => () => {} }));
vi.mock('../ws-members-mutations', () => ({
  inviteMember: vi.fn(), removeMember: vi.fn(), updateMemberRole: vi.fn(),
}));
vi.mock('../ws-members-fetch', () => ({
  fetchWorkspaceMembers: vi.fn(() => new Promise(() => {})), // never resolves -> stays in loading
  clearMembersCache: vi.fn(),
  DEFAULT_MEMBERS_PAGE_LIMIT: 20,
  MEMBERS_PAGE_LIMIT_STEPS: [10, 20, 50],
}));
vi.mock('../shared-state', () => ({
  cPanelBg: '#000', cPanelFg: '#fff', cPanelBorder: '#333',
  cPrimary: '#7c3aed', cPrimaryLight: '#a78bfa', lDropdownRadius: '6px',
}));
vi.mock('../workspace-status', () => ({ formatDateDDMMMYY: (s: string) => s }));

import { showWsMembersPanel, hideWsMembersPanel } from '../ws-members-panel';

const PANEL_ID = 'marco-ws-members-panel';

describe('ws-members-panel dispatch', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { hideWsMembersPanel(); document.body.innerHTML = ''; });

  it('mounts a single panel with the workspace name', () => {
    showWsMembersPanel('ws_1', 'Alpha', 100, 100);
    const el = document.getElementById(PANEL_ID);
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain('Alpha');
  });

  it('re-uses the same DOM node when re-opened for a different workspace', () => {
    showWsMembersPanel('ws_1', 'Alpha', 100, 100);
    const first = document.getElementById(PANEL_ID);
    showWsMembersPanel('ws_2', 'Beta', 200, 200);
    const second = document.getElementById(PANEL_ID);
    expect(second).toBe(first);
    expect(second!.textContent).toContain('Beta');
    expect(document.querySelectorAll('#' + PANEL_ID)).toHaveLength(1);
  });

  it('hides the panel (display:none) without removing it', () => {
    showWsMembersPanel('ws_1', 'Alpha', 100, 100);
    hideWsMembersPanel();
    const el = document.getElementById(PANEL_ID);
    expect(el).not.toBeNull();
    expect(el!.style.display).toBe('none');
  });

  it('is a no-op when wsId is empty', () => {
    showWsMembersPanel('', 'Nothing', 0, 0);
    expect(document.getElementById(PANEL_ID)).toBeNull();
  });

  it('hideWsMembersPanel is safe when panel was never mounted', () => {
    expect(() => hideWsMembersPanel()).not.toThrow();
    expect(document.getElementById(PANEL_ID)).toBeNull();
  });
});
