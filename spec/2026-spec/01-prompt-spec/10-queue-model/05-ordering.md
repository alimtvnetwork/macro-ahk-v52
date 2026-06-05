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

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

