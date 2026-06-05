# 04 — Recovery

**Date:** 2026-06-02
**Task:** T84

## Recovery surface, not retry

Per the No-Retry Policy, the engine never auto-recovers. Recovery is **always user-initiated** via explicit UI actions.

## Per-reason recovery menu

| Reason | Primary action | Secondary |
|--------|---------------|-----------|
| `LoggedOut` | Open login → after success, `resumeAll()` | Cancel queue |
| `SubmitMissing`/`SubmitDisabled` | Re-enqueue failed task | Inspect failure |
| `InsertRejected`/`PasteRejected` | Re-enqueue failed task | Edit prompt |
| `TargetDetached` | Re-enqueue failed task | Cancel queue |
| `IdleTimeout` | Re-enqueue failed task | Increase delay in Settings |
| `NavigationLost` | Cancel queue (mandatory; tab changed) | — |
| `PromptMissing` | Edit / restore prompt | Cancel queue |
| `VersionConflict` | Reload prompt → re-edit | — |
| `CapacityExceeded` | Wait for drain → re-enqueue | — |
| `CancelledByUser` | (none) | — |

## Re-enqueue API

```ts
QueueEngine.requeue(taskId): Promise<string>;  // returns new task id
```
- Loads the failed task, clones with fresh `id`, `attemptCount=0`, status `pending`.
- Re-renders body via the loader (picks up any prompt edits).
- Subject to the same capacity check.

## Single re-check (one-shot)

The only automatic recovery is the readiness-grace re-check inside `runOne` for `SubmitDisabled`. That re-check is **one attempt**, not a loop, and it consumes the task's `attemptCount` budget.

## Pitfalls

- **Silent-failure counter-example:** do not auto-retry a failed task in the background; recovery MUST be user-initiated except for the one-shot readiness re-check documented above.
- **Code Red log-shape counter-example:** do not create a new requeued task without linking the previous failed task id in `ReasonDetail`; reviewers must be able to trace recovery to the original failure.

## Acceptance

- [ ] The implementation satisfies the `04 — Recovery` contract in this file and the folder-level acceptance target: every failure path emits the mandatory failure-log shape and user-visible feedback.
- [ ] Verification passes when `UT-fail-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** assign every failure a stable `Reason` code from `reference/02-failure-reason-codes.md` plus a `ReasonDetail` string; missing codes are rejected by `check-must-constants.mjs`.
- **MUST** log via `Logger.error(scope, reason, caughtError)` — never bare `console.error`, never empty `catch {}`.
- **MUST** populate `SelectorAttempts[]` (id/strategy/expression/matched/matchCount/reason) on every selector miss; unknown fields written as `null` with a reason.
- **MUST** populate `VariableContext[]` (name/source/row/column/resolvedValue/type/reason) on every variable/data failure.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* TODO */ }`. ✅ Rejected by `public/error-swallow-audit.json`.
- ❌ Logging only the message string. ✅ Pass the `caught` object so stack + cause survive.
- ❌ Omitting `SelectorAttempts` because "only one selector was tried". ✅ Still log the single attempt with `matchCount=0`.
- ❌ Masking the user value in `VariableContext` by default. ✅ Always log the field name + type; mask the value only when verbose-logging is OFF.
- ❌ Retrying after `Reason="HostBlocked"`. ✅ Surface to user; require manual unblock.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../README.md) for sibling specs and cross-references.

## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
