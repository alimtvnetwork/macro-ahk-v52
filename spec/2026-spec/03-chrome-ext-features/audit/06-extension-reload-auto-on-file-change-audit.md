# Audit 06 — `06-extension-reload-auto-on-file-change.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/06-extension-reload-auto-on-file-change.md`
- **Auditor focus:** How blindly can an AI/LLM implement dev-only auto reload without shipping dev sockets, violating no-retry, reloading unsafe tabs, or causing loops during watch builds?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score: **67 / 100**

| Dimension | Score | Notes |
|---|---:|---|
| Clarity of contract | 18 / 25 | Dev-only intent, debounce, no retry, production strip, and tab guard are clear at concept level. |
| Determinism | 13 / 25 | The bridge loading model, manifest overlay, WebSocket lifecycle, tab reload timing, and `file-watch` trigger source are not sufficiently precise. |
| Completeness of acceptance | 14 / 20 | Good acceptance targets, but missing production-manifest audit, socket cleanup, port conflict handling, loop prevention, and exact status-message contract. |
| Cross-references | 10 / 15 | Correctly reuses step 05 and references new-tab guard. But it depends on a trigger source not defined by step 05. |
| Pitfalls | 12 / 15 | Strong dev-leak and retry warnings, but missing MV3 CSP/WebSocket permissions, multi-tab reload behavior, and watcher process teardown. |

## Gap analysis (detailed)

### G1 — `triggerSource: "file-watch"` is not accepted by step 05 (HIGH)

This spec depends on step 05 accepting:

```ts
triggerSource: "file-watch"
```

But step 05's `ReloadRequest` union does not include `"file-watch"`. A blind AI implementing both specs in order will create a type error or runtime validation failure.

**Fix:** Define `ReloadTriggerSource` in step 05 with `"file-watch"`, or let step 06 explicitly patch the step 05 union and acceptance list.

### G2 — Dev bridge as a content script creates permission and review risk (HIGH)

The spec says the dev manifest content script matches `"<all_urls>"` and includes `dev-reload-bridge.js`. Even if dev-only, this pattern can accidentally leak into production and looks like a localhost exfiltration channel. It also injects a WebSocket client into every page, which is unnecessary if reload can be coordinated from an extension page/background context.

**Fix:** Prefer a dev-only extension page or background-side connection where possible. If a content-script bridge is retained, require:

- dev-only manifest generation with a hard production audit;
- no `"<all_urls>"` in production;
- explicit CSP allowance analysis for `ws://localhost:35729` if needed;
- exact CI grep for `35729`, `WebSocket(`, `dev-reload-bridge`, and `ws://localhost` in production `dist/`.

### G3 — Production strip check is too narrow (HIGH)

Acceptance only checks that `dist/` contains no reference to `dev-reload-bridge`. A blind AI can still ship:

- `ws://localhost:35729`
- `new WebSocket(`
- `DevReload.SocketDown`
- dev manifest content script entry
- package/import references to the bridge under a different chunk name

**Fix:** Add a production audit script:

```text
scripts/audit-no-dev-reload-in-prod.mjs
Scans: dist/**/*.{js,json,html,map}
Fails on: dev-reload-bridge, DevReload., ws://localhost, 35729, new WebSocket(, triggerSource:"file-watch"
Also parses dist/manifest.json and fails if any content script includes dev reload chunks.
```

### G4 — No-retry policy conflicts with WebSocket default behavior expectations (MEDIUM)

The spec forbids reconnect attempts. That matches project memory, but it does not require cleanup after the socket closes or errors. A blind AI may leave listeners alive, duplicate connections after content-script reinjection, or log multiple times.

**Fix:** Add lifecycle rules:

- One connection attempt per bridge instance.
- `hasLoggedSocketDown` gate ensures exactly one warning.
- Remove event listeners on `pagehide`.
- Close socket on `pagehide`.
- Never schedule reconnect timers.

### G5 — Reference bridge can double-connect on repeated content-script injection (HIGH)

When content scripts are reinjected into a tab during dev, the sample `connect()` runs again with no sentinel. Multiple bridge instances can each receive `reload` and send multiple `MSG_RELOAD_EXTENSION` messages.

**Fix:** Add a dev bridge sentinel:

```ts
const KEY = "__riseupAsiaMacroExtDevReloadBridge";
if (!window[KEY]) {
  window[KEY] = { connected: true, buildId: BUILD_ID };
  connect();
}
```

In this repo, use a typed global declaration and avoid explicit `unknown` casts outside approved helper patterns.

### G6 — Watching `dist/` can trigger reload loops from generated files (MEDIUM)

Watching `dist/` after a successful rebuild is good, but the spec does not exclude files that are written by the reload pipeline itself, diagnostics exports, sourcemaps, or dev status artifacts. If any reload process writes into `dist/`, it can trigger a loop.

**Fix:** Define watch globs and ignores:

```js
watch("dist/**/*.{js,css,html,json,wasm,png,svg}", {
  ignored: ["dist/**/*.map", "dist/dev-status.json", "dist/**/*.log"],
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 25 },
});
```

### G7 — Debounce says 250 ms, acceptance says reload after ≤ 500 ms without build-time bounds (LOW)

The watcher debounces `dist/` events by 250 ms. Acceptance says edits trigger reload after ≤ 500 ms. That is only true after the bundler emits to `dist/`, not from source edit time. Large rebuilds can exceed 500 ms.

**Fix:** Clarify timing:

