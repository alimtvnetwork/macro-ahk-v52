# Concurrency

## Rule: single-run-per-tab
At most one macro in state `Running` or `Paused` per `TabId`. Enforced by the `MacroRun.Active.<TabId>` pointer in `chrome.storage.local`.

## Queueing policy
**There is no queue.** Start requests for an already-active tab are rejected with `Reason='TabBusy'`, `ReasonDetail` = active RunId + Slug. The panel surfaces an inline error and offers **Stop current and start** as a one-click action.

Rationale: queued runs accumulate stale Variables and surprise users when they fire later. Explicit Stop → Start matches the recorder's mental model.

## Cross-tab parallelism
- Different tabs MAY run different macros simultaneously.
- Shared resources (SQLite, `chrome.storage.local` writes) serialize via the existing build-lock-style sentinel pattern — writers acquire `MacroEngineWriteLock` with 60s sequential deadline (no retry/backoff).
- Audit folders are RunId-scoped, so per-tab runs never collide on disk.

## Abort semantics
| Trigger | Effect |
|---------|--------|
| User clicks Stop | Runner transitions `Running|Paused → Failed`, `Reason='UserStopped'`. Active `ExecStep` receives `AbortStep` message; injector cancels in-flight DOM work and returns `StepFailed`. |
| Tab closed | `chrome.tabs.onRemoved` → `Failed`, `Reason='TabClosed'`. No further messages sent. |
| Extension reload | All active runs → `Failed`, `Reason='ExtensionReload'` on next rehydration. |
| Watchdog timeout | `Failed`, `Reason='Timeout'` (see `08-watchdog.md`). |

## Abort safety
- Abort is **cooperative**: the injector checks an `AbortSignal` between micro-steps; long DOM operations are bounded by per-step timeout (see watchdog).
- After abort, the runner waits up to `ABORT_GRACE_MS = 2_000` for `StepFailed`, then force-finalizes with `Reason='AbortGraceExceeded'`.

## Invariants
- Stop is idempotent: calling Stop on a `Failed`/`Done` run is a no-op (logged at debug, never error).
- No partial state: every transition is persisted before side effects (per state-machine spec).
