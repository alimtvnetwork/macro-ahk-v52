/**
 * MacroLoop Controller — Task Queue Persistence & Model
 */

import { getProjectKvStore } from './project-kv-store';
import { extractProjectIdFromUrl } from './workspace-detection';
import { log } from './logging';
import { syncTaskQueueToDb, saveProjectMetadata } from './db/macro-db';
import { state } from './shared-state';

export interface MacroTask {
  id: string;
  projectId: string;
  projectName: string;
  prompt: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'hold';
  error?: string;
  retryCount?: number;
  holdUntil?: number;
}

export interface TaskQueueState {
  tasks: MacroTask[];
  history?: MacroTask[];
  isPaused: boolean;
}

const SECTION = 'task_queue';
const STATE_KEY = 'queue_state';

/**
 * Load the task queue for the current project from IndexedDB.
 */
export async function loadTaskQueue(): Promise<TaskQueueState> {
  const projectId = extractProjectIdFromUrl();
  if (!projectId) return { tasks: [], history: [], isPaused: false };

  const store = getProjectKvStore('macro-controller');
  const stateData = await store.get<TaskQueueState>(SECTION, `${STATE_KEY}_${projectId}`);
  
  if (stateData) {
    if (!stateData.history) stateData.history = [];
    log(`[TaskQueue] Loaded ${stateData.tasks.length} tasks and ${stateData.history.length} history items for project ${projectId}`, 'info');
    return stateData;
  }
  
  return { tasks: [], history: [], isPaused: false };
}

/**
 * Save the task queue for the current project to IndexedDB and sync to SQLite.
 */
export async function saveTaskQueue(queueState: TaskQueueState): Promise<void> {
  const projectId = extractProjectIdFromUrl();
  if (!projectId) return;

  const store = getProjectKvStore('macro-controller');
  await store.set(SECTION, `${STATE_KEY}_${projectId}`, queueState);

  // Sync to SQLite for persistence across extensions/backups
  const projectName = state.projectNameFromApi || 'Unknown Project';
  await saveProjectMetadata(projectId, projectName, window.location.href);
  await syncTaskQueueToDb(projectId, queueState.tasks);
}

/**
 * Add a new task to the queue.
 */
export async function addTaskToQueue(prompt: string, projectName: string): Promise<MacroTask | null> {
  const projectId = extractProjectIdFromUrl();
  if (!projectId) return null;

  const queueState = await loadTaskQueue();
  const newTask: MacroTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    projectId,
    projectName,
    prompt,
    timestamp: Date.now(),
    status: 'pending'
  };

  queueState.tasks.push(newTask);
  await saveTaskQueue(queueState);
  
  log(`[TaskQueue] Added task to queue: ${prompt.substring(0, 30)}...`, 'success');
  return newTask;
}

/**
 * Update a task's status in the queue.
 */
export async function updateTaskStatus(taskId: string, status: MacroTask['status'], error?: string): Promise<void> {
  const queueState = await loadTaskQueue();
  const index = queueState.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    const task = queueState.tasks[index];
    task.status = status;
    if (error) task.error = error;
    
    // Move completed/failed to history
    if (status === 'completed' || status === 'failed') {
      if (!queueState.history) queueState.history = [];
      queueState.history.unshift(task);
      if (queueState.history.length > 50) queueState.history.pop();
      queueState.tasks.splice(index, 1);
    }
    
    await saveTaskQueue(queueState);
  }
}

/**
 * Clear completed tasks from history and main queue.
 */
export async function clearCompletedTasks(): Promise<void> {
  const queueState = await loadTaskQueue();
  const historyCount = queueState.history?.length ?? 0;
  const completedCount = queueState.tasks.filter(t => t.status === 'completed').length;
  
  queueState.history = [];
  queueState.tasks = queueState.tasks.filter(t => t.status !== 'completed');
  
  if (historyCount + completedCount > 0) {
    await saveTaskQueue(queueState);
    log(`[TaskQueue] Cleared ${historyCount + completedCount} items from history`, 'info');
  }
}

/**
 * Clear all tasks and history.
 */
export async function clearAllTasks(): Promise<void> {
  const queueState = await loadTaskQueue();
  if (queueState.tasks.length > 0 || (queueState.history?.length ?? 0) > 0) {
    queueState.tasks = [];
    queueState.history = [];
    await saveTaskQueue(queueState);
    log('[TaskQueue] Cleared all tasks and history', 'info');
  }
}

/**
 * Move all failed tasks back to pending.
 */
