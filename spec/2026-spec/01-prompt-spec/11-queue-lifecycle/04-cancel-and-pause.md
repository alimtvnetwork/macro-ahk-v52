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

