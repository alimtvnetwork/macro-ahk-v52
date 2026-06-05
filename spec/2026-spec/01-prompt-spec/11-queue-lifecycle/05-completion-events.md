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

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