export async function retryFailedTasks(): Promise<void> {
  const queueState = await loadTaskQueue();
  let count = 0;
  
  // Check main tasks (if any)
  queueState.tasks.forEach(t => {
    if (t.status === 'failed') {
      t.status = 'pending';
      delete t.error;
      t.retryCount = 0;
      count++;
    }
  });

  // Check history
  if (queueState.history && queueState.history.length > 0) {
    const failedInHistory = queueState.history.filter(t => t.status === 'failed');
    failedInHistory.forEach(t => {
      t.status = 'pending';
      delete t.error;
      t.retryCount = 0;
      queueState.tasks.push(t);
      count++;
    });
    queueState.history = queueState.history.filter(t => t.status !== 'failed');
  }

  if (count > 0) {
    await saveTaskQueue(queueState);
    log(`[TaskQueue] Reset ${count} failed tasks to pending`, 'info');
  }
}

/**
 * Bulk delete tasks by ID.
 */
export async function bulkDeleteTasks(taskIds: string[]): Promise<void> {
  if (taskIds.length === 0) return;
  const queueState = await loadTaskQueue();
  const initialCount = queueState.tasks.length + (queueState.history?.length ?? 0);
  
  queueState.tasks = queueState.tasks.filter(t => !taskIds.includes(t.id));
  if (queueState.history) {
    queueState.history = queueState.history.filter(t => !taskIds.includes(t.id));
  }
  
  const finalCount = queueState.tasks.length + (queueState.history?.length ?? 0);
  const deleted = initialCount - finalCount;
  
  if (deleted > 0) {
    await saveTaskQueue(queueState);
    log(`[TaskQueue] Bulk deleted ${deleted} tasks`, 'info');
  }
}

/**
 * Bulk retry/re-queue tasks by ID.
 */
export async function bulkRetryTasks(taskIds: string[]): Promise<void> {
  if (taskIds.length === 0) return;
  const queueState = await loadTaskQueue();
  let count = 0;

  // 1. Move from history back to tasks if needed
  if (queueState.history) {
    const fromHistory = queueState.history.filter(t => taskIds.includes(t.id));
    fromHistory.forEach(t => {
      t.status = 'pending';
      delete t.error;
      t.retryCount = 0;
      queueState.tasks.push(t);
      count++;
    });
    queueState.history = queueState.history.filter(t => !taskIds.includes(t.id));
  }

  // 2. Update existing active tasks
  queueState.tasks.forEach(t => {
    if (taskIds.includes(t.id) && t.status !== 'pending') {
      t.status = 'pending';
      delete t.error;
      t.retryCount = 0;
      count++;
    }
  });

  if (count > 0) {
    await saveTaskQueue(queueState);
    log(`[TaskQueue] Bulk re-queued ${count} tasks`, 'info');
  }
}



/**
 * Shared queue delay countdown state.
 */
let _queueDelayUntil = 0;
export function setQueueDelayUntil(ts: number): void { _queueDelayUntil = ts; }
export function getQueueDelayUntil(): number { return _queueDelayUntil; }

/**
 * Reorder a task in the queue.
 */
export async function reorderTask(taskId: string, direction: 'up' | 'down'): Promise<void> {
  const queueState = await loadTaskQueue();
  const index = queueState.tasks.findIndex(t => t.id === taskId);
  if (index === -1) return;

  if (direction === 'up' && index > 0) {
    [queueState.tasks[index - 1], queueState.tasks[index]] = [queueState.tasks[index], queueState.tasks[index - 1]];
  } else if (direction === 'down' && index < queueState.tasks.length - 1) {
    [queueState.tasks[index + 1], queueState.tasks[index]] = [queueState.tasks[index], queueState.tasks[index + 1]];
  } else {
    return;
  }

  await saveTaskQueue(queueState);
  log(`[TaskQueue] Reordered task ${taskId} ${direction}`, 'info');
}

/**
 * Check if the "Return to Extension" button is present and pause queue if so.
 */
export function checkForReturnButton(): boolean {
  const XPATH = '/html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/button';
  const CLASS = 'ql-native-return-btn';
  
  const btnByXpath = document.evaluate(XPATH, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  const btnByClass = document.querySelector(`.${CLASS}`);
  const btnById = document.getElementById('ql-native-return-btn');
  const btnByText = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Voltar à Extensão') || b.textContent?.includes('Return to Extension'));

  const exists = !!(btnByXpath || btnByClass || btnById || btnByText);
  
  if (exists) {
    log('[TaskQueue] "Return to Extension" button detected. Pausing queue.', 'warn');
  }
  
  return exists;
}

