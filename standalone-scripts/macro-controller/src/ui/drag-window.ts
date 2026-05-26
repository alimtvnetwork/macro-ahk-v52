/**
 * makeDraggable — minimal window-drag behavior for floating panels (v3.30.0).
 *
 * Attaches mousedown on `handle`, captures the offset from the panel's top-left
 * corner, then re-positions `panel` on every mousemove (clamped to viewport).
 * Cleans up the document-level mousemove/mouseup listeners on drop.
 *
 * Contract:
 *   - `panel` must be `position:fixed` (or `absolute`) — we set `left/top`.
 *   - `handle` is the drag affordance (typically the title bar). Mousedown on
 *     interactive children (button, input, select, textarea, [role=button],
 *     `data-marco-action`) is ignored so close buttons & form controls keep
 *     working.
 *   - Returns a cleanup function that detaches the mousedown listener; calling
 *     it is optional — the handler holds no closures over external state.
 *
 * No external deps. Pointer Events are intentionally NOT used to keep
 * behavior identical on JSDOM and older Chromium MV3 contexts.
 */

const INTERACTIVE_SELECTOR =
  'button,input,select,textarea,a,[role="button"],[data-marco-action]';

const MIN_VIEWPORT_MARGIN = 4;

export interface DragOptions {
  /** Cursor style applied to the handle while idle. Defaults to `move`. */
  idleCursor?: string;
  /** Cursor style applied to the handle while dragging. Defaults to `grabbing`. */
  draggingCursor?: string;
}

export function makeDraggable(
  panel: HTMLElement,
  handle: HTMLElement,
  options: DragOptions = {},
): () => void {
  const idleCursor = options.idleCursor ?? 'move';
  const draggingCursor = options.draggingCursor ?? 'grabbing';
  handle.style.cursor = idleCursor;
  handle.style.userSelect = 'none';

  function onMouseDown(e: MouseEvent): void {
    // Ignore non-primary buttons (right-click, middle-click).
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest(INTERACTIVE_SELECTOR)) return;

    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const panelW = rect.width;
    const panelH = rect.height;

    // Switch to explicit left/top positioning (clear right/bottom in case the
    // panel was opened with right-anchored CSS, e.g. credit-totals modal).
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    handle.style.cursor = draggingCursor;
    document.body.style.userSelect = 'none';

    function onMouseMove(ev: MouseEvent): void {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = ev.clientX - offsetX;
      let top = ev.clientY - offsetY;
      left = Math.max(MIN_VIEWPORT_MARGIN,
        Math.min(left, vw - panelW - MIN_VIEWPORT_MARGIN));
      top = Math.max(MIN_VIEWPORT_MARGIN,
        Math.min(top, vh - panelH - MIN_VIEWPORT_MARGIN));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    }

    function onMouseUp(): void {
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      handle.style.cursor = idleCursor;
      document.body.style.userSelect = '';
    }

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
  }

  handle.addEventListener('mousedown', onMouseDown);
  return function detach(): void {
    handle.removeEventListener('mousedown', onMouseDown);
    handle.style.cursor = '';
    handle.style.userSelect = '';
  };
}
