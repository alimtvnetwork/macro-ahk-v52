# 04 — Cancel & Pause

**Date:** 2026-06-02
**Task:** T74

## Pause (soft)

```ts
QueueEngine.pause();    // stops scheduling new ticks
QueueEngine.resumeLoop();
```

- Pause does **not** abort the currently-processing task — it finishes naturally (`completed`, `failed`, or `hold`).
- After the current task settles, the loop checks `paused` before picking the next `pending` task.
- The delay timer respects pause: if pause flips during `delay.wait()`, the timer is cancelled and re-armed on resume (see Step 12, `05-pause-during-delay.md`).

## Cancel current (hard)

```ts
QueueEngine.cancelCurrent();
```
- Aborts insert/click/observe via `AbortController`.
- Marks task `failed { reason: "CancelledByUser" }`.
- Leaves remaining `pending`/`hold` tasks untouched.

## Cancel all

Defined in `09-next-overview/05-cancel.md`. Recap:
- Current → `failed { CancelledByUser }`.
- All `pending` + `hold` → `failed { CancelledByUser }`.
- Delay timer aborted; `paused` state cleared.

## Idempotency

`pause`, `resumeLoop`, `cancelCurrent`, `cancelAll` are all idempotent — repeated calls after the queue is empty/idle are no-ops.

## Acceptance

- [ ] The implementation satisfies the `04 — Cancel & Pause` contract in this file and the folder-level acceptance target: enqueue, tick, retry, hold, cancel, pause, and completion events follow the queue lifecycle.
- [ ] Verification passes when `UT-lifecycle-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
