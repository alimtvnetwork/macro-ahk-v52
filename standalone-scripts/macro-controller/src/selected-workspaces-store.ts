/**
 * Selected-workspaces store — pub/sub for multi-workspace bulk operations.
 * (Issue 130 Task 2).
 *
 * Producers (ws-list-renderer / ws-checkbox-handler) toggle or set selection.
 * Consumers (ws-context-menu / ws-members-bulk-panel) subscribe to updates.
 *
 * Supports range selection (Shift+click) and toggles (Ctrl/Cmd+click).
 */

const selectedIds = new Set<string>();
const listeners = new Set<(ids: Set<string>) => void>();

function notify(): void {
  for (const cb of listeners) {
    try {
      cb(new Set(selectedIds));
    } catch (_e: unknown) {
      // Listeners must not break producers
    }
  }
}

export function getSelectedWsIds(): Set<string> {
  return new Set(selectedIds);
}

export function isWsSelected(wsId: string): boolean {
  return selectedIds.has(wsId);
}

export function setSelectedWsIds(ids: string[]): void {
  selectedIds.clear();
  for (const id of ids) selectedIds.add(id);
  notify();
}

export function toggleWsSelection(wsId: string): void {
  if (selectedIds.has(wsId)) {
    selectedIds.delete(wsId);
  } else {
    selectedIds.add(wsId);
  }
  notify();
}

export function clearWsSelection(): void {
  selectedIds.clear();
  notify();
}

export function subscribeSelectedWorkspaces(cb: (ids: Set<string>) => void): () => void {
  listeners.add(cb);
  cb(new Set(selectedIds));
  return function unsubscribe(): void {
    listeners.delete(cb);
  };
}

/** Test-only: reset module singleton state between tests. */
export function __resetSelectedWorkspacesStore(): void {
  selectedIds.clear();
  listeners.clear();
}
