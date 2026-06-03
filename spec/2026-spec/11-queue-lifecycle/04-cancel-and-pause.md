# 04 — Cancel & Pause

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
