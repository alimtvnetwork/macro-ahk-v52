# 02 — Manifest V3 Foundations

## Why this step exists

Every feature later in this folder depends on assumptions about how Manifest V3
(MV3) loads code, where it can run, and what it can touch. This step pins down
the baseline so no later spec has to re-explain it.

## Contract

Any extension implementing this spec MUST:

1. Ship `manifest.json` with `"manifest_version": 3`. MV2 is rejected by the
   Chrome Web Store and out of scope.
2. Declare exactly one background entry point as a service worker (never a
   persistent background page; `background.persistent` MUST be absent;
   `background.page` MUST be absent; `background.type` MUST equal `"module"`).
3. Treat the service worker as **ephemeral**: it can be terminated at any
   time. No module-scope state survives a restart. Persist everything that
   matters (see step `18-storage-chrome-local-pointer.md` **(pending step 18)**
   and step `16-storage-sqlite-pointer.md` **(pending step 16)**).
4. Never use `eval`, `new Function`, remote `<script src>` from a CDN, or any
   form of remote code execution. MV3 forbids it via CSP and the store will
   reject the package.
5. Declare the **minimum** set of `permissions` and `host_permissions`. Every
   permission MUST appear once in the README permission table (§"Permission
   justification" below). Unjustified permissions fail the audit.
6. Use `chrome.scripting.executeScript` to inject page logic — never
   `<script>` tag injection from a content script, never `eval`. Before every
   injection, validate the target URL with `isNewTabOrBlankUrl()` from
   `src/shared/url-utils.ts` and refuse `about:blank`, `chrome://newtab/`,
   `chrome://new-tab-page/`, `chrome-search://local-ntp*`, `edge://newtab/`,
   `brave://newtab/`, `opera://startpage/`, and empty strings. Log a
   non-Code-Red skip with `Reason="UnsupportedTargetUrl"`.
7. Use the canonical MAIN ↔ ISOLATED bridge envelope (§"World model" below).
   Later specs (11, 12, 13) MAY extend but MUST NOT replace it.

## Minimum manifest skeleton (baseline only)

> This skeleton is the **minimum viable** manifest. Do NOT copy the optional
> permissions or `host_permissions` unless your feature actually needs them
> (see §"Permission model" below).

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "Short description.",
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "48": "icons/48.png", "128": "icons/128.png" }
  },
  "background": { "service_worker": "background.js", "type": "module" },
  "permissions": ["storage"],
  "icons": { "48": "icons/48.png", "128": "icons/128.png" }
}
```

`"type": "module"` lets the SW use `import` / `export`. Without it, only a
classic script is supported and dynamic `import()` is not available.

## Permission model

### Required baseline (every implementation)

| Permission | Why                                                       |
|------------|-----------------------------------------------------------|
| `storage`  | Persist settings, last error, build id, project state.    |

### Optional — add only when the feature requires it

| Permission                  | When required                                                          | README justification text                                  |
|-----------------------------|------------------------------------------------------------------------|------------------------------------------------------------|
| `scripting`                 | Programmatic injection via `chrome.scripting.executeScript`.           | "Injects the in-page SDK after the user opts in."          |
| `activeTab`                 | One-shot access to the focused tab in response to a user gesture.      | "Access the active tab when the user clicks the action."   |
| `tabs`                      | Listing/observing tabs beyond `activeTab` (e.g. URL changes).          | "Detect URL changes to refresh the status panel."          |
| `alarms`                    | Anything scheduled more than ~30 s out.                                | "Schedule periodic health checks."                         |
| `offscreen`                 | DOM APIs from the SW (audio, blob URLs, DOMParser).                    | "Render WASM-backed exports off-screen."                   |
| `host_permissions: ["https://example.com/*"]` | Narrow per-host access for a specific feature.       | "Read the workspace dashboard on example.com."             |

### Forbidden defaults

- `host_permissions: ["<all_urls>"]` and `["https://*/*"]` are example-only
  and MUST NOT be copied unless the feature genuinely needs every HTTPS
  origin. Store reviewers reject broad host access without a clear reason.
- `tabs` without a documented justification — `activeTab` is almost always
  enough.

### Permission justification (canonical README block)

Every implementation's `README.md` MUST contain exactly this section with one
row per declared permission and host pattern:

```md
## Extension permissions

