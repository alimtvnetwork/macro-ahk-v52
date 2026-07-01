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
vi.mock('./plan-task-ui', () => ({ renderPlanTaskSubmenu: (host: HTMLElement) => { host.textContent = 'PLAN'; } }));
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

describe('Plan tab always visible in prompts dropdown', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders Plan tab button on initial open (Next removed — handled by inline strip)', () => {
    const dropdownCtx = makeCtx();
    renderPromptsDropdown(dropdownCtx, {} as never);
    const plan = document.querySelector('[data-plan-toggle]');
    expect(plan).toBeTruthy();
    expect(plan?.textContent).toContain('Plan');
    expect(document.querySelector('[data-next-toggle]')).toBeNull();
  });

  it('Plan tab is active by default', () => {
    const dropdownCtx = makeCtx();
    renderPromptsDropdown(dropdownCtx, {} as never);
    expect(document.querySelector('[data-plan-toggle]')?.getAttribute('data-tab-active')).toBe('1');
  });

  it('header is sticky so Plan tab remains visible while scrolling', () => {
    const dropdownCtx = makeCtx();
    renderPromptsDropdown(dropdownCtx, {} as never);
    const header = document.querySelector('[data-plan-toggle]')?.parentElement?.parentElement as HTMLElement;
    expect(header.style.position).toBe('sticky');
    expect(header.style.top).toBe('0px');
  });

  it('Plan tab re-renders on subsequent open (no stale paint hides it)', () => {
    const dropdownCtx = makeCtx();
    renderPromptsDropdown(dropdownCtx, {} as never);
    renderPromptsDropdown(dropdownCtx, {} as never);
    expect(document.querySelectorAll('[data-plan-toggle]').length).toBe(1);
  });
});