> After the first relevant `dist/` event, exactly one reload message is broadcast between 250 ms and 500 ms later. Source-edit-to-reload time is not bounded because rebuild duration varies.

### G8 — Tab refresh ordering around `chrome.runtime.reload()` is likely impossible as written (HIGH)

Step 06 says after reload, the bridge also signals `chrome.tabs.reload` on the active tab. The sample shows the background handler querying and reloading the tab inside the same flow. But `chrome.runtime.reload()` tears down the service worker; code after it may not run. If tab reload is attempted after extension reload, it may be skipped.

**Fix:** Define exact ordering:

1. Receive file-watch request.
2. Capture active supported tab ID before extension reload.
3. Broadcast before-reload and flush.
4. Reload extension.
5. On new service-worker startup, read pending dev tab-refresh intent from `chrome.storage.local` with short TTL.
6. Reload that tab once, then delete the intent.

This avoids relying on code running after `chrome.runtime.reload()`.

### G9 — New-tab guard is named but unsupported URLs are broader than new-tab (MEDIUM)

The spec only names `chrome://` and new-tab guards. Extension content scripts also cannot run on Chrome Web Store, extension pages, browser internal pages, `file://` unless permission is granted, and empty/discarded tabs.

**Fix:** Add a supported-tab predicate:

```ts
isInjectableHttpTabUrl(url): boolean
```

It should include the memory-mandated `isNewTabOrBlankUrl()` and reject browser/system schemes before any `chrome.tabs.reload` or content-script messaging.

### G10 — Status indicator has no message/storage contract (MEDIUM)

The popup status panel must show "Dev watcher: connected / disconnected", but there is no source of truth for that status. The bridge knows socket state inside a content script; the popup is a different context.

**Fix:** Define a shared status message contract:

```ts
MSG_DEV_RELOAD_STATUS_CHANGED
MSG_GET_DEV_RELOAD_STATUS
```

Background stores `{ connected, lastChangedAtIso, tabId, reason }` in memory or dev-only storage. The popup asks background for the current status and subscribes to changes.

### G11 — Node watcher has no port conflict or teardown behavior (LOW)

The sample starts `WebSocketServer({ port: 35729 })` but does not define behavior if the port is occupied, process receives SIGINT/SIGTERM, or chokidar errors.

**Fix:** Add fail-fast behavior:

- If port is occupied, print a Code Red formatted build/dev error and exit non-zero.
- On SIGINT/SIGTERM, close watcher and WebSocket server once.
- No retry with a new port because that would break the extension bridge contract.

### G12 — Reference watcher uses untyped JS and string messages (LOW)

The Node watcher sends bare string `"reload"`; the bridge checks `evt.data !== "reload"`. This is okay for a tiny dev tool, but it leaves no build ID, timestamp, or reason for debugging.

**Fix:** Send a small JSON envelope:

```json
{"kind":"dev/reload","buildId":"...","changedPaths":["dist/content.js"]}
```

Do not use this for retry or queueing; it is only for diagnostics and status display.

### G13 — `NODE_ENV` gating is too easy to get wrong in Vite (MEDIUM)

The sample uses `process.env.NODE_ENV !== "production"` and `define`. Vite also has `mode`, `import.meta.env.DEV`, and `import.meta.env.PROD`. A blind AI may produce a bundle where the dev bridge is included because the expression is not statically replaced.

**Fix:** Standardize gating:

- In app code, use `import.meta.env.DEV` / `import.meta.env.PROD` if Vite is the bundler.
- In Node scripts, use `process.env.NODE_ENV`.
- CI production audit is mandatory regardless of compile-time gates.

### G14 — `chrome.tabs.reload` permission requirements are not documented (LOW)

If the dev flow reloads tabs, the extension may require `tabs` or activeTab/host permissions depending on access pattern. Step 02 requires minimal permissions and README justification.

**Fix:** Add a dev-only permission note: production manifest should not gain permissions solely for dev auto-reload. Any dev-only `tabs` usage must live in the dev manifest overlay and be justified there.

## Blocker list for blind AI implementation

1. Step 06 requires `file-watch`, but step 05 does not allow that trigger source (G1).
2. Production strip audit only checks one string and can miss localhost/WebSocket leakage (G3).
3. Bridge can double-connect after reinjection because it has no idempotency sentinel (G5).
4. Tab reload after `chrome.runtime.reload()` is not reliably executable in the same worker lifetime (G8).
5. Popup watcher status has no cross-context message/storage source of truth (G10).

## Recommendation

Treat dev auto-reload as a dev-only orchestration system, not just a content-script socket. First fix the shared `ReloadTriggerSource`, add a bridge sentinel, strengthen production leakage audits, define socket lifecycle/teardown, and move post-extension-reload tab refresh into a startup intent flow. With those corrections, this spec would rise to ~86/100.

## Remaining audit items

1. 07-status-and-health-panel
2. 08-script-injection-lifecycle
3. 09-injection-idempotency-sentinel
4. 10-reinject-and-uninject
5. 11-error-logging-discipline
6. 12-namespace-logger-contract
7. 13-error-routing-and-panel
8. 14-boot-failure-banner (spec pending)
9. 15-floating-in-page-panel (spec pending)
10. 16-storage-sqlite-pointer (spec pending)
11. 17-storage-indexeddb-pointer (spec pending)
12. 18-storage-chrome-local-pointer (spec pending)
13. 19-testing-matrix (spec pending)
14. 20-acceptance-criteria (spec pending)