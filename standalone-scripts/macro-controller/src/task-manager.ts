/**
 * MacroLoop Controller — Task Queue Manager
 * Coordinates queue processing, delays, and state synchronization.
 */

import { loadTaskQueue, saveTaskQueue, updateTaskStatus, checkForReturnButton, type MacroTask, type TaskQueueState } from './task-queue';
import { getSettingsOverrides } from './settings-store';
import { log, logSub } from './logging';
import { getByXPath, isReturnButtonVisible } from './xpath-utils';
import { pasteIntoEditor, findPasteTarget } from './ui/prompt-utils';
import { getPromptsConfig } from './ui/prompt-loader';
import { MacroController } from './core/MacroController';
import { saveCommunication } from './db/macro-db';

export class TaskQueueManager {
  private static _instance: TaskQueueManager | null = null;
  private _isProcessing = false;
  private _abortController: AbortController | null = null;

  static getInstance(): TaskQueueManager {
    if (!TaskQueueManager._instance) {
      TaskQueueManager._instance = new TaskQueueManager();
    }
    return TaskQueueManager._instance;
  }

  /**
   * Start processing the queue.
   */
  async startProcessing(): Promise<void> {
    if (this._isProcessing) return;
    
    const state = await loadTaskQueue();
    if (state.isPaused || state.tasks.length === 0) return;

    this._isProcessing = true;
    this._abortController = new AbortController();
    
    log('[TaskQueue] Starting queue processing...', 'info');
    
    try {
      while (this._isProcessing) {
        const queueState = await loadTaskQueue();
        const nextTask = queueState.tasks.find(t => t.status === 'pending');
        
        // Check for return button (indicates we should pause/delay)
        if (checkForReturnButton() || isReturnButtonVisible()) {
          log('[TaskQueue] "Return to Extension" button detected. Pausing processing loop.', 'warn');
          this._isProcessing = false;
          break;
        }

        if (!nextTask || queueState.isPaused) {
          this._isProcessing = false;
          break;
        }

        await this.processTask(nextTask);
        
        // Apply configured delay
        const overrides = getSettingsOverrides();
        // Default to 22s as requested by user
        const delaySec = overrides.nextSubmissionDelaySeconds ?? 22;
        
        if (overrides.enableNextSubmissionDelay !== false) {
          log(`[TaskQueue] Waiting ${delaySec}s before next task...`, 'info');
          await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
        }
      }
    } catch (err) {
      log('[TaskQueue] Queue processing interrupted', 'warn');
    } finally {
      this._isProcessing = false;
    }
  }

  /**
   * Process a single task: injection + submission.
   */
  private async processTask(task: MacroTask): Promise<void> {
    log(`[TaskQueue] Processing task: ${task.id}`, 'info');
    await updateTaskStatus(task.id, 'processing');

    const promptsCfg = getPromptsConfig();
    const outcome = pasteIntoEditor(task.prompt, promptsCfg, (xpath) => {
      const node = getByXPath(xpath);
      return node instanceof Element ? node : null;
    });

    if (outcome === 'failed') {
      await updateTaskStatus(task.id, 'failed', 'Injection failed');
      return;
    }

    // Attempt to click submit button
    const submitBtn = this.findSubmitButton();
    if (submitBtn) {
      submitBtn.click();
      await updateTaskStatus(task.id, 'completed');
      
      // Sync to SQLite
      await saveCommunication(task.projectId, task.prompt);
      
      log(`[TaskQueue] Task completed: ${task.id}`, 'success');
    } else {
      await updateTaskStatus(task.id, 'failed', 'Submit button not found');
      log(`[TaskQueue] Submit button not found for task ${task.id}`, 'error');
    }
  }

  private findSubmitButton(): HTMLElement | null {
    const sendSelectors = [
      'form button[type="submit"]',
      'form button:not([disabled]):last-of-type',
      'button[aria-label*="send" i]',
      'button[data-testid*="send" i]'
    ];

    for (const selector of sendSelectors) {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement && !el.disabled) return el;
    }
    return null;
  }

  stopProcessing(): void {
    this._isProcessing = false;
    if (this._abortController) {
      this._abortController.abort();
    }
  }
}
