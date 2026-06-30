/**
 * Verify Plan and Next tabs are always visible in the prompts dropdown
 * across initial open, re-render (sync paint), and scrolled state.
 * v4.15.0 — Issue: tabs must never disappear from the chatbox dropdown.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../logging', () => ({
  log: vi.fn(),
  getDisplayProjectName: () => 'test',
}));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../shared-state', () => ({
  cPanelFg: '#fff', cPanelFgDim: '#aaa',
  cPrimary: '#7c3aed', cPrimaryLight: '#a78bfa',
  cBtnMenuHover: '#333', lDropdownRadius: '6px',
}));
vi.mock('../xpath-utils', () => ({ getByXPath: () => null }));
vi.mock('./prompt-utils', () => ({ pasteIntoEditor: vi.fn(), showPasteToast: vi.fn() }));
vi.mock('../task-queue', () => ({ addTaskToQueue: vi.fn() }));
vi.mock('./plan-task-ui', () => ({ renderPlanTaskSubmenu: (el: HTMLElement) => { el.textContent = 'PLAN'; } }));
vi.mock('./prompt-filter-menu', () => ({ renderFilterMenu: vi.fn() }));
vi.mock('./prompt-injection', () => ({ openPromptCreationModal: vi.fn() }));
vi.mock('./task-next-ui', () => ({
  runTaskNextLoop: vi.fn(), runTaskNextQueue: vi.fn(),
  openTaskNextSettingsModal: vi.fn(),
  findNextTasksPrompt: () => null,
}));
vi.mock('./prompt-cache', () => ({
  computePromptHash: () => 'h',
  writeUISnapshot: vi.fn(), readUISnapshot: () => Promise.resolve(null),
  clearUISnapshot: vi.fn(),
}));
vi.mock('./prompt-loader', () => ({
  getPromptsConfig: () => ({ entries: [] }),
  sendToExtension: vi.fn(), loadPromptsFromJson: vi.fn(),
  setRevalidateContext: vi.fn(), setRenderDropdownFn: vi.fn(),
  getPromptCategoryFilter: () => null,
  getPromptCategoryFilterSet: () => new Set<string>(),
  clearLoadedPrompts: vi.fn(), forceLoadFromDb: vi.fn(),
  saveHtmlCopy: vi.fn(), getSuggestedPrompts: () => [],
}));

import { renderPromptsDropdown } from '../ui/prompt-dropdown';

function makeCtx() {
  const dropdown = document.createElement('div');
  document.body.appendChild(dropdown);
  return { promptsDropdown: dropdown } as never;
}

describe('Plan/Next tabs always visible in prompts dropdown', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders both tab buttons on initial open', () => {
    const ctx = makeCtx();
    renderPromptsDropdown(ctx, {} as never);
    const plan = document.querySelector('[data-plan-toggle]');
    const next = document.querySelector('[data-next-toggle]');
    expect(plan).toBeTruthy();
    expect(next).toBeTruthy();
    expect(plan?.textContent).toContain('Plan');
    expect(next?.textContent).toContain('Next');
  });

  it('Plan tab is active by default, Next is inactive', () => {
    const ctx = makeCtx();
    renderPromptsDropdown(ctx, {} as never);
    expect(document.querySelector('[data-plan-toggle]')?.getAttribute('data-tab-active')).toBe('1');
    expect(document.querySelector('[data-next-toggle]')?.getAttribute('data-tab-active')).toBe('0');
  });

  it('header is sticky so tabs remain visible while scrolling', () => {
    const ctx = makeCtx();
    renderPromptsDropdown(ctx, {} as never);
    const header = document.querySelector('[data-plan-toggle]')?.parentElement?.parentElement as HTMLElement;
    expect(header.style.position).toBe('sticky');
    expect(header.style.top).toBe('0px');
  });

  it('tabs re-render on subsequent open (no stale paint hides them)', () => {
    const ctx = makeCtx();
    renderPromptsDropdown(ctx, {} as never);
    renderPromptsDropdown(ctx, {} as never);
    expect(document.querySelectorAll('[data-plan-toggle]').length).toBe(1);
    expect(document.querySelectorAll('[data-next-toggle]').length).toBe(1);
  });
});
