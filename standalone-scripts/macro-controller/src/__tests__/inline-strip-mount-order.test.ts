/**
 * Plan 09 invariant: the inline strips render in top→bottom order
 * Plan (SPLIT_ID) → Next (INLINE_ID), both inserted above the chat host.
 * Pin DOM order so a refactor of tryMountInline can't silently flip them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findPasteTarget: vi.fn(),
}));

vi.mock('../logging', () => ({ log: vi.fn() }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../xpath-utils', () => ({ getByXPath: () => null }));
vi.mock('../shared-state', () => ({
  cPanelFg: '#fff', cPrimaryLight: '#fff', cSectionBg: '#000',
}));
vi.mock('../ui/prompt-utils', () => ({
  showPasteToast: vi.fn(),
  pasteIntoEditor: vi.fn(async () => 'ok'),
  findPasteTarget: mocks.findPasteTarget,
}));
vi.mock('../ui/prompt-manager', () => ({ getPromptsConfig: () => ({ entries: [] }) }));
vi.mock('../ui/task-splitter-ui', () => ({
  triggerPlanPasteFromInline: vi.fn(),
  isSplitterRunning: () => false,
}));
vi.mock('../ui/task-next-ui', () => ({
  taskNextState: { running: false },
  findNextTasksPrompt: () => ({ text: 'BODY' }),
}));

import { mountNextInlineStrip } from '../ui/next-inline-ui';
import { setInlineStripGroupCollapsed } from '../ui/inline-strip-group-collapse';
import type { TaskNextDeps } from '../ui/task-next-ui';

const SPLIT_ID = 'marco-split-inline';
const INLINE_ID = 'marco-next-inline';

describe('inline strip mount order (plan 09)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    setInlineStripGroupCollapsed(false);
    mocks.findPasteTarget.mockReset();
  });

  it('mounts Plan then Next, both above the chat host, in that DOM order', () => {
    const wrap = document.createElement('div');
    const form = document.createElement('form');
    const ta = document.createElement('textarea');
    form.appendChild(ta);
    wrap.appendChild(form);
    document.body.appendChild(wrap);
    mocks.findPasteTarget.mockReturnValue(ta);

    mountNextInlineStrip({ getPromptsConfig: () => ({ entries: [] }) } as unknown as TaskNextDeps);

    const split = document.getElementById(SPLIT_ID);
    const next = document.getElementById(INLINE_ID);
    expect(split, 'plan strip mounted').toBeTruthy();
    expect(next, 'next strip mounted').toBeTruthy();

    const children = Array.from(wrap.children);
    const iSplit = children.indexOf(split as Element);
    const iNext = children.indexOf(next as Element);
    const iForm = children.indexOf(form);
    expect(iSplit).toBeGreaterThanOrEqual(0);
    expect(iSplit).toBeLessThan(iNext);
    expect(iNext).toBeLessThan(iForm);
  });

  it('is idempotent — re-mount does not duplicate strips', () => {
    const wrap = document.createElement('div');
    const form = document.createElement('form');
    const ta = document.createElement('textarea');
    form.appendChild(ta);
    wrap.appendChild(form);
    document.body.appendChild(wrap);
    mocks.findPasteTarget.mockReturnValue(ta);

    const deps = { getPromptsConfig: () => ({ entries: [] }) } as unknown as TaskNextDeps;
    mountNextInlineStrip(deps);
    mountNextInlineStrip(deps);

    expect(document.querySelectorAll('#' + SPLIT_ID).length).toBe(1);
    expect(document.querySelectorAll('#' + INLINE_ID).length).toBe(1);
  });

  it('uses one +/- button to hide and show Plan, Next, and Repeat inline controls', () => {
    const wrap = document.createElement('div');
    const form = document.createElement('form');
    const ta = document.createElement('textarea');
    form.appendChild(ta);
    wrap.appendChild(form);
    document.body.appendChild(wrap);
    mocks.findPasteTarget.mockReturnValue(ta);

    mountNextInlineStrip({ getPromptsConfig: () => ({ entries: [] }) } as unknown as TaskNextDeps);
    const repeat = document.createElement('div');
    repeat.id = 'marco-repeat-inline';
    repeat.style.display = 'inline-flex';
    wrap.insertBefore(repeat, form);

    const split = document.getElementById(SPLIT_ID) as HTMLElement;
    const next = document.getElementById(INLINE_ID) as HTMLElement;
    const body = split.querySelector<HTMLElement>('[data-role="plan-body"]');
    const toggle = split.querySelector<HTMLButtonElement>('[data-role="inline-group-toggle"]');

    expect(toggle?.textContent).toBe('−');
    toggle?.click();

    expect(toggle?.textContent).toBe('+');
    expect(body?.style.display).toBe('none');
    expect(next.style.display).toBe('none');
    expect(repeat.style.display).toBe('none');

    toggle?.click();

    expect(toggle?.textContent).toBe('−');
    expect(body?.style.display).toBe('flex');
    expect(next.style.display).toBe('flex');
    expect(repeat.style.display).toBe('inline-flex');
  });
});
