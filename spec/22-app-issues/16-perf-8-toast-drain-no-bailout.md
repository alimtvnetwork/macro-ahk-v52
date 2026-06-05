# PERF-8 — Toast `queueDrainTimer` ticks forever when SDK never injects

**Severity:** 🟡 MEDIUM · **Filed:** 2026-06-03 () · **Owner:** macro-controller toast

## Symptom
On a non-target tab `getNotify()` always returns `null`. `drainQueue()` early-returns without stopping the timer, so `TOAST_QUEUE_POLL_MS` keeps firing indefinitely.

## Root cause
`standalone-scripts/macro-controller/src/toast.ts:211` — `queueDrainTimer` self-stops only when queue empties AND SDK loaded. Missing kill-switch + backoff when SDK absence persists.

## Fix (no code yet)
1. Track consecutive `notify === null` returns; after `MAX_SDK_MISS = 10` calls (≈ poll × 10), clear the timer and mark `sdkAbsent = true`.
2. Re-arm only on explicit `enqueueToast()` that finds `getNotify() !== null`.
3. Vitest: queue 1 toast in a no-SDK environment, advance time, assert timer cleared after 10 ticks.

## Cross-refs
- `plan.md` PERF-8
- `mem://standards/timer-and-observer-teardown`
- `mem://constraints/no-retry-policy` (bounded, no exponential)
