# PERF-4 — Redock observer leaves orphan `pollUntil` after teardown

**Severity:** 🟠 HIGH · **Filed:** 2026-06-03 () · **Owner:** macro-controller UI

## Symptom
`resetRedockState()` does not cancel the active poll. Orphan interval keeps ticking for up to `pollMs × maxAttempts` (minutes) per re-bootstrap.

## Root cause
`standalone-scripts/macro-controller/src/ui/redock-observer.ts:24,39` — `RedockState.pollTimer` field + setter exist but are never assigned. Actual polling is inside `pollUntil(...)` (lines 72–81) whose internal timer has no external cancel hook.

## Fix (no code yet)
1. Extend `pollUntil(...)` to return `{ promise, cancel }`; store `cancel` on `RedockState`.
2. `resetRedockState()` calls `cancel()` and nulls the field.
3. Delete the dead `pollTimer` accessor.
4. Vitest: start → reset within 100 ms; assert no further callback fires.

## Cross-refs
- `plan.md` PERF-4 · companion to PERF-2 / PERF-3
- `mem://standards/timer-and-observer-teardown`
