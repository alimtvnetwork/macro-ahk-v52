# PERF-2 — Error-badge interval leaks on every panel re-bootstrap

**Severity:** 🟠 HIGH · **Filed:** 2026-06-03 () · **Owner:** macro-controller UI

## Symptom
After N SPA navigations / redocks / theme swaps, N concurrent 5 s intervals each write to the same `#error-badge` DOM node. Stacked closures hold orphaned panel refs → memory leak.

## Root cause
`standalone-scripts/macro-controller/src/ui/panel-controls.ts:393` — `buildErrorBadge()` calls `setInterval(refresh, 5000)` and returns the `<button>` only. The timer ID is dropped on the floor; there is no teardown contract tied to panel lifecycle.

## Fix (no code yet)
1. Introduce a shared `PanelTeardownRegistry` in `standalone-scripts/macro-controller/src/ui/panel-lifecycle.ts` — builders register `() => clearInterval(id)` callbacks; `destroyPanel()` flushes them.
2. Refactor `buildErrorBadge()` to register its interval handle.
3. Add `pagehide` + `visibilitychange` (pause while hidden) per `mem://standards/timer-and-observer-teardown`.
4. Vitest: re-bootstrap the panel 5× and assert only 1 active interval (mock `setInterval`).

## Cross-refs
- `plan.md` PERF-2 / PERF-3 / PERF-4 (shared registry covers all three)
- `mem://standards/timer-and-observer-teardown`
