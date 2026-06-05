# 06 — Extension Reload (Auto on File Change, Dev Mode)

## Why this step exists

During development, the manual reload flow from step 05 is correct but too
slow — every edit otherwise requires: save → switch to `chrome://extensions`
→ click the circular arrow → switch back → reload the page. Multiply by
100 edits/day and you lose hours. This step pins a safe, dev-only
auto-reload pipeline that **reuses** step 05's primitive and trigger union.

## Scope and boundaries

This step adds the dev-only watcher and bridge. It does NOT redefine the
reload message, trigger union, broadcast logic, flush window, failure
schema, or retry policy — those live in step 05. This step extends step 05
only through:

1. The shared `"file-watch"` trigger source (already in step 05's
   `RELOAD_TRIGGER_SOURCES`).
2. A dev-only "post-reload tab refresh intent" stored in
   `chrome.storage.local` and consumed on the next SW startup.
3. A dev-only watcher status message contract for the Status panel.

## Contract

1. **Dev-only**. The watcher is part of `npm run dev` / `npm run watch`. It
   MUST NOT ship in `dist/` and MUST NOT be referenced from the production
   manifest. CI rejects any production build that includes it.
2. **One bridge file**. The bundler emits a single `dev-reload-bridge.js`
   content script (loaded only when `import.meta.env.DEV`) that subscribes
   to a localhost WebSocket and forwards `MSG_RELOAD_EXTENSION` to the
   background.
3. **Idempotency sentinel**. The bridge installs at most one connection
   per page via a typed `window` sentinel (see §Bridge idempotency).
4. **Debounce 250 ms / reload latency 250–500 ms after first `dist/` event**.
   Multiple file changes inside the window collapse to one reload. Source-
   edit-to-reload time is unbounded because rebuild duration varies.
5. **No retry on socket failure**. If the WS dies (Node watcher stopped),
   the bridge logs once and goes quiet. Reconnect attempts are forbidden
   (`mem://constraints/no-retry-policy`). Restart `npm run dev` instead.
6. **Reuses step 05**. The bridge sends `MSG_RELOAD_EXTENSION` with
   `triggerSource: "file-watch"` (imported from
   `src/shared/messages.ts` — no duplicate literal). All broadcast / flush
   / failure / Code-Red logic from step 05 applies unchanged.
7. **Post-reload tab refresh via startup intent**. The SW does NOT call
   `chrome.tabs.reload()` after `chrome.runtime.reload()` (code after
   reload is not guaranteed to run). Instead it writes a short-TTL intent
   to `chrome.storage.local`, consumed by the next SW startup.
8. **Status visible**. The popup status panel (step 07 *(pending)*) shows
   "Dev watcher: connected / disconnected" via a defined status message
   contract.

## Bundler / environment gating

Use Vite-native gating, not `process.env.NODE_ENV`, in app code:

```ts
// src/content/dev-reload-bridge.ts — tree-shaken in prod
if (import.meta.env.DEV) { connect(); }
```

```ts
// vite.config.ts (excerpt)
export default defineConfig(({ mode }) => {
  const isDev = mode !== "production";
  return {
    build: {
      rollupOptions: {
        input: {
          background: "src/background/index.ts",
          content:    "src/content/index.ts",
          popup:      "src/popup/popup.tsx",
          ...(isDev && { devReloadBridge: "src/content/dev-reload-bridge.ts" }),
        },
      },
    },
  };
});
```

In Node scripts (`scripts/dev-watch-reload.mjs`), `process.env.NODE_ENV`
is acceptable. The CI production audit (§Production audit) is mandatory
**regardless** of compile-time gating — gates have failed before.

## Manifest overlay (dev only)

Production manifest MUST NOT contain `dev-reload-bridge.js` or `<all_urls>`
content scripts added for dev. A `manifest.dev.json` overlay is merged into
the base manifest **only** when `mode !== "production"`:

```json
// manifest.dev.json
{
  "content_scripts": [{
    "matches": ["http://*/*", "https://*/*"],
    "js": ["content.js", "dev-reload-bridge.js"],
    "run_at": "document_idle"
  }]
}
```

