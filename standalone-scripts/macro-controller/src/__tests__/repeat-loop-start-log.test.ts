/**
 * Plan 09 invariant: only the Repeat strip is allowed to start an automated
 * submit loop. Pin the diagnostic log line emitted by startRepeatLoop so that
 * any future refactor preserves the `RepeatLoop.start: source=repeat-strip`
 * marker — it's how we attribute auto-submits in the console when triaging
 * "who submitted my chat?" regressions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  log: vi.fn(),
  showPasteToast: vi.fn(),
  findPasteTarget: vi.fn(),
}));

vi.mock('../logging', () => ({ log: mocks.log }));
vi.mock('../xpath-utils', () => ({
  getByXPath: () => null,
  isReturnButtonVisible: () => false,
}));
vi.mock('../shared-state', () => ({
  cPanelFg: '#fff', cPrimaryLight: '#fff', cSectionBg: '#000',
}));
vi.mock('../ui/prompt-utils', () => ({
  showPasteToast: mocks.showPasteToast,
  findPasteTarget: mocks.findPasteTarget,
}));
vi.mock('../ui/prompt-manager', () => ({ getPromptsConfig: () => ({ entries: [] }) }));
vi.mock('../ui/task-next-ui', () => ({ findAddToTasksButton: () => null }));

import { startRepeatLoop, repeatLoopState } from '../ui/repeat-loop-ui';

describe('repeat-loop start log guard (plan 09)', () => {
  beforeEach(() => {
    mocks.log.mockClear();
    mocks.showPasteToast.mockClear();
    mocks.findPasteTarget.mockReset();
    repeatLoopState.running = false;
    repeatLoopState.cancelled = false;
    repeatLoopState.completed = 0;
    repeatLoopState.count = 3;
    repeatLoopState.capturedText = '';
  });

  it('emits the RepeatLoop.start source marker when started from the strip', () => {
    const ta = document.createElement('textarea');
    ta.value = 'hello-loop';
    mocks.findPasteTarget.mockReturnValue(ta);

    startRepeatLoop();

    const markerCall = mocks.log.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('RepeatLoop.start: source=repeat-strip'),
    );
    expect(markerCall, 'expected RepeatLoop.start log marker').toBeTruthy();
    expect(repeatLoopState.running).toBe(true);

    // teardown: stop the async loop from running further during test exit
    repeatLoopState.cancelled = true;
    repeatLoopState.running = false;
  });

  it('refuses to start when chat box is empty (no submit log emitted)', () => {
    mocks.findPasteTarget.mockReturnValue(null);
    startRepeatLoop();
    const markerCall = mocks.log.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('RepeatLoop.start'),
    );
    expect(markerCall).toBeUndefined();
    expect(repeatLoopState.running).toBe(false);
  });

  it('warns and bails when already running (single-flight guard)', () => {
    repeatLoopState.running = true;
    startRepeatLoop();
    const warnCall = mocks.log.mock.calls.find(
      (c) => c[0] === 'Repeat: already running' && c[1] === 'warn',
    );
    expect(warnCall).toBeTruthy();
  });
});
