# 01 — Failure Categories

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