`<all_urls>` is avoided even in dev to keep the match list reviewable.
Dev-only `tabs` permission, if needed, lives in the overlay only and is
justified in `README.dev.md`.

## Reference Node watcher

```js
// scripts/dev-watch-reload.mjs
import chokidar from "chokidar";
import { WebSocketServer } from "ws";
import { readFileSync } from "node:fs";

const PORT  = 35729;          // classic LiveReload port
const DEBOUNCE_MS = 250;

let wss;
try {
  wss = new WebSocketServer({ port: PORT });
} catch (err) {
  console.error(`[dev-watch-reload] CODE RED: port ${PORT} unavailable: ${err.message}`);
  process.exit(1);            // fail-fast; no port rotation (would break bridge)
}
console.log(`[dev-watch-reload] ws://localhost:${PORT}`);

const buildId = JSON.parse(readFileSync("dist/manifest.json", "utf8")).version_name ?? "dev";
let timer = null;
const pending = new Set();

const broadcast = () => {
  const payload = JSON.stringify({
    kind: "dev/reload", buildId, changedPaths: [...pending],
  });
  pending.clear();
  for (const client of wss.clients) {
    if (client.readyState === 1) { client.send(payload); }
  }
};

const schedule = (p) => {
  pending.add(p);
  if (timer) { clearTimeout(timer); }
  timer = setTimeout(() => { broadcast(); timer = null; }, DEBOUNCE_MS);
};

const watcher = chokidar.watch("dist/**/*.{js,css,html,json,wasm,png,svg}", {
  ignored: ["dist/**/*.map", "dist/dev-status.json", "dist/**/*.log"],
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 25 },
});
watcher.on("add", schedule).on("change", schedule).on("unlink", schedule);

const shutdown = () => {
  watcher.close(); wss.close();
  process.exit(0);
};
process.once("SIGINT",  shutdown);
process.once("SIGTERM", shutdown);
```

Watching `dist/` (the bundler's output) — not `src/` — ensures we reload
only after a successful rebuild. `.map`, `dev-status.json`, and `.log`
files are excluded to prevent reload loops.

## Bridge idempotency

Content scripts can be re-injected during dev; without a sentinel the
bridge would multi-connect and trigger N reload messages per event.

```ts
// src/content/dev-reload-bridge.ts — excluded from production
import { MSG_RELOAD_EXTENSION, type ReloadTriggerSource } from "@shared/messages";
import { BUILD_ID } from "@shared/constants";
import { Logger } from "@shared/logger";
import { sendRuntimeMessageSafe } from "@platform/messaging";

declare global {
  interface Window {
    __riseupAsiaMacroExtDevReloadBridge?: { connected: true; buildId: string };
  }
}

const PORT = 35729;
const KEY = "__riseupAsiaMacroExtDevReloadBridge" as const;

function connect(): void {
  if (window[KEY]?.connected) { return; }       // sentinel — single instance
  window[KEY] = { connected: true, buildId: BUILD_ID };

  const ws = new WebSocket(`ws://localhost:${PORT}`);
  let loggedDown = false;

  const onMessage = (evt: MessageEvent) => {
    let payload: unknown;
    try { payload = JSON.parse(typeof evt.data === "string" ? evt.data : ""); }
    catch { return; }
    const p = payload as { kind?: string; buildId?: string } | null;
    if (p?.kind !== "dev/reload") { return; }

    const triggerSource: ReloadTriggerSource = "file-watch";   // type-checked via union
    void sendRuntimeMessageSafe({
      kind: MSG_RELOAD_EXTENSION, triggerSource, buildId: BUILD_ID,
    });
  };
  const onErrorOrClose = (event: Event) => {
    if (loggedDown) { return; }                  // exactly one warning
    loggedDown = true;
    Logger.warn("DevReload.SocketDown", {
      Path: "src/content/dev-reload-bridge.ts",
      Missing: "live websocket on :35729",
      Reason: "WatcherDown",
      ReasonDetail: `Node watcher not running; restart \`npm run dev\`. event=${event.type}`,
      SelectorAttempts: null,
      VariableContext: null,
    });
    cleanup();
  };
  const cleanup = () => {
    ws.removeEventListener("message", onMessage);
    ws.removeEventListener("error", onErrorOrClose);
    ws.removeEventListener("close", onErrorOrClose);
    try { ws.close(); } catch { /* noop */ }
  };

  ws.addEventListener("message", onMessage);
  ws.addEventListener("error", onErrorOrClose);
  ws.addEventListener("close", onErrorOrClose);
  window.addEventListener("pagehide", cleanup, { once: true });
}

