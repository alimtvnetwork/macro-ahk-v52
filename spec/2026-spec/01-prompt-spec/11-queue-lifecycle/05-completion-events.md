# 05 — Completion Events

**Date:** 2026-06-02
**Task:** T75

## Observer interface

```ts
interface QueueObserver {
  onTaskStarted?(task: QueuedTask): void;
  onTaskCompleted?(task: QueuedTask): void;
  onTaskFailed?(task: QueuedTask): void;
  onTaskHeld?(task: QueuedTask): void;
  onQueueDrained?(summary: DrainSummary): void;
  onQueuePaused?(): void;
  onQueueResumed?(): void;
}

interface DrainSummary {
  completed: number;
  failed: number;
  held: number;       // > 0 means user must Resume to truly drain
  startedAt: string;
  endedAt: string;
}
```

## Subscription

```ts
const off = QueueEngine.subscribe(observer);
// later
off();
```

Multiple observers are supported; delivery order is registration order. Throwing in a handler MUST NOT abort the loop — caught, logged via the namespace logger, and skipped.

## "Drained" semantics

`onQueueDrained` fires when there are **zero non-terminal tasks** (`pending = 0 && processing = 0`). Tasks in `hold` count as non-terminal, so a queue with only held tasks is **not** drained — `onQueuePaused` fires instead and `onQueueDrained` waits until they resolve.

## Mandatory failure payload

`onTaskFailed` receives the task with its `failure: FailureRecord` populated per Core memory (Reason + ReasonDetail + SelectorAttempts + VariableContext). See `100-failure-handling/05-mandatory-failure-log.md`.

## Acceptance

- [ ] The implementation satisfies the `05 — Completion Events` contract in this file and the folder-level acceptance target: enqueue, tick, retry, hold, cancel, pause, and completion events follow the queue lifecycle.
- [ ] Verification passes when `UT-lifecycle-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
