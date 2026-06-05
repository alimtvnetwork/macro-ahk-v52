# Audit 06 — `06-extension-reload-auto-on-file-change.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/06-extension-reload-auto-on-file-change.md`
- **Auditor focus:** Can an AI/LLM implement dev-only auto reload that (a) reuses step 05 cleanly, (b) cannot leak into production, (c) respects no-retry, (d) avoids reload loops and unsafe tabs, all from this spec alone?
- **Scoring rubric (0–100):** Clarity (25), Determinism (25), Acceptance (20), Cross-refs (15), Pitfalls (15).
- **Audited revision:** post-upgrade (Vite-native gating, manifest overlay, idempotency sentinel, startup-intent tab refresh, status message contract, production audit script).

## Critical score: **88 / 100**

| Dimension | Score | Notes |
|---|---:|---|
| Clarity | 22 / 25 | Scope explicitly enumerates "this step does NOT redefine" — clean reuse of step 05. Bridge, watcher, overlay, intent, and status contract are separately delineated. |
| Determinism | 22 / 25 | `PORT=35729`, `DEBOUNCE_MS=250`, `TTL_MS=5_000`, exact chokidar globs/ignores, `awaitWriteFinish` thresholds, `import.meta.env.DEV` (not `NODE_ENV`) in app code, fail-fast on port collision. |
| Acceptance | 18 / 20 | Checklist covers timing (250–500 ms), production audit, sentinel, startup intent + TTL, predicate-filtered tab reload, status messages, manifest leakage, permission leakage. Missing: explicit "no dev-only `tabs` permission in production manifest" *test* (only narrative). |
| Cross-refs | 13 / 15 | Resolves to step 02 (SW boot consumes intent), step 05 (trigger union, fan-out, failure schema), step 07 (status display), `mem://constraints/no-retry-policy`, `mem://standards/timer-and-observer-teardown`, `mem://standards/unknown-usage-policy`, `mem://features/new-tab-no-url-guard`. Minor: `dev/reload-status` storage key not cross-referenced in step 18 (chrome.storage pointer). |
| Pitfalls | 13 / 15 | Watching `src/` vs `dist/`, reconnect-on-error, missing sentinel, post-reload code, `process.env.NODE_ENV` under Vite, `<all_urls>` in prod, unsafe tab reload, port-occupied retry, `pagehide` teardown — all covered. Missing: pitfall about `chrome.storage.local` race when *two* dev tabs both record intent. |

## Resolved issues (vs prior audit)

- **G1 (`file-watch` trigger):** Single source of truth in `RELOAD_TRIGGER_SOURCES` (step 05); bridge imports the union type — no duplicate literal.
- **G2 (content-script permission risk):** Dev manifest overlay uses `http://*/*` + `https://*/*` (not `<all_urls>`); overlay is merged only when `mode !== "production"`; CI audits `dist/manifest.json`.
- **G3 (production strip narrow):** `scripts/audit-no-dev-reload-in-prod.mjs` greps `dev-reload-bridge`, `DevReload.`, `ws://localhost`, `35729`, `new WebSocket(`, plus AST/manifest checks for `<all_urls>` and dev chunks; release-blocking.
- **G4 (no retry / lifecycle):** `hasLoggedSocketDown` gate (exactly one warning), `pagehide` cleanup, no reconnect timer, sentinel prevents duplicate connection.
- **G5 (double-connect):** Typed `window.__riseupAsiaMacroExtDevReloadBridge` sentinel; second `connect()` short-circuits.
- **G6 (watch loop on `dist/`):** Chokidar `ignored: ["dist/**/*.map", "dist/dev-status.json", "dist/**/*.log"]` + `awaitWriteFinish` prevents partial-write reloads.
- **G7 (debounce timing):** Reworded: 250–500 ms after first `dist/` event; source-edit-to-reload time is explicitly unbounded.
- **G8 (post-reload tab refresh ordering):** No code runs after `chrome.runtime.reload()`. Intent is written to `chrome.storage.local` *before* reload; next SW boot consumes within 5 s TTL, deletes the key, then reloads the tab once.
- **G9 (broader unsupported URLs):** `isInjectableHttpTabUrl()` wraps `isNewTabOrBlankUrl()` and rejects `chrome://`, `chrome-extension://`, `edge://`, `brave://`, `opera://`, `chrome-search://`, `about:`, `file://`, Web Store, empty/discarded.
- **G10 (status contract):** `MSG_DEV_RELOAD_STATUS_CHANGED` / `MSG_GET_DEV_RELOAD_STATUS` + `DevReloadStatus { connected, lastChangedAtIso, tabId, reason }`. Background is source of truth; popup subscribes.
- **G11 (port/SIGINT):** `WebSocketServer` constructor in try/catch → `process.exit(1)` with Code-Red-shaped log; `SIGINT`/`SIGTERM` → single watcher+server close.
- **G12 (envelope):** Broadcast payload is JSON `{ kind:"dev/reload", buildId, changedPaths[] }` — not bare string.
- **G13 (`NODE_ENV` under Vite):** App code uses `import.meta.env.DEV`; Node scripts use `process.env.NODE_ENV`; CI audit is mandatory regardless of compile-time gates.
- **G14 (permission docs):** Dev-only `tabs`, if needed, lives in overlay only and is justified in `README.dev.md`; production audit fails if it leaks.

