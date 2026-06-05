# 04 — Plan vs Next Comparison

**Date:** 2026-06-02
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

## Acceptance

- [ ] The implementation satisfies the `04 — Plan vs Next Comparison` contract in this file and the folder-level acceptance target: PlanLoop renders, queues, edits, and compares against NextLoop without autorun ambiguity.
- [ ] Verification passes when `E2E-plan-001..003` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.