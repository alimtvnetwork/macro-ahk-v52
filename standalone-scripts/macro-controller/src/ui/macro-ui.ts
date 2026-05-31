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

let _activeQueueTab: 'active' | 'history' = 'active';

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
  title.id = 'task-queue-title-text';
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

  const retryBtn = document.createElement('button');
  retryBtn.textContent = '🔄 Retry';
  retryBtn.title = 'Retry failed tasks';
  retryBtn.style.cssText = 'padding:2px 6px;font-size:9px;background:' + cPanelBgAlt + ';border:1px solid ' + cPanelBorder + ';border-radius:4px;color:#9ca3af;cursor:pointer;';
  retryBtn.onclick = async () => {
    const { retryFailedTasks } = await import('../task-queue');
    await retryFailedTasks();
    refreshTaskQueueUI(listContainer);
  };
  controls.appendChild(retryBtn);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🧹 Clear';
  clearBtn.title = 'Clear completed tasks (Right-click to clear ALL)';
  clearBtn.style.cssText = 'padding:2px 6px;font-size:9px;background:' + cPanelBgAlt + ';border:1px solid ' + cPanelBorder + ';border-radius:4px;color:#9ca3af;cursor:pointer;';
  clearBtn.onclick = async () => {
    await clearCompletedTasks();
    refreshTaskQueueUI(listContainer);
  };
  clearBtn.oncontextmenu = async (e) => {
    e.preventDefault();
    if (confirm('Clear ALL tasks from the queue?')) {
      const { clearAllTasks } = await import('../task-queue');
      await clearAllTasks();
      refreshTaskQueueUI(listContainer);
    }
  };
  controls.appendChild(clearBtn);


  header.appendChild(controls);
  section.appendChild(header);

  // Settings Row
  const settingsRow = document.createElement('div');
  settingsRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 6px;background:rgba(255,255,255,0.03);border-radius:4px;margin-bottom:4px;';
  
  const pauseOnErrorWrap = document.createElement('label');
  pauseOnErrorWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:9px;color:#94a3b8;cursor:pointer;user-select:none;';
  
  const pauseOnErrorCheck = document.createElement('input');
  pauseOnErrorCheck.type = 'checkbox';
  pauseOnErrorCheck.style.cssText = 'margin:0;';
  
  const { getSettingsOverrides, saveSettingsOverrides } = await import('../settings-store');
  const initialSettings = getSettingsOverrides();
  pauseOnErrorCheck.checked = initialSettings.pauseQueueOnError !== false;
  
  pauseOnErrorCheck.onchange = async () => {
    const s = getSettingsOverrides();
    s.pauseQueueOnError = pauseOnErrorCheck.checked;
    await saveSettingsOverrides(s);
  };
  
  pauseOnErrorWrap.appendChild(pauseOnErrorCheck);
  pauseOnErrorWrap.appendChild(document.createTextNode('Pause on error'));
  settingsRow.appendChild(pauseOnErrorWrap);

  const retriesWrap = document.createElement('div');
  retriesWrap.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:9px;color:#94a3b8;';
  retriesWrap.innerHTML = 'Retries: ';
  
  const retriesInput = document.createElement('input');
  retriesInput.type = 'number';
  retriesInput.min = '0';
  retriesInput.max = '10';
  retriesInput.value = String(initialSettings.maxTaskRetries ?? 3);
  retriesInput.style.cssText = `width:28px;background:${cPanelBgAlt};border:1px solid ${cPanelBorder};color:#fff;font-size:9px;padding:1px 2px;border-radius:2px;`;
  retriesInput.onchange = async () => {
    const s = getSettingsOverrides();
    s.maxTaskRetries = parseInt(retriesInput.value) || 0;
    await saveSettingsOverrides(s);
  };
  retriesWrap.appendChild(retriesInput);
  settingsRow.appendChild(retriesWrap);
  
  section.appendChild(settingsRow);

  // Tabs
  const tabsRow = document.createElement('div');
  tabsRow.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;';
  
  const activeTab = document.createElement('div');
  activeTab.textContent = 'Active';
  activeTab.style.cssText = `flex:1;text-align:center;padding:4px;font-size:9px;font-weight:700;cursor:pointer;border-radius:4px;background:${_activeQueueTab === 'active' ? cPrimary : cPanelBgAlt};color:${_activeQueueTab === 'active' ? '#fff' : '#64748b'};`;
  
  const historyTab = document.createElement('div');
  historyTab.textContent = 'History';
  historyTab.style.cssText = `flex:1;text-align:center;padding:4px;font-size:9px;font-weight:700;cursor:pointer;border-radius:4px;background:${_activeQueueTab === 'history' ? cPrimary : cPanelBgAlt};color:${_activeQueueTab === 'history' ? '#fff' : '#64748b'};`;
  
  activeTab.onclick = () => {
    _activeQueueTab = 'active';
    activeTab.style.background = cPrimary; activeTab.style.color = '#fff';
    historyTab.style.background = cPanelBgAlt; historyTab.style.color = '#64748b';
    refreshTaskQueueUI(listContainer);
  };
  
  historyTab.onclick = () => {
    _activeQueueTab = 'history';
    historyTab.style.background = cPrimary; historyTab.style.color = '#fff';
    activeTab.style.background = cPanelBgAlt; activeTab.style.color = '#64748b';
    refreshTaskQueueUI(listContainer);
  };
  
  tabsRow.appendChild(activeTab);
  tabsRow.appendChild(historyTab);
  section.appendChild(tabsRow);


  const listContainer = document.createElement('div');
  listContainer.id = 'task-queue-list';
  listContainer.style.cssText = 'max-height:160px;overflow-y:auto;background:rgba(0,0,0,0.2);border-radius:6px;padding:4px;display:flex;flex-direction:column;gap:4px;';
  section.appendChild(listContainer);

  // Polling for updates
  const refreshHandler = () => {
    refreshTaskQueueUI(listContainer);
    _updateQueueCountdown(countdownBadge, title);
  };

  listContainer.addEventListener('refresh-queue', refreshHandler);
  
  setInterval(refreshHandler, 1000);
  refreshHandler();

  return section;
}

