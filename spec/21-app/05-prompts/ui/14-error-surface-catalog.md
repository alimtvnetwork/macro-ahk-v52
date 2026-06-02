# Error Surface Catalog

Every recoverable error has a stable code (`E-NN`), surface, copy, and dismissal contract.

| Code | Surface | Trigger | User copy | Dismiss |
|---|---|---|---|---|
| E-01 | toast (alert) | `MissingVariable` | "Macro can't start: missing variable {Name}." | auto 8 s |
| E-02 | toast | `UndeclaredVariable` | "Prompt references unknown {{Name}}. Check info.json." | manual |
| E-03 | toast | `VarTypeMismatch` | "Variable {Name} must be {Type}." | auto 6 s |
| E-04 | toast | `VarOutOfRange` | "Variable {Name}={Value} outside {Min}..{Max}." | auto 6 s |
| E-05 | toast | `VarEnumMismatch` | "Variable {Name} must be one of {Values}." | auto 6 s |
| E-06 | toast (assertive) | `WatchdogTimeout` | "Step {N} timed out ({Ms} ms)." | manual |
| E-07 | toast (assertive) | `LoopBudgetExceeded` | "Macro stopped: loop limit ({Cap}) reached." | manual |
| E-08 | toast | `TabClosed` | "Macro aborted: target tab closed." | auto 8 s |
| E-09 | toast | `TabBusy` | "Another macro is running in this tab." | auto 6 s |
| E-10 | toast | `NewTabGuard` | "Can't run on a blank or new-tab page." | auto 6 s |
| E-11 | toast | `ClipboardBlocked` | "Clipboard blocked. Try again after a click." | manual |
| E-12 | inline | `InfoJsonInvalid` | "Prompt {Slug} has an invalid info.json (see details)." | manual |
| E-13 | inline | `StorageQuota` | "Storage full. Old run states pruned." | auto 8 s |
| E-14 | banner (panel top) | bearer token missing | "Sign in to run macros." | persistent |
| E-15 | inline | `SwRestartedNonIdempotent` | "A non-resumable step was interrupted. Re-run from step {N}." | manual |

All toasts use `role="alert"` (assertive) for run-fatal codes, `role="status"` (polite) otherwise.
