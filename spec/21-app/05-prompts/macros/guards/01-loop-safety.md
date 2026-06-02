# Guard — Loop Safety

Three layers prevent runaway loops; all fail-fast (no exponential backoff, no auto-retry — per No-Retry policy).

## Layer 1 — `MaxLoops` enforcement (declarative)
- `Macro.MaxLoops` is required, integer 1–25.
- Authoring-time: Ajv rejects `MaxLoops > 25` (`Reason='MaxLoopsCeilingExceeded'`).
- Runtime: `LoopsRemaining` initialized to `MaxLoops`, decremented on each `LoopEntered`. When `0`, the state machine transitions to `Done` with `Reason='MaxLoopsReached'` — a **terminal success-as-cap** (not a failure).

## Layer 2 — Watchdog (defensive)
- Total-run timer (default 30 min, hard ceiling 2 h) — see `engine/08-watchdog.md`.
- If a loop spins faster than expected (e.g., `LoopIf` always true and steps complete in < 100ms), the total-run timer still terminates.
- Loop iteration rate sanity: if 10 loops complete in < 1 s combined → `Reason='LoopRateExceeded'` (likely misconfigured `LoopIf` always-true).

## Layer 3 — Step-progress watchdog
- Between consecutive `LoopEntered` events the runner asserts at least **one** `StepCompleted` event occurred for a step **other than** the LoopAnchor.
- If a loop entry is reached without intervening non-anchor progress → `Reason='LoopWithoutProgress'`.

## Sequential fail-fast (no retry, no backoff)
- A failed step does NOT auto-retry. Loop iteration only continues when the previous iteration completed (`StepCompleted` on the last step + `LoopIf` evaluates truthy).
- Backoff between iterations: **none**. Iterations run back-to-back (subject to watchdog).

## Failure log
`Reason ∈ { MaxLoopsCeilingExceeded, MaxLoopsReached, LoopRateExceeded, LoopWithoutProgress, RunTimeout }` with `ReasonDetail` = `"iter=<n>, elapsedMs=<m>, anchor=<stepIndex>"`.

## Tests
- `tests/engine/loop-safety.test.ts` covers each Reason; fixtures include an `LoopIf: "true"` macro to exercise layer-2 and layer-3.
