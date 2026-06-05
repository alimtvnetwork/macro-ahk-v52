# PERF-7 — `usePopupData` 30 s poll fans out 4 messages even when hidden

**Severity:** 🟡 MEDIUM · **Filed:** 2026-06-03 () · **Owner:** popup hooks

## Symptom
Detached-popup window kept open in a background monitor fires `GET_STATUS`, `GET_HEALTH_STATUS`, `GET_ACTIVE_PROJECT`, `GET_ACTIVE_ERRORS` every 30 s with no `document.hidden` gate.

## Root cause
`src/popup/hooks/usePopupData.ts:123` predates the `useVisibilityPausedInterval` pattern already adopted by `DiagnosticsPanel.tsx:103`, `use-network-data.ts`, `use-error-count.ts`.

## Fix (no code yet)
1. Replace the bare `setInterval` with `useVisibilityPausedInterval` (existing hook).
2. On `visibilitychange` → visible, fire one immediate refresh (parity with DiagnosticsPanel).
3. Vitest: simulate `document.hidden=true`; advance 90 s; assert zero messages.

## Cross-refs
- `plan.md` PERF-7
- `mem://standards/timer-and-observer-teardown`