if (import.meta.env.DEV) { connect(); }
```

This satisfies `mem://standards/timer-and-observer-teardown` (paired
teardown + `pagehide`) and `mem://standards/unknown-usage-policy` (no
explicit `unknown` cast outside the parser scope).

## Post-reload tab refresh (startup intent)

Inside the background `Reload.Requested` orchestrator from step 05, when
`triggerSource === "file-watch"`, capture intent **before** calling
`chrome.runtime.reload()`:

```ts
// src/background/dev-tab-refresh-intent.ts (dev only)
const KEY = "dev/postReloadTabRefresh";
const TTL_MS = 5_000;

export async function recordPostReloadTabRefreshIntent(): Promise<void> {
  if (!import.meta.env.DEV) { return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !isInjectableHttpTabUrl(tab.url)) { return; }
  await chrome.storage.local.set({
    [KEY]: { tabId: tab.id, atMs: Date.now() },
  });
}

export async function consumePostReloadTabRefreshIntent(): Promise<void> {
  if (!import.meta.env.DEV) { return; }
  const stored = (await chrome.storage.local.get(KEY))[KEY] as
    { tabId: number; atMs: number } | undefined;
  await chrome.storage.local.remove(KEY);                     // consume exactly once
  if (!stored) { return; }
  if (Date.now() - stored.atMs > TTL_MS) { return; }          // expired
  try { await chrome.tabs.reload(stored.tabId); }
  catch (caught) { Logger.warn("DevReload.TabRefreshSkipped", { Reason: "TabGone", ReasonDetail: String(caught) }); }
}
```

`consumePostReloadTabRefreshIntent()` is called once from the SW boot path
(step 02). The `isInjectableHttpTabUrl` predicate is the same one from
step 05, wrapping `isNewTabOrBlankUrl()`
(`mem://features/new-tab-no-url-guard`).

## Dev watcher status contract (consumed by step 07)

```ts
// src/shared/messages.ts
export const MSG_DEV_RELOAD_STATUS_CHANGED = "dev-reload/status-changed" as const;
export const MSG_GET_DEV_RELOAD_STATUS     = "dev-reload/status-get"     as const;

export interface DevReloadStatus {
  connected: boolean;
  lastChangedAtIso: string;
  tabId: number | null;
  reason: "Connected" | "WatcherDown" | "Unknown";
}
```

The bridge reports its socket state to the background via
`sendRuntimeMessageSafe(MSG_DEV_RELOAD_STATUS_CHANGED, …)`. The
background keeps the latest `DevReloadStatus` in memory (and dev-only
`chrome.storage.local["dev/reload-status"]`) and serves it via
`MSG_GET_DEV_RELOAD_STATUS`. The popup status panel subscribes to changes.

## Production audit (mandatory)

```text
scripts/audit-no-dev-reload-in-prod.mjs
  Inputs:  dist/**/*.{js,json,html,map,wasm}
  Fails on (substring or AST):
    - "dev-reload-bridge"
    - "DevReload."
    - "ws://localhost"
    - "35729"
    - "new WebSocket("
    - "import.meta.env.DEV" left as a live ternary, not stripped
    - any content_scripts entry referencing devReloadBridge in dist/manifest.json
    - matches:["<all_urls>"] in dist/manifest.json content_scripts
  Also parses dist/manifest.json and fails if any content script lists a
  dev-only chunk or grants tabs/host permissions justified by README as
  "dev only".
```

