# 01 — Queue Task Shape

**Date:** 2026-06-02
**Task:** T66

```ts
interface QueuedTask {
  id: string;                    // ULID; stable across persistence
  kind: "next" | "plan" | "custom";
  promptSlug: string;            // resolved at enqueue time
  renderedBody: string;          // snapshotted text injected into ChatBox
  status: TaskStatus;            // see 02-statuses.md
  attemptCount: number;          // 0 or 1 only (no-retry policy)
  holdUntil?: string;            // ISO; set when status = "hold"
  createdAt: string;             // ISO
  startedAt?: string;
  completedAt?: string;
  failure?: FailureRecord;       // see 100-failure-handling/05-mandatory-failure-log
  contextSnapshot: PromptContext; // captured at enqueue; loader uses for render replay
}
```

## Invariants

- `id` is generated at enqueue, never mutated.
- `renderedBody` is computed **once** at enqueue using the loader; later edits to the prompt do not retroactively change queued tasks. This guarantees reproducibility.
- `attemptCount` is `{0,1}`. Beyond 1 violates the No-Retry policy.

## Serialization

When persisted (optional), tasks are JSON; `PromptContext` MUST be JSON-safe (no functions, no DOM refs).

## Acceptance

- [ ] The implementation satisfies the `01 — Queue Task Shape` contract in this file and the folder-level acceptance target: queued task shape, status transitions, capacity, storage, and ordering are enforced.
- [ ] Verification passes when `UT-queue-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
