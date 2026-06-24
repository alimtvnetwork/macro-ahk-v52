---
Slug: rca
Status: pending
Created: 2026-06-24
Parent: 08-task-splitter-and-next-queue
---

# SS-01 — RCA + storage choice

## Root cause

There is currently no persistent task queue produced by a Task Splitter step. `runTaskNextLoop` / `runTaskNextQueue` (`task-next-ui.ts:185-219`) only paste the static "Next" prompt N times; the splitter button (`task-splitter-ui.ts`) pastes a one-shot prompt and has no parse-back path. Consequence: the user cannot "split into 10, then press Next 10 times" — Next has no knowledge of the produced subtasks.

## Idle signal reused

Same predicate the Repeat Loop uses in `repeat-loop-ui.ts` (Stop→Submit button swap with a 250 ms debounce, 180 s ceiling). Centralise as `waitForLovableIdle()` in `src/ui/lovable-idle.ts` if not already extracted in issue 01's resolution.

## Storage choice

**IndexedDB-only via `ProjectKvStore` section `task_queue`.** Rationale:
- Already used by other macro features → zero new infra.
- Per-project scoping is native (`projectId` is the store key).
- SQLite dual-write deferred — `spec/issue-131-task-queue.md` lists it as Layer 2 "periodic sync"; not needed for first cut and would add a no-retry-policy-violating sync loop.

Shape:
```ts
type QueueRecord = {
  items: Array<{ id: string; text: string; status: 'pending' | 'active' | 'done' | 'failed'; createdAt: number }>;
  updatedAt: number;
};
```

## Logging

Every catch routes through `RiseupAsiaMacroExt.Logger.error('TaskQueue.<op>', { Reason, ReasonDetail, ProjectId, QueueLen })` per `mem://standards/verbose-logging-and-failure-diagnostics`. No swallowed errors.
