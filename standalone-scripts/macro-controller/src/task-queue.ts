/**
 * MacroLoop Controller — Task Queue Persistence & Model
 */

import { getProjectKvStore } from './project-kv-store';
import { extractProjectIdFromUrl } from './workspace-detection';
import { log, logSub } from './logging';
import { StorageKey } from './types';

export interface MacroTask {
  id: string;
  projectId: string;
  projectName: string;
  prompt: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface TaskQueueState {
  tasks: MacroTask[];
  isPaused: boolean;
}

const SECTION = 'task_queue';
const STATE_KEY = 'queue_state';

/**
 * Load the task queue for the current project from IndexedDB.
 */
export async function loadTaskQueue(): Promise<TaskQueueState> {
  const projectId = extractProjectIdFromUrl();
  if (!projectId) return { tasks: [], isPaused: false };

  const store = getProjectKvStore('macro-controller');
  const state = await store.get<TaskQueueState>(SECTION, `${STATE_KEY}_${projectId}`);
  
  if (state) {
    log(`[TaskQueue] Loaded ${state.tasks.length} tasks for project ${projectId}`, 'info');
    return state;
  }
  
  return { tasks: [], isPaused: false };
}

/**
 * Save the task queue for the current project to IndexedDB.
 */
export async function saveTaskQueue(state: TaskQueueState): Promise<void> {
  const projectId = extractProjectIdFromUrl();
  if (!projectId) return;

  const store = getProjectKvStore('macro-controller');
  await store.set(SECTION, `${STATE_KEY}_${projectId}`, state);
}

/**
 * Add a new task to the queue.
 */
export async function addTaskToQueue(prompt: string, projectName: string): Promise<MacroTask | null> {
  const projectId = extractProjectIdFromUrl();
  if (!projectId) return null;

  const state = await loadTaskQueue();
  const newTask: MacroTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    projectId,
    projectName,
    prompt,
    timestamp: Date.now(),
    status: 'pending'
  };

  state.tasks.push(newTask);
  await saveTaskQueue(state);
  
  log(`[TaskQueue] Added task to queue: ${prompt.substring(0, 30)}...`, 'success');
  return newTask;
}

/**
 * Update a task's status in the queue.
 */
export async function updateTaskStatus(taskId: string, status: MacroTask['status'], error?: string): Promise<void> {
  const state = await loadTaskQueue();
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.status = status;
    if (error) task.error = error;
    await saveTaskQueue(state);
  }
}

/**
 * Clear completed tasks from the queue.
 */
export async function clearCompletedTasks(): Promise<void> {
  const state = await loadTaskQueue();
  const count = state.tasks.length;
  state.tasks = state.tasks.filter(t => t.status !== 'completed');
  if (state.tasks.length !== count) {
    await saveTaskQueue(state);
    log(`[TaskQueue] Cleared ${count - state.tasks.length} completed tasks`, 'info');
  }
}
