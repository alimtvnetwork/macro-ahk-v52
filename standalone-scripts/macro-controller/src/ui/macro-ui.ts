/**
 * MacroLoop Controller — Task Queue UI (Modal & Section)
 */

// import { taskNextState, type TaskNextDeps } from './task-next-ui';
import { loadTaskQueue, saveTaskQueue, clearCompletedTasks, getQueueDelayUntil, type MacroTask } from '../task-queue';
import { TaskQueueManager } from '../task-manager';
import { cPanelBg, cPanelFg, cPrimary, cPrimaryLight, cSuccess, cError, cWarning, cPanelBgAlt, cPanelBorder } from '../shared-state';
const TASK_QUEUE_SCOPE = '[TaskQueue]';
import { log } from '../logging';
// import { showToast } from '../toast';
// import { CssFragment } from '../types';

let _activeQueueTab: 'active' | 'history' | 'live' = 'active';
const _selectedTaskIds: Set<string> = new Set();
let _selectionMode = false;


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
  const updatePauseBtnStyle = (isPaused: boolean, isStopped: boolean) => {
    pauseBtn.textContent = isPaused || isStopped ? '▶ Resume' : '⏸ Pause';
    pauseBtn.style.background = isPaused || isStopped ? 'rgba(34,197,94,0.15)' : cPanelBgAlt;
    pauseBtn.style.color = isPaused || isStopped ? '#4ade80' : '#9ca3af';
  };
  
  const mgr = TaskQueueManager.getInstance();
  updatePauseBtnStyle(mgr.isPaused(), mgr.isStopped());

  pauseBtn.style.cssText = 'padding:2px 8px;font-size:9px;border:1px solid ' + cPanelBorder + ';border-radius:4px;cursor:pointer;transition:all 0.2s;';
  pauseBtn.onclick = async () => {
    const queueState = await loadTaskQueue();
    const currentPaused = queueState.isPaused || mgr.isPaused() || mgr.isStopped();
    const newPaused = !currentPaused;
    
    queueState.isPaused = newPaused;
    mgr.setPaused(newPaused);
    mgr.setStopped(false); // Reset stopped state on manual interaction
    
    await saveTaskQueue(queueState);
    updatePauseBtnStyle(newPaused, false);
    
    if (!newPaused) {
      log(TASK_QUEUE_SCOPE + ' Resuming queue...', 'info');
      void mgr.startProcessing();
    } else {
      log(TASK_QUEUE_SCOPE + ' Pausing queue...', 'info');
      mgr.stopProcessing();
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

  // Bulk Actions Row (hidden by default)
  const bulkRow = document.createElement('div');
  bulkRow.id = 'task-queue-bulk-row';
  bulkRow.style.cssText = 'display:none;align-items:center;justify-content:space-between;gap:8px;padding:4px 6px;background:rgba(59,130,246,0.1);border-radius:4px;margin-bottom:4px;border:1px solid rgba(59,130,246,0.2);';
  
  const bulkCount = document.createElement('div');
  bulkCount.id = 'task-bulk-count';
  bulkCount.style.cssText = 'font-size:9px;color:#60a5fa;font-weight:700;';
  bulkRow.appendChild(bulkCount);

  const bulkBtns = document.createElement('div');
  bulkBtns.style.cssText = 'display:flex;gap:4px;';

  const bulkRetry = document.createElement('button');
  bulkRetry.textContent = '🔄 Re-queue';
  bulkRetry.style.cssText = 'padding:2px 6px;font-size:9px;background:#1d4ed8;border:none;border-radius:3px;color:#fff;cursor:pointer;';
  bulkRetry.onclick = async () => {
    const { bulkRetryTasks } = await import('../task-queue');
    await bulkRetryTasks(Array.from(_selectedTaskIds));
    _selectedTaskIds.clear();
    _selectionMode = false;
    refreshTaskQueueUI(listContainer);
  };
  bulkBtns.appendChild(bulkRetry);

  const bulkDel = document.createElement('button');
  bulkDel.textContent = '🗑️ Delete';
  bulkDel.style.cssText = 'padding:2px 6px;font-size:9px;background:#b91c1c;border:none;border-radius:3px;color:#fff;cursor:pointer;';
  bulkDel.onclick = async () => {
    if (confirm(`Delete ${_selectedTaskIds.size} selected tasks?`)) {
      const { bulkDeleteTasks } = await import('../task-queue');
      await bulkDeleteTasks(Array.from(_selectedTaskIds));
      _selectedTaskIds.clear();
      _selectionMode = false;
      refreshTaskQueueUI(listContainer);
    }
  };
  bulkBtns.appendChild(bulkDel);
  
  const bulkCancel = document.createElement('button');
  bulkCancel.textContent = '✕';
  bulkCancel.style.cssText = 'padding:2px 6px;font-size:9px;background:transparent;border:none;color:#94a3b8;cursor:pointer;';
  bulkCancel.onclick = () => {
    _selectedTaskIds.clear();
    _selectionMode = false;
    refreshTaskQueueUI(listContainer);
  };
  bulkBtns.appendChild(bulkCancel);

  bulkRow.appendChild(bulkBtns);
  section.appendChild(bulkRow);


  // Settings Row
  const settingsRow = document.createElement('div');
  settingsRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 6px;background:rgba(255,255,255,0.03);border-radius:4px;margin-bottom:4px;';
  
  const pauseOnErrorWrap = document.createElement('label');
  pauseOnErrorWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:9px;color:#94a3b8;cursor:pointer;user-select:none;';
  
  const pauseOnErrorCheck = document.createElement('input');
  pauseOnErrorCheck.type = 'checkbox';
  pauseOnErrorCheck.style.cssText = 'margin:0;';
  
  const initialSettings = (function() {
    try {
      return (window as any).RiseupAsiaMacroExt.Projects.MacroController.getSettingsOverrides();
    } catch {
      return { pauseQueueOnError: true, maxTaskRetries: 3 };
    }
  })();
  pauseOnErrorCheck.checked = initialSettings.pauseQueueOnError !== false;
  
  pauseOnErrorCheck.onchange = () => {
    import('../settings-store').then(mod => {
      const s = mod.getSettingsOverrides();
      s.pauseQueueOnError = pauseOnErrorCheck.checked;
      void mod.saveSettingsOverrides(s);
    });
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
  retriesInput.onchange = () => {
    import('../settings-store').then(mod => {
      const s = mod.getSettingsOverrides();
      s.maxTaskRetries = parseInt(retriesInput.value) || 0;
      void mod.saveSettingsOverrides(s);
    });
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

  const liveTab = document.createElement('div');
  liveTab.textContent = 'Live';
  liveTab.style.cssText = `flex:1;text-align:center;padding:4px;font-size:9px;font-weight:700;cursor:pointer;border-radius:4px;background:${_activeQueueTab === 'live' ? cPrimary : cPanelBgAlt};color:${_activeQueueTab === 'live' ? '#fff' : '#64748b'};`;
  
  activeTab.onclick = () => {
    _activeQueueTab = 'active';
    activeTab.style.background = cPrimary; activeTab.style.color = '#fff';
    historyTab.style.background = cPanelBgAlt; historyTab.style.color = '#64748b';
    liveTab.style.background = cPanelBgAlt; liveTab.style.color = '#64748b';
    refreshTaskQueueUI(listContainer);
  };
  
  historyTab.onclick = () => {
    _activeQueueTab = 'history';
    historyTab.style.background = cPrimary; historyTab.style.color = '#fff';
    activeTab.style.background = cPanelBgAlt; activeTab.style.color = '#64748b';
    liveTab.style.background = cPanelBgAlt; liveTab.style.color = '#64748b';
    refreshTaskQueueUI(listContainer);
  };

  liveTab.onclick = () => {
    _activeQueueTab = 'live';
    liveTab.style.background = cPrimary; liveTab.style.color = '#fff';
    activeTab.style.background = cPanelBgAlt; activeTab.style.color = '#64748b';
    historyTab.style.background = cPanelBgAlt; historyTab.style.color = '#64748b';
    refreshTaskQueueUI(listContainer);
  };
  
  tabsRow.appendChild(activeTab);
  tabsRow.appendChild(historyTab);
  tabsRow.appendChild(liveTab);
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
  
  // Update pause button state based on manager
  setInterval(() => {
    const mgr = TaskQueueManager.getInstance();
    updatePauseBtnStyle(mgr.isPaused(), mgr.isStopped());
  }, 1000);

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
  
  if (_activeQueueTab === 'live') {
    renderLiveStream(container);
    return;
  }

  const tasksToShow = _activeQueueTab === 'active' ? state.tasks : (state.history || []);
  
  // Update bulk row visibility
  const bulkRow = document.getElementById('task-queue-bulk-row');
  if (bulkRow) {
    bulkRow.style.display = _selectionMode && _selectedTaskIds.size > 0 ? 'flex' : 'none';
    const bulkCount = document.getElementById('task-bulk-count');
    if (bulkCount) bulkCount.textContent = `${_selectedTaskIds.size} selected`;
  }

  if (tasksToShow.length === 0) {
    container.innerHTML = `<div style="padding:12px;text-align:center;color:#64748b;font-size:10px;">${_activeQueueTab === 'active' ? 'No active tasks' : 'History is empty'}</div>`;
    return;
  }

  container.innerHTML = '';
  tasksToShow.forEach((task) => {
    const item = document.createElement('div');
    const isSelected = _selectedTaskIds.has(task.id);
    
    item.style.cssText = `padding:6px 8px;background:${isSelected ? 'rgba(59,130,246,0.15)' : cPanelBgAlt};border-radius:4px;border-left:3px solid ${getStatusColor(task.status)};display:flex;flex-direction:column;gap:2px;position:relative;cursor:pointer;transition:all 0.1s;`;
    if (_activeQueueTab === 'history' && !isSelected) item.style.opacity = '0.7';
    if (isSelected) item.style.borderColor = '#3b82f6';

    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
    
    // Checkbox / Selection Toggle
    const checkWrap = document.createElement('div');
    checkWrap.style.cssText = 'display:flex;align-items:center;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isSelected;
    checkbox.style.cssText = 'margin:0 6px 0 0;width:10px;height:10px;cursor:pointer;';
    checkbox.onclick = (e) => {
      e.stopPropagation();
      _toggleTaskSelection(task.id, container);
    };
    checkWrap.appendChild(checkbox);
    row1.appendChild(checkWrap);

    const promptText = document.createElement('div');
    promptText.style.cssText = 'font-size:10px;color:' + cPanelFg + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;';
    promptText.textContent = task.prompt;
    promptText.title = task.prompt;
    row1.appendChild(promptText);

    // Reorder buttons (only for active pending tasks, hidden in selection mode)
    if (_activeQueueTab === 'active' && task.status === 'pending' && !_selectionMode) {
      const reorderWrap = document.createElement('div');
      reorderWrap.style.cssText = 'display:flex;gap:2px;';
      
      const upBtn = document.createElement('span');
      upBtn.textContent = '▲';
      upBtn.title = 'Move Up';
      upBtn.style.cssText = 'cursor:pointer;font-size:8px;color:#64748b;padding:0 2px;';
      upBtn.onclick = async (e) => {
        e.stopPropagation();
        const { reorderTask } = await import('../task-queue');
        await reorderTask(task.id, 'up');
        refreshTaskQueueUI(container);
      };
      
      const downBtn = document.createElement('span');
      downBtn.textContent = '▼';
      downBtn.title = 'Move Down';
      downBtn.style.cssText = 'cursor:pointer;font-size:8px;color:#64748b;padding:0 2px;';
      downBtn.onclick = async (e) => {
        e.stopPropagation();
        const { reorderTask } = await import('../task-queue');
        await reorderTask(task.id, 'down');
        refreshTaskQueueUI(container);
      };
      
      reorderWrap.appendChild(upBtn);
      reorderWrap.appendChild(downBtn);
      row1.appendChild(reorderWrap);
    }
    
    const status = document.createElement('div');
    status.style.cssText = `font-size:9px;color:${getStatusColor(task.status)};font-weight:600;min-width:40px;text-align:right;`;
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
    
    item.onclick = (e) => {
      if (_selectionMode || e.shiftKey) {
        _toggleTaskSelection(task.id, container);
      } else {
        showTaskDetailModal(task);
      }
    };

    // Right-click to enter selection mode
    item.oncontextmenu = (e) => {
      e.preventDefault();
      _selectionMode = true;
      _toggleTaskSelection(task.id, container);
    };

    container.appendChild(item);
  });
}

function _toggleTaskSelection(taskId: string, container: HTMLElement): void {
  if (_selectedTaskIds.has(taskId)) {
    _selectedTaskIds.delete(taskId);
  } else {
    _selectedTaskIds.add(taskId);
    _selectionMode = true;
  }
  refreshTaskQueueUI(container);
}

/** Render the Live Stream tab. */
function renderLiveStream(container: HTMLElement): void {
  const mgr = TaskQueueManager.getInstance();
  const logs = mgr.getExecutionLogs();
  
  container.innerHTML = '';
  container.style.background = 'rgba(0,0,0,0.4)';
  
  if (logs.length === 0) {
    container.innerHTML = '<div style="padding:12px;text-align:center;color:#64748b;font-size:10px;">No active execution logs</div>';
    return;
  }

  const logList = document.createElement('div');
  logList.style.cssText = 'display:flex;flex-direction:column;gap:2px;font-family:ui-monospace,monospace;font-size:9px;';
  
  logs.forEach(msg => {
    const line = document.createElement('div');
    line.style.cssText = 'padding:2px 4px;border-radius:2px;white-space:pre-wrap;word-break:break-all;';
    
    if (msg.includes('successfully')) line.style.color = cSuccess;
    else if (msg.includes('failed') || msg.includes('error')) line.style.color = cError;
    else line.style.color = '#94a3b8';

    line.textContent = msg;
    logList.appendChild(line);
  });

  container.appendChild(logList);
  
  // Auto-scroll to bottom
  setTimeout(() => { container.scrollTop = container.scrollHeight; }, 0);

  // Hook for updates if not already hooked
  mgr.onLogUpdate(() => {
    if (_activeQueueTab === 'live') refreshTaskQueueUI(container);
  });
}



/** Show a modal with full task details. */
function showTaskDetailModal(task: MacroTask): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2147483647;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);font-family:system-ui,-apple-system,sans-serif;';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const modal = document.createElement('div');
  modal.style.cssText = 'background:' + cPanelBg + ';border:1px solid ' + cPanelBorder + ';border-radius:12px;width:90%;max-width:500px;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.5);overflow:hidden;';
  modal.onclick = (e) => e.stopPropagation();

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ' + cPanelBorder + ';';
  header.innerHTML = `<span style="font-size:12px;font-weight:700;color:${getStatusColor(task.status)};">Task: ${task.status.toUpperCase()}</span>`;
  
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'cursor:pointer;color:#64748b;font-size:16px;';
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const body = document.createElement('div');
  body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;max-height:70vh;overflow-y:auto;';

  const field = (label: string, value: string, isMonospace = false) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    const l = document.createElement('div');
    l.textContent = label;
    l.style.cssText = 'font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;';
    wrap.appendChild(l);
    const v = document.createElement('div');
    v.textContent = value;
    v.style.cssText = `font-size:11px;color:${cPanelFg};white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,0.2);padding:8px;border-radius:6px;` + (isMonospace ? 'font-family:ui-monospace,monospace;' : '');
    wrap.appendChild(v);
    return wrap;
  };

  body.appendChild(field('Project', task.projectName));
  body.appendChild(field('Prompt', task.prompt, true));
  if (task.error) body.appendChild(field('Error', task.error));
  body.appendChild(field('Timestamp', new Date(task.timestamp).toLocaleString()));
  body.appendChild(field('ID', task.id));

  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
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