| Permission | Required by         | Why it is necessary             | User-facing impact |
|------------|---------------------|----------------------------------|--------------------|
| storage    | Settings persistence | Saves local extension config    | No network access  |
```

Audit gate: `scripts/audit-mv3-output.mjs` (see §"Tests") fails if any
`permissions[]` or `host_permissions[]` value is missing from the table or if
the table contains a row not declared in the manifest.

## World model

A content script runs in one of two JavaScript worlds inside the target tab:

| World     | Sees page globals (`window.X`)? | Sees `chrome.*` APIs? | Used for                                       |
|-----------|---------------------------------|-----------------------|------------------------------------------------|
| ISOLATED  | No (mirror only)                | Yes                   | DOM reads/writes, message bus to background.   |
| MAIN      | Yes (full page scope)           | No                    | Exposing page-reachable SDKs (e.g. `window.RiseupAsiaMacroExt`), reading page-defined variables. |

Programmatic injection picks a world explicitly:

```ts
chrome.scripting.executeScript({
  target: { tabId },
  world: "MAIN",              // or "ISOLATED"
  files: ["injected/sdk.js"],
});
```

### Canonical MAIN ↔ ISOLATED bridge envelope

MAIN cannot use `chrome.*`. ISOLATED cannot expose page globals. The only
in-tab channel between them is `window.postMessage`. Every message MUST use
this envelope; later specs (11, 12, 13) extend `kind` but never replace the
envelope shape.

```ts
type JsonValue =
  | string | number | boolean | null
  | JsonValue[] | { [k: string]: JsonValue };

type BridgeEnvelope = {
  source: "riseupasia-macro-ext-main" | "riseupasia-macro-ext-isolated";
  kind: "log/write" | "sdk/event" | "relay/teardown" | "relay/ping";
  buildId: string;        // RiseupAsiaMacroExt.BUILD_ID at emit time
  nonce: string;          // crypto.randomUUID() per message
  payload: JsonValue;
};
```

Receiver rules:

- MUST verify `event.source === window` (same-frame postMessage only).
- MUST verify `event.origin === location.origin` (no cross-origin bridge).
- MUST verify `data?.source` starts with `riseupasia-macro-ext-` and the
  `buildId` equals the local `BUILD_ID` (mismatch → drop + Code Red).
- MUST drop unknown `kind` values silently (no throw — forward-compat).

Pitfalls:

- Putting `chrome.runtime.sendMessage` in a MAIN-world script silently fails.
- Putting `window.RiseupAsiaMacroExt = …` in an ISOLATED-world script leaks
  nothing to the page — the page cannot see it.

## Service worker lifecycle pitfalls

1. **No `window`, no `document`, no `localStorage`.** Anything referencing
   those at module top level crashes the worker on registration.
2. **Top-level `await` is allowed** but slows worker startup; prefer lazy
   initialization inside the relevant `chrome.*` event handler.
3. **`setTimeout` / `setInterval` are unreliable** — the worker can be
   evicted before they fire. Use `chrome.alarms` for anything scheduled more
   than ~30 s out.
4. **Listeners MUST be registered synchronously at top level** so the worker
   wakes correctly on the next event. Registering inside an async callback
   misses early events after eviction. The audit script asserts that
   `chrome.runtime.onMessage.addListener`, `chrome.tabs.onUpdated.addListener`,
   `chrome.runtime.onInstalled.addListener`, and `chrome.alarms.onAlarm.addListener`
   appear at top level in the background entry module — never inside an async
   `then` / `await` / IIFE.
5. **No DOM APIs**, including `URL.createObjectURL` for blob downloads from
   the SW — bounce through the popup or an offscreen document instead.

## Storage at-a-glance (full spec in sibling folder)

| Layer                    | Use for                                  | Survives reload? | Quota |
|--------------------------|------------------------------------------|------------------|-------|
| `chrome.storage.local`   | Small JSON config, per-tab maps          | Yes              | 10 MB |
| IndexedDB                | Large blobs, build cache                 | Yes              | ~½ disk |
| SQLite via sql.js (OPFS) | Structured logs, recorder data, metrics  | Yes              | ~½ disk |
| `localStorage`           | See narrow rule below                    | Yes              | 5 MB  |

`localStorage` MAY only store **disposable, non-auth, non-cross-context
visual UI flags** inside extension pages (e.g. "popup width preference"). It
MUST NOT store tokens, workspace IDs, project data, scripts, logs, auth
state, or anything required after reload. Auth lives behind
`getBearerToken()` per project memory; storage of structured data lives in
SQLite / IndexedDB / `chrome.storage.local` per the sibling folder.

Precise pointers into the sibling spec
(`../03-db-and-sqlite-integration-with-chrome-extension/`):

- SQLite namespace pattern → `14-per-namespace-db-pattern.md`
- SQL WASM bundling → `08-bundling-sql-wasm.md`
- IndexedDB cache (when to choose) → `21-indexeddb-when-to-choose.md`
- IndexedDB injection cache → `23-indexeddb-injection-cache.md`
- `chrome.storage.local` usage → `25-chrome-storage-local-usage.md`
- `localStorage` usage → `27-localstorage-usage.md`

## CSP defaults that bite

MV3 forces a strict default Content Security Policy on extension pages:

```
script-src 'self'; object-src 'self';
```

Consequences:

- No inline `<script>` in `popup.html` / `options.html`. Move all JS to a
  separate file.
- No `'unsafe-eval'`. Bundlers that emit `new Function` (some legacy template
  engines) will fail at runtime.
- WASM (e.g. `sql-wasm.wasm`) MUST be bundled and loaded with `fetch` against
  a `chrome-extension://` URL.

