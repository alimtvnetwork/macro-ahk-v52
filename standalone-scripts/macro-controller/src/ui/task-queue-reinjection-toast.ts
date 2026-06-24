/** Startup toast for persisted splitter-produced Task Next queues. */

import { log } from '../logging';
import { logError } from '../error-utils';
import { cPanelBg, cPanelBorder, cPanelFg, cPrimary, cPrimaryLight } from '../shared-state';
import { getPersistentTaskQueue, resolveTaskQueueProjectId } from '../queue-control/task-queue-project-store';

import type { TaskQueue } from '../queue-control/task-queue';

const ID_TASK_QUEUE_REINJECTION_TOAST = 'marco-task-queue-reinjection-toast';

interface ReinjectionToastOptions {
  readonly projectId: string;
  readonly pendingCount: number;
  readonly queue: Pick<TaskQueue, 'clear'>;
}

function removeExistingToast(): void {
  document.getElementById(ID_TASK_QUEUE_REINJECTION_TOAST)?.remove();
}

function createActionButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.cssText = 'padding:4px 9px;border-radius:5px;border:1px solid ' + cPrimary + ';background:rgba(124,58,237,0.16);color:' + cPanelFg + ';font-size:11px;font-weight:650;cursor:pointer;';

  return button;
}

function createToastShell(): HTMLDivElement {
  const toast = document.createElement('div');
  toast.id = ID_TASK_QUEUE_REINJECTION_TOAST;
  toast.style.cssText = 'position:fixed;right:18px;bottom:76px;z-index:1000002;display:flex;align-items:center;gap:10px;max-width:420px;padding:10px 12px;border:1px solid ' + cPanelBorder + ';border-left:3px solid ' + cPrimary + ';border-radius:7px;background:' + cPanelBg + ';color:' + cPanelFg + ';box-shadow:0 12px 32px rgba(0,0,0,0.42);font-family:system-ui,-apple-system,sans-serif;font-size:12px;pointer-events:auto;';

  return toast;
}

function createToastMessage(pendingCount: number): HTMLSpanElement {
  const message = document.createElement('span');
  message.textContent = 'You have ' + pendingCount + ' queued tasks.';
  message.style.cssText = 'flex:1;line-height:1.35;color:' + cPrimaryLight + ';';

  return message;
}

async function clearQueueAndToast(options: ReinjectionToastOptions): Promise<void> {
  try {
    await options.queue.clear(options.projectId);
    removeExistingToast();
    log('TaskQueueReinjection: cleared ' + options.pendingCount + ' queued tasks for project ' + options.projectId, 'info');
  } catch (caught: CaughtError) {
    logError('TaskQueueReinjection', 'clear failed for project ' + options.projectId, caught);
  }
}

function renderTaskQueueReinjectionToast(options: ReinjectionToastOptions): void {
  removeExistingToast();
  const toast = createToastShell();
  const continueButton = createActionButton('Continue');
  const clearButton = createActionButton('Clear');
  continueButton.onclick = function (): void { removeExistingToast(); };
  clearButton.onclick = function (): void { void clearQueueAndToast(options); };
  toast.appendChild(createToastMessage(options.pendingCount));
  toast.appendChild(continueButton);
  toast.appendChild(clearButton);
  document.body.appendChild(toast);
}

export async function mountTaskQueueReinjectionToast(): Promise<void> {
  try {
    const projectId = resolveTaskQueueProjectId();
    const queue = getPersistentTaskQueue();
    const pendingCount = await queue.count(projectId);
    if (pendingCount <= 0) {
      log('TaskQueueReinjection: no queued tasks for project ' + projectId, 'info');
      return;
    }
    renderTaskQueueReinjectionToast({ projectId, pendingCount, queue });
    log('TaskQueueReinjection: surfaced ' + pendingCount + ' queued tasks for project ' + projectId, 'info');
  } catch (caught: CaughtError) {
    logError('TaskQueueReinjection', 'startup queue count failed; toast unavailable', caught);
  }
}