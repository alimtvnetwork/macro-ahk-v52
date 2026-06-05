# PERF-1 — Hot-reload polls `build-meta.json` every 1 s in PRODUCTION

**Severity:** 🔴 CRITICAL · **Filed:** 2026-06-03 () · **Owner:** background SW

## Symptom
Service worker never reaches idle suspension; battery drain on laptops; one `fetch()`+`JSON.parse()` every second per browser session.

## Root cause
1. `vite.config.extension.ts:516` wires `generateBuildMeta()` unconditionally inside `defineConfig(({ mode }) => …)`. `isDev` is computed but never gates the plugin — so production ZIPs ship `dist/build-meta.json`.
2. `src/background/hot-reload.ts:34` sees the file present at SW boot (`service-worker-main.ts:131` → `startHotReload()`) and arms `setInterval(…, 1000)`. The handle is discarded; no `clearInterval`; no stop API.

## Fix (no code yet — RCA only)
1. Gate `generateBuildMeta()` behind `isDev` in `vite.config.extension.ts`.
2. In `hot-reload.ts`, guard with `chrome.runtime.getManifest().version_name?.includes('dev')` (defense in depth).
3. Capture the interval ID, export `stopHotReload()`, and call it from a `chrome.runtime.onSuspend` listener.
4. Add `scripts/check-no-build-meta-in-release.mjs` CI gate.

## Verification plan
- Build a release ZIP; assert `dist/build-meta.json` absent.
- Unit-test `startHotReload()` in non-dev returns early.
- E2E: load packed extension, observe SW transitions to inactive within 30 s.

## Cross-refs
- `plan.md` "Performance Audit → PERF-1"
- `mem://standards/timer-and-observer-teardown`