### Canonical CSP override (WASM only)

Default MV3 CSP is sufficient for everything except WebAssembly evaluation
(needed by sql.js). Add the override **only if** the implementation actually
loads WASM:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

Forbidden in any override: `'unsafe-eval'`, `'unsafe-inline'`, any
`http(s):` / `data:` / `blob:` script source. The decision to add this
override is tied to step `16-storage-sqlite-pointer.md` — pure JS extensions
MUST NOT add it.

## Common pitfalls (do not repeat)

- Declaring `<all_urls>` "just in case" — store reviewers reject this.
- Forgetting `"type": "module"` then importing ESM modules.
- Storing auth tokens in `localStorage` from the SW (it does not exist there).
- Reading `chrome.runtime.id` before the worker has bound — wrap in a guard
  helper that returns null if `chrome?.runtime?.id` is undefined.
- Using `window.fetch` in the SW — use plain `fetch`; `window` is not defined.

## Acceptance

A reviewer can answer "yes" to every line:

- [ ] `manifest.json` declares `manifest_version === 3`, a single
      `background.service_worker`, `background.type === "module"`, and has no
      `background.page` or `background.persistent` fields.
- [ ] No `eval`, no `new Function`, no remote `<script src>`, no
      `'unsafe-eval'` in CSP, no `http(s):` / `data:` / `blob:` script source
      anywhere in the shipped bundle.
- [ ] All programmatic injection uses `chrome.scripting.executeScript` with
      an explicit `world` and refuses targets where `isNewTabOrBlankUrl()`
      returns true.
- [ ] No SW module-scope code references `window`, `document`, or
      `localStorage`. All `chrome.*` listeners are registered synchronously
      at top level of the background entry module.
- [ ] `README.md` contains the canonical permission table and every entry in
      `manifest.permissions[]` / `manifest.host_permissions[]` appears in
      that table exactly once.
- [ ] The MAIN ↔ ISOLATED bridge uses the canonical envelope; receivers
      validate `event.source`, `event.origin`, `source` prefix, and
      `buildId`.