async function _updateQueueCountdown(badge: HTMLElement, title?: HTMLElement): Promise<void> {
  const until = getQueueDelayUntil();
  if (until > Date.now()) {
    const secs = Math.ceil((until - Date.now()) / 1000);
    badge.textContent = `⏳ ${secs}s`;
  } else {
    badge.textContent = '';
  }

  if (title) {
    const { loadTaskQueue } = await import('../task-queue');
    const q = await loadTaskQueue();
    const pending = q.tasks.filter(t => t.status === 'pending' || t.status === 'hold').length;
    title.textContent = pending > 0 ? `📋 Task Queue (${pending})` : '📋 Task Queue';
  }
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

/** Opens a full-screen modal showing the task queue. */
export function showTaskQueueModal(): void {
  const existing = document.getElementById('macro-task-queue-modal');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'macro-task-queue-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2147483647;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const modal = document.createElement('div');
  modal.style.cssText = 'background:' + cPanelBg + ';border:1px solid ' + cPanelBorder + ';border-radius:12px;width:92%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.5);overflow:hidden;';
  modal.onclick = (e) => e.stopPropagation();

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ' + cPanelBorder + ';flex-shrink:0;';
  header.innerHTML = `<span style="font-size:14px;font-weight:700;color:${cPrimaryLight};">📋 Task Queue</span>`;

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'cursor:pointer;color:#64748b;font-size:18px;';
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const body = document.createElement('div');
  body.style.cssText = 'padding:12px;flex:1;overflow-y:auto;';

  // Reuse the section builder logic
  const queueSection = buildTaskQueueSection();
  body.appendChild(queueSection);
  modal.appendChild(body);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
