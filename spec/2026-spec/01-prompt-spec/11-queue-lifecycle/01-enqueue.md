# 01 — Enqueue

**Date:** 2026-06-02
**Task:** T71

## Single enqueue

```ts
QueueEngine.enqueue({
  kind: "next",
  promptSlug,
  context,           // PromptContext snapshot
});
```

Pipeline:
1. Render via `PromptLoader.render(slug, context)` — **synchronous body capture** at enqueue time (see `10-queue-model/01-task-shape.md` invariants).
2. Build `QueuedTask` with `id = ulid()`, `status = "pending"`, `attemptCount = 0`.
3. `QueueStore.add(task)` → emits `{ kind: "added", ids: [id] }`.
4. If the engine loop is idle, schedule it on next microtask.

## Bulk enqueue (Next-mode "run N times")

```ts
QueueEngine.enqueueBulk({ kind, promptSlug, context, count });
```

- Render once, reuse the same `renderedBody` for every clone (identical context).
- Generate `count` ULIDs (time-ordered, no collisions).
- Single `QueueStore.addMany(tasks)` call → single `{ kind: "added", ids }` event.
- Capacity check (see `10-queue-model/04-capacity.md`) is applied to the **whole batch**: if it would overflow, the entire enqueue rejects — no partial insert.

## Forbidden

- Enqueueing without a successful render (caller would receive a `PromptError` instead).
- Mutating an already-queued task's `renderedBody` (rebuild a new task instead).

## Acceptance

- [ ] The implementation satisfies the `01 — Enqueue` contract in this file and the folder-level acceptance target: enqueue, tick, retry, hold, cancel, pause, and completion events follow the queue lifecycle.
- [ ] Verification passes when `UT-lifecycle-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
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
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

