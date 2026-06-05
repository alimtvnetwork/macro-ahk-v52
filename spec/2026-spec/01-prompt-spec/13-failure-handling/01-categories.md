# 01 — Failure Categories

**Date:** 2026-06-02
**Task:** T81

## Canonical taxonomy

```ts
type FailureReason =
  | "LoggedOut"          // auth gone (cookie absent or 401/403 observed)
  | "SubmitMissing"      // resolver returned null both attempts
  | "SubmitDisabled"     // present but not ready both attempts
  | "InsertRejected"     // adapter could not write the body
  | "TargetDetached"     // ChatBox vanished mid-flight
  | "IdleTimeout"        // observer never reported Idle within timeoutMs
  | "NavigationLost"     // location changed mid-task
  | "PasteRejected"      // host editor refused the inserted text
  | "PromptMissing"      // referenced slug no longer exists
  | "VersionConflict"    // store ifMatch failed
  | "CapacityExceeded"   // bulk enqueue overflow
  | "CancelledByUser"
  | "Unknown";
```

## Mapping table

| Symptom | Reason |
|---------|--------|
| 401/403 on host XHR | `LoggedOut` |
| Auth cookie probe empty | `LoggedOut` |
| Submit button null after grace | `SubmitMissing` |
| Submit `disabled` / `aria-disabled` after grace | `SubmitDisabled` |
| `EditorAdapter` returned `ok:false` | `InsertRejected` |
| `target.isConnected === false` mid-run | `TargetDetached` |
| `whenIdle` resolved `Timeout` | `IdleTimeout` |
| `window.location` changed mid-task | `NavigationLost` |
| Verifier read-back mismatch | `PasteRejected` |
| Loader returned `PromptError.NotFound` | `PromptMissing` |
| Anything else | `Unknown` (with raw error in `ReasonDetail`) |

## Severity (UI hint, not behaviour)

- **Blocking** (entire queue stops being useful): `LoggedOut`, `NavigationLost`.
- **Per-task** (queue continues): everything else.

Note: per the No-Retry rule, severity does **not** trigger retries. It only drives toast tone and whether the queue auto-pauses.

## Pitfalls

- **Silent-failure counter-example:** do not collapse `SubmitMissing`, `SubmitDisabled`, and `TargetDetached` into `Unknown`; each has a distinct UI recovery path and selector-attempt evidence.
- **Code Red log-shape counter-example:** do not emit only `{ reason: "Unknown" }`; every failure MUST include `Reason`, `ReasonDetail`, `SelectorAttempts[]`, and `VariableContext[]` per `05-mandatory-failure-log.md`.

## Acceptance

- [ ] The implementation satisfies the `01 — Failure Categories` contract in this file and the folder-level acceptance target: every failure path emits the mandatory failure-log shape and user-visible feedback.
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
- See [folder index](../readme.md) for sibling specs and cross-references.

## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
