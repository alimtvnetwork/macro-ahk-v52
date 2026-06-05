# 03 — Retry & Hold

**Date:** 2026-06-02
**Task:** T73

## No-Retry Policy (project-wide hard rule)

The queue **does not retry failed tasks**. There is no exponential backoff, no scheduled redelivery, no automatic re-enqueue. `attemptCount` is bounded to `{0, 1}` where the single bump models the readiness-grace re-check defined in `09-next-overview/03-disabled-button-handling.md`.

## Hold vs Fail

| Signal | Outcome | Resumable? |
|--------|---------|------------|
| Interruption banner / 401 / 403 | `hold` | Yes, user clicks Resume |
| Idle timeout | `failed { reason: "IdleTimeout" }` | No, user re-enqueues |
| Submit disabled (after grace) | `failed { reason: "SubmitDisabled" }` | No |
| Insert rejected | `failed { reason: "InsertRejected" }` | No |
| Cancel | `failed { reason: "CancelledByUser" }` | No |

## Manual resume from `hold`

```ts
QueueEngine.resume(id);
```
- Re-enters `processing` **without** re-injecting (submit may have already landed).
- Re-runs the idle observer with a fresh `timeoutMs`.
- If the user wants to re-inject, they cancel and re-enqueue explicitly.

## Bulk resume

`QueueEngine.resumeAll()` calls `resume` on every `hold` task in FIFO order. Stops at the first `failed` outcome so the user can inspect.

## Acceptance

- [ ] The implementation satisfies the `03 — Retry & Hold` contract in this file and the folder-level acceptance target: enqueue, tick, retry, hold, cancel, pause, and completion events follow the queue lifecycle.
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

