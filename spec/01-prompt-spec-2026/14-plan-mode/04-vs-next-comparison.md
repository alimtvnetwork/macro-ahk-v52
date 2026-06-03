# 04 — Plan vs Next Comparison

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T89

## Side-by-side

| Concern | Next mode | Plan mode |
|---------|-----------|-----------|
| Trigger | Dropdown → prompt → "Run × N" | Dedicated button / shortcut |
| Prompt source | Any user-selected slug | `PlanSettings.promptSlug` |
| Count | User-entered, capped at 999 | `PlanSettings.stepCount`, capped at 50 |
| Render time | Once per task at enqueue | Once at enqueue |
| Delay default | 7s | 12s |
| Skip-first | true | false |
| Idle timeout | 120s | 180s |
| Result handling | Continue iterating | Focus output, drain on first success |
| Typical use | "Reword this 5 ways", "Translate to N languages" | "Plan the next 10 steps" |
| Failure UX tone | Warning toast | Error toast |
| Observability bucket | `queue.kind=next` | `queue.kind=plan` |

## Shared invariants

- Same `QueuedTask` shape and statuses.
- Same `EditorAdapter` resolution.
- Same `FailureRecord` schema.
- Same No-Retry policy — one attempt, one readiness re-check, no backoff.
- Same cancel/pause semantics.

## What plan mode MUST NOT do

- Spawn nested queues from its own output (would violate single-runner invariant).
- Mutate the user's selected Next prompt.
- Persist plan output anywhere — output lives only in the host's chat history.
