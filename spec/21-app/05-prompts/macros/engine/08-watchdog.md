# Watchdog

Three independent timers guard every run. All fire-and-fail (no retry, no backoff).

## Timers

| Timer | Default | Configurable on | Trigger |
|-------|---------|-----------------|---------|
| **Per-step** | 60_000 ms | `Step.TimeoutMs` (overrides default) | `Running` → `Failed`, `Reason='StepTimeout'` |
| **Total-run** | 30 * 60_000 ms (30 min) | `Macro.TotalTimeoutMs` | any state → `Failed`, `Reason='RunTimeout'` |
| **Loop-count** | `Macro.MaxLoops` (hard cap 25) | `Macro.MaxLoops` | `Looping` → `Done`, `Reason='MaxLoopsReached'` (terminal success-as-cap) |

## Lifecycle
1. Per-step timer **starts** on every `StepStarted` emit; cleared on `StepCompleted` / `StepFailed`.
2. Total-run timer starts once on `RunStarted`; cleared on terminal state.
3. Loop-count is a counter, not a timer; decremented inside the state machine.

## Implementation
- All timers registered via the project's `TimerRegistry` (per `mem://standards/timer-and-observer-teardown`); paired teardown on every terminal state and on `pagehide`.
- Timers pause while `document.hidden` is true **only** for the panel's UI heartbeat. The background runner's timers are wall-clock and DO NOT pause (correctness > battery).
- Timer IDs persisted to `MacroRun.<RunId>.WatchdogIds` so SW restart can re-arm with remaining budget (`remaining = budget - (now - StartedAtKL)`).

## Hard ceilings (not overridable)
- Per-step: 10 minutes (any larger value clamped + logged with `Reason='TimeoutClampedToCeiling'`).
- Total-run: 2 hours.
- MaxLoops: 25.

## Failure log
Every timeout failure includes:
- `Reason` (one of above codes)
- `ReasonDetail`: `"budget=<ms>, elapsed=<ms>, stepIndex=<n>"`
- Full `SelectorAttempts[]` if the step was selector-driven
- Full `VariableContext[]` snapshot at timeout
