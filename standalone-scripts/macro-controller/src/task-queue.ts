/**
 * MacroLoop Controller — Task Queue Persistence & Model
 */

import { getProjectKvStore } from './project-kv-store';
import { extractProjectIdFromUrl } from './workspace-detection';
import { log, logSub } from './logging';
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
  await syncTaskQueueToDb(projectId, projectName, queueState.tasks);
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
  const task = queueState.tasks.find(t => t.id === taskId);
  if (task) {
    task.status = status;
    if (error) task.error = error;
    await saveTaskQueue(queueState);
  }
}

/**
 * Clear completed tasks from the queue.
 */
export async function clearCompletedTasks(): Promise<void> {
  const queueState = await loadTaskQueue();
  const count = queueState.tasks.length;
  queueState.tasks = queueState.tasks.filter(t => t.status !== 'completed');
  if (queueState.tasks.length !== count) {
    await saveTaskQueue(queueState);
    log(`[TaskQueue] Cleared ${count - queueState.tasks.length} completed tasks`, 'info');
  }
}

/**
 * Clear all tasks from the queue.
 */
export async function clearAllTasks(): Promise<void> {
  const queueState = await loadTaskQueue();
  if (queueState.tasks.length > 0) {
    queueState.tasks = [];
    await saveTaskQueue(queueState);
    log('[TaskQueue] Cleared all tasks from queue', 'info');
  }
}

/**
 * Move all failed tasks back to pending.
 */
export async function retryFailedTasks(): Promise<void> {
  const queueState = await loadTaskQueue();
  let count = 0;
  queueState.tasks.forEach(t => {
    if (t.status === 'failed') {
      t.status = 'pending';
      delete t.error;
      t.retryCount = 0;
      count++;
    }
  });
  if (count > 0) {
    await saveTaskQueue(queueState);
    log(`[TaskQueue] Reset ${count} failed tasks to pending`, 'info');
  }
}


/**
 * Shared queue delay countdown state.
 */
let _queueDelayUntil = 0;
export function setQueueDelayUntil(ts: number): void { _queueDelayUntil = ts; }
export function getQueueDelayUntil(): number { return _queueDelayUntil; }

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

