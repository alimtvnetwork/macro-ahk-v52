/**
 * Selectors for Lovable composer run-state detection (Issue 124).
 *
 * READ-ONLY: We never click the composer Submit or STOP button.
 * The STOP icon's presence (or the Submit button's absence) only tells us
 * whether a prompt is currently streaming. Control across moves is exclusively
 * via the Queue Pause / Queue Resume buttons in `queue-control/`.
 */

// Composer submit button (read-only observation)
export const SUBMIT_BUTTON_ID = 'chatinput-send-message-button';
export const SUBMIT_BUTTON_XPATH =
    '/html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/form/div[2]/div/button[3]';
export const STOP_ICON_XPATH =
    '/html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/form/div[2]/div/button[3]/span[7]';

// SVG path-d prefixes that identify which icon is currently inside the button.
export const STOP_ICON_SVG_PATH_PREFIX = 'M20.75 17';
export const SEND_ICON_SVG_PATH_PREFIX = 'M11 19V7.415';
