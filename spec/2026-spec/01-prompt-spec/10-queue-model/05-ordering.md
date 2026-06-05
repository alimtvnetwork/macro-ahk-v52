# 05 — Ordering

**Date:** 2026-06-02
**Task:** T70

## Default: FIFO

Tasks process in `createdAt` ascending order. Ties (same millisecond) break by `id` lexicographic — ULIDs are time-ordered, so this is stable.

## Manual reorder API

```ts
interface QueueOrdering {
  /** Move a task to a new 0-based index among non-terminal tasks. */
  moveTo(id: string, index: number): Promise<void>;
  /** Convenience: bump to front of the non-terminal queue. */
  prioritise(id: string): Promise<void>;
}
```

## Rules

- Only `pending` and `hold` tasks may be reordered. The currently-`processing` task is pinned at position 0 and is not movable.
- Reorder writes a `sortKey: number` field on each affected task (fractional indexing) so listeners get a single `updated` event per moved task without rewriting every neighbour.
- Terminal tasks are excluded from index math and rendered separately (typically in a collapsed "History" section).

## UI binding

Drag-and-drop in the queue panel calls `moveTo(id, newIndex)`. Keyboard shortcuts `Alt+↑ / Alt+↓` step a focused task by one slot.

## Acceptance

- [ ] The implementation satisfies the `05 — Ordering` contract in this file and the folder-level acceptance target: queued task shape, status transitions, capacity, storage, and ordering are enforced.
- [ ] Verification passes when `UT-queue-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
