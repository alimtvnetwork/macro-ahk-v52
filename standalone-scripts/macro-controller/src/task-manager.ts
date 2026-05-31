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
  private _executionLogs: string[] = [];
  private _onLogUpdate: ((logs: string[]) => void) | null = null;

  private _logExecution(msg: string, level: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const time = new Date().toLocaleTimeString();
    const logMsg = `[${time}] ${msg}`;
    this._executionLogs.push(logMsg);
    if (this._executionLogs.length > 100) this._executionLogs.shift();
    if (this._onLogUpdate) this._onLogUpdate([...this._executionLogs]);
    log(`[TaskExecution] ${msg}`, level);
  }

  getExecutionLogs(): string[] { return this._executionLogs; }
  onLogUpdate(cb: (logs: string[]) => void): void { this._onLogUpdate = cb; }


  isProcessing(): boolean { return this._isProcessing; }
  isPaused(): boolean { return this._isPaused; }
  isStopped(): boolean { return this._isStopped; }
  setPaused(paused: boolean): void { this._isPaused = paused; }
  setStopped(stopped: boolean): void { this._isStopped = stopped; }

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
    
    this._isStopped = false;
    const queueState = await loadTaskQueue();
    if (queueState.isPaused || this._isPaused || queueState.tasks.length === 0) return;

    this._isProcessing = true;
    this._abortController = new AbortController();
    
    this._logExecution('Starting queue processing loop...', 'info');
    
    try {
      while (this._isProcessing && !this._isStopped) {
        const queueState = await loadTaskQueue();
        const now = Date.now();
        const nextTask = queueState.tasks.find(t => t.status === 'pending' || (t.status === 'hold' && (t.holdUntil ?? 0) <= now));
        
        // Check for return button or project locked
        if (checkForReturnButton() || isReturnButtonVisible()) {
          log('[TaskQueue] Interruption detected (Return button). Pausing loop.', 'warn');
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
    this._logExecution(`Processing task: ${task.prompt.substring(0, 50)}...`, 'info');
    await updateTaskStatus(task.id, 'processing');

    const promptsCfg = getPromptsConfig();
    this._logExecution('Injecting prompt into editor...', 'info');
    const outcome = pasteIntoEditor(task.prompt, promptsCfg, (xpath) => {
      const node = getByXPath(xpath);
      return node instanceof Element ? node : null;
    });

    if (outcome === 'failed') {
      this._logExecution('Injection failed', 'error');
      await this._handleTaskFailure(task, 'Injection failed');
      return;
    }

    // Attempt to click submit button
    const submitBtn = this.findSubmitButton();
    if (submitBtn) {
      this._logExecution('Submit button found, clicking...', 'success');
      submitBtn.click();
      await updateTaskStatus(task.id, 'completed');
      
      // Sync to SQLite
      await saveCommunication(task.projectId, task.prompt);
      
      this._logExecution('Task completed successfully', 'success');
    } else {
      // Smarter failure detection
      const isLoggedOut = !document.cookie.includes('lovable-session-id.id');
      const failReason = isLoggedOut ? 'Session expired (Logged out)' : 'Submit button not found';
      
      await this._handleTaskFailure(task, failReason);
      showPasteToast(`⚠️ ${failReason} - task marked failed`, true);
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
    this._isStopped = true;
    if (this._abortController) {
      this._abortController.abort();
    }
    log('[TaskQueue] Queue processing stopped manually', 'warn');
  }
}