- [ ] WASM-CSP override is present **iff** sql.js / WASM is bundled.
- [ ] Boot smoke test (below) passes.

## Tests to ship with this step

- **`scripts/audit-mv3-output.mjs`** — static check.
  Scans: `dist/**/*.{js,html,json}`.
  Fails on: `eval(`, `new Function(`, `<script src="http`, `<script src="https`,
  `https://cdn.`, `'unsafe-eval'`, `'unsafe-inline'`.
  Allows: test fixtures under `scripts/__tests__/fixtures/`.
  Failure message: `"MV3 violation: <token> at <file>:<line>"`.

- **`scripts/audit-manifest.mjs`** — manifest lint.
  Asserts: `manifest_version === 3`, `background.service_worker` present,
  `background.page` / `background.persistent` absent,
  `background.type === "module"`, no duplicate background entries, every
  `permissions[]` in the allowlist (`storage`, `scripting`, `activeTab`,
  `tabs`, `alarms`, `offscreen`), every `permissions[]` /
  `host_permissions[]` row present in the README permission table.

- **`scripts/audit-sw-toplevel.mjs`** — SW-listener placement.
  Parses the background entry module with a TS AST and asserts the known
  listener registrations (`chrome.runtime.onMessage.addListener`,
  `chrome.tabs.onUpdated.addListener`, `chrome.runtime.onInstalled.addListener`,
  `chrome.alarms.onAlarm.addListener`) appear at top level — not inside
  `async`, `then`, `await`, or IIFE.

- **Boot smoke (manual Chrome E2E, see step 19)** — loads the unpacked
  extension and asserts:
  - extension ID exists (`chrome.management.getSelf().id` is non-empty);
  - popup opens without throw;
  - from the popup: `chrome.runtime.getManifest().manifest_version === 3`;
  - service-worker console shows no registration error;
  - no `Unchecked runtime.lastError` during startup.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every extension numeric (alarm intervals, debounce ms, retry counts=0, sentinel TTL, badge text limits) to a constant in `src/shared/constants.ts` or a local `*-defaults.ts` module. Inline literals are rejected by code review.
- **MUST** gate auto-injector and project-matcher with `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` — never run on `about:blank`, `chrome://newtab/`, or empty URLs (see `mem://features/new-tab-no-url-guard`).
- **MUST** route every failure through `RiseupAsiaMacroExt.Logger.error` with `Reason`+`ReasonDetail` and surface boot-time failures via `BootFailureBanner`. Bare `console.error` is rejected by `public/logger-compliance-audit.json`.
- **MUST** pair every `setInterval` / `setTimeout` / `MutationObserver` / event listener with a teardown registered on `pagehide` (see `mem://standards/timer-and-observer-teardown`). Tick UIs MUST pause on `document.hidden`.

## Pitfalls / Counter-examples

- ❌ `catch (caught) { /* ignore */ }` around `chrome.runtime.sendMessage`. ✅ `Logger.error('scope', 'send failed', caught)` and re-throw (see `public/error-swallow-audit.json`).
- ❌ Calling `chrome.scripting.executeScript` on a new-tab URL because the matcher did not gate it. ✅ Always call `isNewTabOrBlankUrl(tab.url)` first; treat true as a non-error skip.
- ❌ Storing a timestamp as `new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })`. ✅ Store `Date.now()` ms UTC; render with `Intl.DateTimeFormat().resolvedOptions().timeZone` (see `mem://localization/timezone`).
- ❌ Retrying `fetch` with `for (let i=0;i<3;i++)` and exponential backoff after a 4xx/5xx. ✅ Use `httpFetchOrThrow` / `httpFailFast` from `src/shared/http-fail-fast.ts`; one attempt, then halt (see `.lovable/checklists/http-fail-fast.md`).
- ❌ Injecting the same content-script twice because the sentinel check was skipped. ✅ Read `#marco-css-sentinel` / data-attribute sentinel before re-injection (see `09-injection-idempotency-sentinel.md`).
