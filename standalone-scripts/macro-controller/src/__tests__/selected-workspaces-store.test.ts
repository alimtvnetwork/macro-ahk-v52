import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSelectedWsIds,
  setSelectedWsIds,
  toggleWsSelection,
  clearWsSelection,
  subscribeSelectedWorkspaces,
  isWsSelected,
  __resetSelectedWorkspacesStore
} from '../selected-workspaces-store';

describe('selected-workspaces-store', () => {
  beforeEach(() => {
    __resetSelectedWorkspacesStore();
  });

  it('should start empty', () => {
    expect(getSelectedWsIds().size).toBe(0);
  });

  it('should set multiple IDs', () => {
    setSelectedWsIds(['ws-1', 'ws-2']);
    const selected = getSelectedWsIds();
    expect(selected.has('ws-1')).toBe(true);
    expect(selected.has('ws-2')).toBe(true);
    expect(selected.size).toBe(2);
  });

  it('should toggle selection', () => {
    toggleWsSelection('ws-1');
    expect(isWsSelected('ws-1')).toBe(true);
    toggleWsSelection('ws-1');
    expect(isWsSelected('ws-1')).toBe(false);
  });

  it('should clear selection', () => {
    setSelectedWsIds(['ws-1', 'ws-2']);
    clearWsSelection();
    expect(getSelectedWsIds().size).toBe(0);
  });

  it('should notify subscribers', () => {
    const cb = vi.fn();
    subscribeSelectedWorkspaces(cb);
    // Initial notification on subscribe
    expect(cb).toHaveBeenCalledTimes(1);

    toggleWsSelection('ws-1');
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(new Set(['ws-1']));
  });

  it('should unsubscribe', () => {
    const cb = vi.fn();
    const unsub = subscribeSelectedWorkspaces(cb);
    unsub();
    toggleWsSelection('ws-1');
    expect(cb).toHaveBeenCalledTimes(1); // Only the initial one
  });
});
