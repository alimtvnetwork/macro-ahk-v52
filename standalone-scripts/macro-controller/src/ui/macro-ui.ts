/**
 * MacroLoop Controller — Task Queue UI (Modal & Section)
 */

import { taskNextState, type TaskNextDeps } from './task-next-ui';
import { loadTaskQueue, saveTaskQueue, updateTaskStatus, clearCompletedTasks, getQueueDelayUntil, type MacroTask, type TaskQueueState } from '../task-queue';
import { TaskQueueManager } from '../task-manager';
import { cPanelBg, cPanelFg, cPrimary, cPrimaryLight, cSuccess, cError, cWarning, cPanelBgAlt, cPanelBorder } from '../shared-state';
import { log } from '../logging';
import { showToast } from '../toast';
import { CssFragment } from '../types';

/**
 * Build the Task Queue section for the Tools panel.
 */
export function buildTaskQueueSection(): HTMLElement {
  const section = document.createElement('div');
  section.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:8px;';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;';
  
  const titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:11px;font-weight:700;color:' + cPrimaryLight + ';text-transform:uppercase;letter-spacing:0.5px;';
  title.textContent = '📋 Task Queue';
  titleWrap.appendChild(title);

  const countdownBadge = document.createElement('span');
  countdownBadge.id = 'task-queue-countdown';
  countdownBadge.style.cssText = 'font-size:9px;color:' + cWarning + ';font-weight:600;min-width:40px;text-align:right;';
  titleWrap.appendChild(countdownBadge);
  header.appendChild(titleWrap);

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:6px;';

  const pauseBtn = document.createElement('button');
  pauseBtn.textContent = '⏸ Pause';
  pauseBtn.style.cssText = 'padding:2px 6px;font-size:9px;background:' + cPanelBgAlt + ';border:1px solid ' + cPanelBorder + ';border-radius:4px;color:#9ca3af;cursor:pointer;';
  pauseBtn.onclick = async () => {
    const queueState = await loadTaskQueue();
    queueState.isPaused = !queueState.isPaused;
    await saveTaskQueue(queueState);
    pauseBtn.textContent = queueState.isPaused ? '▶ Resume' : '⏸ Pause';
    if (!queueState.isPaused) {
      void TaskQueueManager.getInstance().startProcessing();
    }
    refreshTaskQueueUI(listContainer);
  };
  controls.appendChild(pauseBtn);

  const clearBtn = document.createElement('button');

  clearBtn.textContent = 'Clear Done';
  clearBtn.style.cssText = 'padding:2px 6px;font-size:9px;background:' + cPanelBgAlt + ';border:1px solid ' + cPanelBorder + ';border-radius:4px;color:#9ca3af;cursor:pointer;';
  clearBtn.onclick = async () => {
    await clearCompletedTasks();
    refreshTaskQueueUI(listContainer);
  };
  controls.appendChild(clearBtn);

  header.appendChild(controls);
  section.appendChild(header);

  const listContainer = document.createElement('div');
  listContainer.id = 'task-queue-list';
  listContainer.style.cssText = 'max-height:160px;overflow-y:auto;background:rgba(0,0,0,0.2);border-radius:6px;padding:4px;display:flex;flex-direction:column;gap:4px;';
  section.appendChild(listContainer);

  // Polling for updates
  const refreshHandler = () => refreshTaskQueueUI(listContainer);
  listContainer.addEventListener('refresh-queue', refreshHandler);
  
  setInterval(refreshHandler, 1000);
  refreshHandler();



  return section;
}

/**
 * Refresh the task list UI.
 */
async function refreshTaskQueueUI(container: HTMLElement): Promise<void> {
  const state = await loadTaskQueue();
  
  if (state.tasks.length === 0) {
    container.innerHTML = '<div style="padding:12px;text-align:center;color:#64748b;font-size:10px;">Queue is empty</div>';
    return;
  }

  container.innerHTML = '';
  state.tasks.forEach(task => {
    const item = document.createElement('div');
    item.style.cssText = `padding:6px 8px;background:${cPanelBgAlt};border-radius:4px;border-left:3px solid ${getStatusColor(task.status)};display:flex;flex-direction:column;gap:2px;`;
    
    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
    
    const promptText = document.createElement('div');
    promptText.style.cssText = 'font-size:10px;color:' + cPanelFg + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;';
    promptText.textContent = task.prompt;
    row1.appendChild(promptText);
    
    const status = document.createElement('div');
    status.style.cssText = `font-size:9px;color:${getStatusColor(task.status)};font-weight:600;`;
    if (task.status === 'hold' && task.holdUntil) {
      const secs = Math.max(0, Math.ceil((task.holdUntil - Date.now()) / 1000));
      status.textContent = `HOLD ${secs}s`;
    } else {
      status.textContent = task.status.toUpperCase();
    }
    row1.appendChild(status);
    
    item.appendChild(row1);
    
    if (task.error) {
      const err = document.createElement('div');
      err.style.cssText = 'font-size:9px;color:' + cError + ';';
      err.textContent = task.error;
      item.appendChild(err);
    }
    
    container.appendChild(item);
  });
}

function getStatusColor(status: MacroTask['status']): string {
  switch (status) {
    case 'pending': return '#9ca3af';
    case 'processing': return cPrimary;
    case 'completed': return cSuccess;
    case 'failed': return cError;
    case 'hold': return cWarning;
    default: return '#9ca3af';
  }
}
