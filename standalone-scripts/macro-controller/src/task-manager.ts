/**
 * MacroLoop Controller — Task Queue Manager
 * Coordinates queue processing, delays, and state synchronization.
 */

import { loadTaskQueue, saveTaskQueue, updateTaskStatus, checkForReturnButton, setQueueDelayUntil, type MacroTask, type TaskQueueState } from './task-queue';
import { getSettingsOverrides } from './settings-store';
import { log, logSub } from './logging';
import { getByXPath, isReturnButtonVisible } from './xpath-utils';
import { pasteIntoEditor, findPasteTarget, showPasteToast } from './ui/prompt-utils';
import { getPromptsConfig } from './ui/prompt-loader';
import { MacroController } from './core/MacroController';
import { saveCommunication } from './db/macro-db';

export class TaskQueueManager {
  private static _instance: TaskQueueManager | null = null;
  private _isProcessing = false;
  private _isPaused = false;
  private _isStopped = false;
  private _abortController: AbortController | null = null;

  isProcessing(): boolean { return this._isProcessing; }
  isPaused(): boolean { return this._isPaused; }
  setPaused(paused: boolean): void { this._isPaused = paused; }

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
    
    const queueState = await loadTaskQueue();
    if (queueState.isPaused || this._isPaused || queueState.tasks.length === 0) return;

    this._isProcessing = true;
    this._abortController = new AbortController();
    
    log('[TaskQueue] Starting queue processing...', 'info');
    
    try {
      while (this._isProcessing) {
        const queueState = await loadTaskQueue();
        const now = Date.now();
        const nextTask = queueState.tasks.find(t => t.status === 'pending' || (t.status === 'hold' && (t.holdUntil ?? 0) <= now));
        
        // Check for return button (indicates we should pause/delay)
        if (checkForReturnButton() || isReturnButtonVisible()) {
          log('[TaskQueue] "Return to Extension" button detected. Pausing processing loop.', 'warn');
          this._isPaused = true;
          this._isProcessing = false;
          break;
        }

        if (!nextTask || queueState.isPaused || this._isPaused) {
          this._isProcessing = false;
          break;
        }

        await this.processTask(nextTask);
        
        // Apply configured delay
        const overrides = getSettingsOverrides();
        const delaySec = overrides.nextSubmissionDelaySeconds ?? 22;
        
        if (overrides.enableNextSubmissionDelay !== false) {
          log(`[TaskQueue] Waiting ${delaySec}s before next task...`, 'info');
          const delayMs = delaySec * 1000;
          setQueueDelayUntil(Date.now() + delayMs);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          setQueueDelayUntil(0);
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
      await this._handleTaskFailure(task, 'Injection failed');
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
      await this._handleTaskFailure(task, 'Submit button not found');
      showPasteToast('⚠️ Submit button not found - task marked failed', true);
    }
  }

  private async _handleTaskFailure(task: MacroTask, reason: string): Promise<void> {
    const overrides = getSettingsOverrides();
    const retries = task.retryCount ?? 0;
    const maxRetries = overrides.maxTaskRetries ?? 3;

    if (overrides.retryOnFailure !== false && retries < maxRetries) {

      const nextRetry = retries + 1;
      const holdMs = 10000 * nextRetry; // 10s, 20s, 30s backoff
      log(`[TaskQueue] Task ${task.id} failed (${reason}). Retry ${nextRetry}/${maxRetries} in ${holdMs / 1000}s.`, 'warn');
      
      const queueState = await loadTaskQueue();
      const t = queueState.tasks.find(t => t.id === task.id);
      if (t) {
        t.status = 'hold';
        t.error = reason;
        t.retryCount = nextRetry;
        t.holdUntil = Date.now() + holdMs;
        await saveTaskQueue(queueState);
      }
    } else {
      log(`[TaskQueue] Task ${task.id} failed permanently: ${reason}`, 'error');
      await updateTaskStatus(task.id, 'failed', reason);
      
      if (overrides.pauseQueueOnError !== false) {
        log('[TaskQueue] Pausing queue due to failure (Pause on Error enabled)', 'warn');
        this._isPaused = true;
        const queueState = await loadTaskQueue();
        queueState.isPaused = true;
        await saveTaskQueue(queueState);
      }
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
