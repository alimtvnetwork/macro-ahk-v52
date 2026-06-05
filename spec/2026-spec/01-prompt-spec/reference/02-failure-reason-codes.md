# Failure Reason Codes (closed enum)

Every `FailureReport.Reason` MUST be one of these. Adding a code requires a spec PR.

| Code | Phase | Meaning |
|---|---|---|
| `LoaderParseFailed` | load | `info.json` or `prompt.md` invalid |
| `LoaderSourceUnreachable` | load | source IO failed |
| `VariableMissing` | resolve | required var with no default |
| `VariableTypeMismatch` | resolve | provided value fails type check |
| `EditorNotFound` | inject | no adapter matched |
| `PasteVerificationFailed` | inject | post-paste text not present |
| `ClipboardBlocked` | inject | all clipboard fallbacks failed |
| `SubmitButtonNotFound` | next | host submit selector unresolved |
| `SubmitButtonDisabled` | next | disabled past 5 s grace |
| `HostNavigated` | run | page navigated mid-task |
| `QueueFull` | enqueue | over capacity |
| `RetryExhausted` | lifecycle | retries exceeded `maxRetries` |
| `Cancelled` | lifecycle | user cancelled |
| `Timeout` | run | task exceeded budget |
| `StorageQuotaExceeded` | persist | storage write failed |
| `InternalAssertionFailed` | any | invariant violation (bug) |

## Acceptance

- [ ] The implementation satisfies the `Failure Reason Codes (closed enum)` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

