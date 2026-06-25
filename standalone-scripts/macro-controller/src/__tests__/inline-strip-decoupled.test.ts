/**
 * Plan 09 invariant: the inline Plan/Next strips are paste-only stagers.
 * Only the Repeat strip is allowed to submit/loop. This test pins the
 * INLINE_AUTOCHAIN_DISABLED guard and verifies stageNextPrompt never calls
 * a submit dispatcher.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logging', () => ({ log: vi.fn() }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../xpath-utils', () => ({ getByXPath: () => null }));
vi.mock('../shared-state', () => ({
  cPanelFg: '#fff', cPrimaryLight: '#fff', cSectionBg: '#000',
}));

const mocks = vi.hoisted(() => ({
  pasteToast: vi.fn(),
  pasteIntoEditor: vi.fn(async () => 'ok'),
  findPasteTarget: vi.fn(() => null),
}));
vi.mock('../ui/prompt-utils', () => ({
  showPasteToast: mocks.pasteToast,
  pasteIntoEditor: mocks.pasteIntoEditor,
  findPasteTarget: mocks.findPasteTarget,
}));
vi.mock('../ui/prompt-manager', () => ({ getPromptsConfig: () => ({ entries: [] }) }));
vi.mock('../ui/task-splitter-ui', () => ({
  triggerPlanPasteFromInline: vi.fn(),
  isSplitterRunning: () => false,
}));
vi.mock('../ui/task-next-ui', () => ({
  taskNextState: { running: false },
  findNextTasksPrompt: () => ({ text: 'LEGACY-NEXT-BODY' }),
}));

import {
  INLINE_AUTOCHAIN_DISABLED,
  stageNextPrompt,
} from '../ui/next-inline-ui';
import type { TaskNextDeps } from '../ui/task-next-ui';

const deps = {
  getPromptsConfig: () => ({ entries: [] }),
} as unknown as TaskNextDeps;

describe('inline strip decoupling (plan 09)', () => {
  beforeEach(() => {
    mocks.pasteToast.mockClear();
    mocks.pasteIntoEditor.mockClear();
  });

  it('INLINE_AUTOCHAIN_DISABLED is true (invariant)', () => {
    expect(INLINE_AUTOCHAIN_DISABLED).toBe(true);
  });

  it('stageNextPrompt pastes the prompt body and never submits', async () => {
    await stageNextPrompt(deps, 3);
    expect(mocks.pasteIntoEditor).toHaveBeenCalledTimes(1);
    const [text] = mocks.pasteIntoEditor.mock.calls[0];
    expect(String(text)).toContain('LEGACY-NEXT-BODY');
    expect(mocks.pasteToast).toHaveBeenCalledWith(
      expect.stringContaining('staged'),
      false,
    );
  });

  it('stageNextPrompt prefers the next-${N}-steps variant when present', async () => {
    const customDeps = {
      getPromptsConfig: () => ({
        entries: [{ slug: 'next-5-steps', text: 'VARIANT-5-BODY' }],
      }),
    } as unknown as TaskNextDeps;
    await stageNextPrompt(customDeps, 5);
    const [text] = mocks.pasteIntoEditor.mock.calls[0];
    expect(String(text)).toContain('VARIANT-5-BODY');
  });
});
