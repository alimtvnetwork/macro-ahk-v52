/**
 * MacroLoop Controller — Auto-resume logic
 */

import { TaskQueueManager } from './task-manager';
import { checkForReturnButton } from './task-queue';
import { isReturnButtonVisible } from './xpath-utils';
import { log } from './logging';
import { state } from './shared-state';

/**
 * Check if the queue should auto-resume based on button disappearance.
 */
export function checkAutoResume(): void {
  if (!state.running) return;

  const manager = TaskQueueManager.getInstance();
  if (manager.isPaused() || !manager.isProcessing()) {
    const hasReturnButton = checkForReturnButton() || isReturnButtonVisible();
    
    if (!hasReturnButton) {
      log('[AutoResume] "Return to Extension" button gone. Resuming queue processing...', 'success');
      manager.startProcessing().catch(err => {
        console.error('[AutoResume] Failed to resume processing', err);
      });
    }
  }
}
