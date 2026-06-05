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
