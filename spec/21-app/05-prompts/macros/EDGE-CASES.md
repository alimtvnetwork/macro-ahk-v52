# Edge Cases — Normative

Every behavior listed here is **mandatory**. Each row cites the doc that elaborates.

| # | Case | Behavior | Spec |
|---:|---|---|---|
| 1 | SW restart mid-step | On rehydrate, re-emit `StepStarted(StepIndex)`, replay step from scratch (idempotent kinds only) | `engine/02-resume-after-sw-restart.md` |
| 2 | SW restart mid-non-idempotent step (e.g. `audit`) | Mark step `Aborted`, set `Reason='SwRestartedNonIdempotent'`, resume at `StepIndex+1` | `engine/10-pseudocode-runner.md` |
| 3 | Missing required variable | Abort run with `Reason='MissingVariable'`, emit `RunAborted` event | `variables/06-validation.md` |
| 4 | Undeclared `{{ Var }}` in template | Abort with `Reason='UndeclaredVariable'` | `variables/01-syntax.md` |
| 5 | Score parse fails | `score = null`; `loop-if` treats null as below threshold | `engine/12-pseudocode-score-parser.md` |
| 6 | Multiple `score:` lines | Last match wins | `engine/03-score-extraction.md` |
| 7 | `MaxLoops` exceeded | Abort with `Reason='LoopBudgetExceeded'` | `guards/12-loop-budget-table.md` |
| 8 | Watchdog timeout | Abort step + run; `Reason='WatchdogTimeout'`; ReasonDetail = step + ms | `engine/13-pseudocode-watchdog.md` |
| 9 | Tab closed mid-run | Abort with `Reason='TabClosed'`; flush logs before aborting | `engine/00-architecture.md` |
| 10 | New-tab/blank URL | Injector refuses; `Reason='NewTabGuard'` | `guards/03-new-tab-guard.md` |
| 11 | Sensitive variable in audit output | Replace with `***` before write | `variables/07-sensitive-masking.md` |
| 12 | Two concurrent macros on same tab | Reject second with `Reason='TabBusy'` | `engine/07-concurrency.md` |
| 13 | `info.json` schema mismatch | Reject at load; emit UI error surface E-12 | `ui/14-error-surface-catalog.md` |
| 14 | Storage quota exceeded | Prune oldest RunState; if still failing, `Reason='StorageQuota'` | `06-storage-contract.md` |
| 15 | Clipboard write blocked | Retry once at next user gesture; if still blocked, `Reason='ClipboardBlocked'` | `engine/00-architecture.md` |
