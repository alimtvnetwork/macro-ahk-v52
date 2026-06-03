# 03 — Retry & Hold

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