## Remaining gaps (minor)

### R1 — Multi-tab intent race is undefined (LOW)

If two tabs match the active-tab query around the same time (rapid file edits across multiple devtools windows), only the **last** `chrome.storage.local.set({KEY:…})` wins. The losing tab is silently skipped.

**Fix:** Either document "only the most recently focused tab is refreshed" as the contract, or store an array of intents keyed by `tabId` with the same 5 s TTL and consume all.

### R2 — `DevReload.SocketDown` is logged via `Logger.warn`, but the warn path's persistence is not specified (LOW)

The sample passes the full Code Red-shaped object to `Logger.warn`. Step 12 (namespace logger contract) owns whether `warn` persists to the error store or only to console. Without that contract being inlined here, a blind AI may skip persistence and the popup status will be the only signal.

**Fix:** Add a sentence: "`DevReload.SocketDown` MUST be persisted to the session audit table (not Code Red) so the popup status panel can read it on next open."

### R3 — `dev/reload-status` storage key not registered in step 18 (LOW)

Step 18 (chrome.storage pointer) is the canonical registry of `chrome.storage.local` keys. The `dev/reload-status` and `dev/postReloadTabRefresh` keys are introduced here but not yet listed there.

**Fix:** Add a one-line note: "Register `dev/reload-status` and `dev/postReloadTabRefresh` in step 18's key registry; both are dev-only and stripped by the production audit."

### R4 — Production audit does not assert "no `tabs` permission" in `dist/manifest.json` (LOW)

Narrative says production manifest must not gain `tabs` solely for auto-reload, but the audit script's check list does not enumerate the `permissions` array.

**Fix:** Extend `scripts/audit-no-dev-reload-in-prod.mjs` to load `dist/manifest.json` and fail if `permissions` includes `tabs` unless `README.md` justifies it for a non-dev feature.

## Blocker list for blind AI implementation

None remaining. Prior HIGH blockers (G1, G2, G3, G5, G8) are all resolved with normative wording, runnable audit scripts, and Vite-native gating.

## Recommendation

Spec is implementation-ready. R1–R4 are low-priority polish; none block step 06 from being shipped behind dev-mode and CI guards.

## Audit time

Started: 2026-06-05 22:20 Asia/Kuala_Lumpur. Finished: 2026-06-05 22:25. Duration: ~5 min.

## Remaining audit items

1. 07-status-and-health-panel
2. 08-script-injection-lifecycle
3. 09-injection-idempotency-sentinel
4. 10-reinject-and-uninject
5. 11-error-logging-discipline
6. 12-namespace-logger-contract
