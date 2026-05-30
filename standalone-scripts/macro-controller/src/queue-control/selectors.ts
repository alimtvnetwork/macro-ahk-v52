/**
 * Queue Pause / Resume selectors (Issue 124).
 * These are the ONLY buttons the run-state gate is allowed to click.
 */

export const QUEUE_PAUSE_BUTTON_XPATH =
    '/html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/div[1]/div[2]/div/div[1]/div/button[1]';
export const QUEUE_PLAY_BUTTON_XPATH =
    '/html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/div[1]/div[2]/div/div[1]/div/button[2]';
export const QUEUE_PAUSE_ARIA_LABEL = 'Pause queue';
export const QUEUE_RESUME_ARIA_LABEL = 'Resume queue';
