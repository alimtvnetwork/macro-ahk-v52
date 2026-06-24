import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  log: vi.fn(),
  logError: vi.fn(),
  projectId: 'project-1',
  queue: {
    count: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../logging', () => ({
  log: harness.log,
}));

vi.mock('../error-utils', () => ({
  logError: harness.logError,
}));

vi.mock('../shared-state', () => ({
  cPanelBg: '#101010',
  cPanelBorder: '#333333',
  cPanelFg: '#eeeeee',
  cPrimary: '#3b82f6',
  cPrimaryLight: '#93c5fd',
}));

vi.mock('../queue-control/task-queue-project-store', () => ({
  resolveTaskQueueProjectId: vi.fn(() => harness.projectId),
  getPersistentTaskQueue: vi.fn(() => harness.queue),
}));

import { mountTaskQueueReinjectionToast } from '../ui/task-queue-reinjection-toast';

function getToast(): HTMLElement | null {
  return document.getElementById('marco-task-queue-reinjection-toast');
}

function clickToastButton(label: string): void {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent === label);
  expect(button).toBeDefined();
  button?.click();
}

describe('task queue reinjection toast', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    harness.log.mockReset();
    harness.logError.mockReset();
    harness.queue.count.mockReset();
    harness.queue.clear.mockReset();
    harness.queue.count.mockResolvedValue(0);
    harness.queue.clear.mockResolvedValue(undefined);
  });

  it('stays hidden when the persisted queue is empty', async () => {
    await mountTaskQueueReinjectionToast();

    expect(getToast()).toBeNull();
    expect(harness.log).toHaveBeenCalledWith(expect.stringContaining('no queued tasks'), 'info');
  });

  it('surfaces Continue and Clear when queued tasks remain after reload', async () => {
    harness.queue.count.mockResolvedValue(3);

    await mountTaskQueueReinjectionToast();

    expect(getToast()?.textContent).toContain('You have 3 queued tasks.');
    expect(getToast()?.textContent).toContain('Continue');
    expect(getToast()?.textContent).toContain('Clear');
  });

  it('Continue hides the startup toast without clearing the queue', async () => {
    harness.queue.count.mockResolvedValue(2);
    await mountTaskQueueReinjectionToast();

    clickToastButton('Continue');

    expect(getToast()).toBeNull();
    expect(harness.queue.clear).not.toHaveBeenCalled();
  });

  it('Clear empties the project queue and hides the toast', async () => {
    harness.queue.count.mockResolvedValue(4);
    await mountTaskQueueReinjectionToast();

    clickToastButton('Clear');
    await Promise.resolve();

    expect(harness.queue.clear).toHaveBeenCalledWith('project-1');
    expect(getToast()).toBeNull();
  });

  it('logs startup count failures instead of swallowing them', async () => {
    const failure = new Error('count failed');
    harness.queue.count.mockRejectedValue(failure);

    await mountTaskQueueReinjectionToast();

    expect(harness.logError).toHaveBeenCalledWith('TaskQueueReinjection', expect.stringContaining('startup queue count failed'), failure);
  });
});