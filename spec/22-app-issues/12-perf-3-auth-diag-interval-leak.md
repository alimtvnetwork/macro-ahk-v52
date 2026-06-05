# PERF-3 — Auth-diag 10 s interval stacks on section re-mount

**Severity:** 🟠 HIGH · **Filed:** 2026-06-03 () · **Owner:** macro-controller UI

## Symptom
Each diagnostics-section mount adds another `setInterval(refresh, 10_000)`. The in-callback visibility guard prevents work but does NOT stop the timer or release closure-held DOM refs → memory leak across re-mounts.

## Root cause
`standalone-scripts/macro-controller/src/ui/section-auth-diag.ts:179` — `buildAuthDiagSection()` has no return-side teardown contract; interval ID discarded.

## Fix (no code yet)
1. Use the shared `PanelTeardownRegistry` proposed in PERF-2.
2. Convert the inner visibility check into an actual `visibilitychange` pause/resume (no work while hidden = no timer wakes).
3. Vitest: mount/unmount the section 5×; assert one timer survives, zero after `destroyPanel()`.

## Cross-refs
- `plan.md` PERF-3 · sibling of PERF-2 / PERF-4
- `mem://standards/timer-and-observer-teardown`