CI runs this on every production build; failure blocks release.

## Pitfalls

- **Watching `src/` instead of `dist/`** — fires reload before the bundler
  emits the new bundle.
- **Reconnecting the WebSocket on error** — forbidden. The status
  indicator going red is the dev's signal.
- **No bridge sentinel** → multi-connect on content-script reinjection →
  N reload messages per event.
- **Reloading the tab inline after `chrome.runtime.reload()`** — code
  after `reload()` is not guaranteed to run. Use the startup-intent flow.
- **`process.env.NODE_ENV` in app code under Vite** — may not be statically
  replaced. Use `import.meta.env.DEV`.
- **`<all_urls>` content script in production manifest** — looks like a
  data-exfil channel; will be flagged in review.
- **`chrome.tabs.reload` on `chrome://newtab/`, Web Store, extension
  pages, `file://`, `about:blank`** — must be filtered by
  `isInjectableHttpTabUrl()`.
- **Port 35729 occupied** — fail-fast with a Code-Red-shaped log. No
  port rotation (would break the bridge contract).
- **No `pagehide` teardown** — leaks listeners on SPA navigation.

## Acceptance

- [ ] `npm run dev` starts the Node watcher and the bundler in watch mode.
- [ ] First `dist/` event after an edit produces exactly one
      `MSG_RELOAD_EXTENSION{ triggerSource:"file-watch" }` between 250 ms
      and 500 ms later.
- [ ] `npm run build` (production) produces a `dist/` that passes
      `scripts/audit-no-dev-reload-in-prod.mjs`.
- [ ] Bridge logs `DevReload.SocketDown` exactly once with the full
      mandatory failure schema when the watcher dies, then stays quiet.
- [ ] Bridge sentinel `window.__riseupAsiaMacroExtDevReloadBridge`
      prevents a second connection on content-script reinjection.
- [ ] After `chrome.runtime.reload()`, the next SW boot consumes a
      `dev/postReloadTabRefresh` intent (TTL ≤ 5 s) and reloads the
      captured tab once, then deletes the intent.
- [ ] Tab refresh skips any URL where `isInjectableHttpTabUrl()` is false
      (covers `chrome://newtab/`, `about:blank`, `chrome://`, `file://`,
      Web Store).
- [ ] Popup status panel (step 07) shows "Dev watcher: connected" using
      `MSG_GET_DEV_RELOAD_STATUS` / `MSG_DEV_RELOAD_STATUS_CHANGED`.
- [ ] Production manifest never contains `dev-reload-bridge.js` or a
      dev-only `<all_urls>` content_scripts entry.
- [ ] Production manifest does not gain `tabs` or extra host permissions
      solely for auto-reload.

## Tests to ship with this step

- `scripts/__tests__/dev-watch-debounce.test.mjs` — drives chokidar with
  fake events, asserts a 5-event burst collapses to one broadcast and
  the payload includes `kind:"dev/reload"`, `buildId`, `changedPaths`.
- `scripts/__tests__/no-dev-bridge-in-prod.test.mjs` — runs a production
  build and invokes the audit script; fails on any forbidden token.
- `scripts/__tests__/dev-watch-port-conflict.test.mjs` — pre-binds port
  35729, asserts watcher exits non-zero with CODE RED log.
- Unit `dev-reload-bridge.test.ts` — sentinel prevents a second
  `WebSocket` creation; `error`/`close` logs exactly once and cleans up
  listeners; `pagehide` closes the socket.
- Unit `dev-tab-refresh-intent.test.ts` — record/consume happy path,
  expiry past TTL, missing tab handled silently, `isInjectableHttpTabUrl`
  rejects `chrome://newtab/`, `about:blank`, Web Store, `file://`.
- Manual E2E: kill the watcher mid-session, edit a file, confirm the
  bridge logs once and the popup status flips to "disconnected"; restart
  watcher, edit again, confirm reload + tab refresh fire exactly once.
