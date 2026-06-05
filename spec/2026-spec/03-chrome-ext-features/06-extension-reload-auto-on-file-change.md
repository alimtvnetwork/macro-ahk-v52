# 06 — Extension Reload (Auto on File Change, Dev Mode)

## Why this step exists

During development, the manual reload flow from step 05 is correct but too
slow — every edit to a content script, SW handler, or popup component
otherwise requires: save → switch to `chrome://extensions` → click the
circular arrow → switch back → reload the page. Multiply by 100 edits/day
and you lose hours. This step pins a safe, dev-only auto-reload pipeline that
reuses step 05's primitive.

## Contract

1. **Dev-only**. The watcher is part of `npm run dev` / `npm run watch`. It
   MUST NOT ship in `dist/` and MUST NOT be referenced from the production
   manifest. CI rejects any commit that bundles the watcher.
2. **One bridge file**. The bundler emits a single `dev-reload-bridge.js`
   content script (loaded only when `NODE_ENV !== "production"`) that
   subscribes to a localhost WebSocket and forwards a `MSG_RELOAD_EXTENSION`
   to the background.
3. **Debounce**. The Node watcher (`scripts/dev-watch-reload.mjs`) debounces
   file events by 250 ms to avoid mid-write reloads.
4. **Single reload per debounce window**. Multiple file changes inside the
   window collapse to one reload. No queuing.
5. **No retry on socket failure**. If the WS dies (Node watcher stopped),
   the bridge logs once and goes quiet. Reconnect attempts are forbidden —
   restart `npm run dev` instead.
6. **Reuses step 05**. The bridge sends the same `MSG_RELOAD_EXTENSION` with
   `triggerSource: "file-watch"`. All broadcast / flush / Code-Red logic
   from step 05 applies unchanged.
7. **After reload, tab refresh**. The bridge also signals `chrome.tabs.reload`
   on the active tab so content-script changes take effect without a manual
   F5. Gated to non-`chrome://` / non-new-tab URLs (see `mem://features/new-tab-no-url-guard`).
8. **Status visible**. The popup status panel (step 07) shows a small
   "Dev watcher: connected / disconnected" indicator so the developer
   knows whether auto-reload is alive.

## Reference Node watcher

```js
// scripts/dev-watch-reload.mjs
import chokidar from "chokidar";
import { WebSocketServer } from "ws";

const PORT  = 35729;          // classic LiveReload port
const DEBOUNCE_MS = 250;

const wss = new WebSocketServer({ port: PORT });
console.log(`[dev-watch-reload] ws://localhost:${PORT}`);

let timer = null;
const broadcast = () => {
  for (const client of wss.clients) {
    if (client.readyState === 1) { client.send("reload"); }
  }
};

const schedule = (path) => {
  if (timer) { clearTimeout(timer); }
  timer = setTimeout(() => {
    console.log("[dev-watch-reload] broadcasting reload");
    broadcast();
    timer = null;
  }, DEBOUNCE_MS);
};

chokidar
  .watch("dist/", { ignoreInitial: true })
  .on("add",    schedule)
  .on("change", schedule)
  .on("unlink", schedule);
```

`chokidar` is a devDependency only. Watching `dist/` (the bundler's output)
not `src/` ensures we reload only after a successful rebuild.

## Reference bridge (content script, dev only)

```ts
// src/content/dev-reload-bridge.ts  — excluded from production bundle
import { MSG_RELOAD_EXTENSION } from "@shared/messages";
import { Logger } from "@shared/logger";

const PORT = 35729;

function connect(): void {
  const ws = new WebSocket(`ws://localhost:${PORT}`);

  ws.addEventListener("message", (evt) => {
    if (evt.data !== "reload") { return; }
    void chrome.runtime.sendMessage({
      kind: MSG_RELOAD_EXTENSION,
      triggerSource: "file-watch",
    });
  });

  ws.addEventListener("error", () => {
    Logger.warn("DevReload.SocketDown", {
      path: "src/content/dev-reload-bridge.ts",
      missing: "live websocket on :35729",
      reason: "Node watcher not running; auto-reload disabled until `npm run dev` restarts",
    });
    // NO RECONNECT — see no-retry-policy.
  });
}

if (process.env.NODE_ENV !== "production") {
  connect();
}
```

The bundler MUST tree-shake this file when `NODE_ENV === "production"`. Add a
CI grep that fails the release build if the string
`"dev-reload-bridge"` appears anywhere inside `dist/`.

## Bundler wiring (Vite example)

```ts
// vite.config.ts (excerpt)
const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV) },
  build: {
    rollupOptions: {
      input: {
        background: "src/background/index.ts",
        content:    "src/content/index.ts",
        ...(isDev && { devReloadBridge: "src/content/dev-reload-bridge.ts" }),
        popup:      "src/popup/popup.tsx",
      },
    },
  },
});
```

Manifest content_scripts entry (dev manifest only):

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js", "dev-reload-bridge.js"],
    "run_at": "document_idle"
  }]
}
```

Generate the dev manifest from a separate `manifest.dev.json` overlay so
production never gains the dev script. Pre-build script merges base manifest
+ overlay only when `NODE_ENV !== "production"`.

## Tab refresh after reload

The background handler (step 05) extends its post-reload behavior in dev
builds:

```ts
if (request.triggerSource === "file-watch") {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url && !isNewTabOrBlankUrl(tab.url)) {
    await chrome.tabs.reload(tab.id);
  }
}
```

The `isNewTabOrBlankUrl()` guard is mandatory — see `mem://features/new-tab-no-url-guard`.

## Pitfalls

- **Watching `src/` instead of `dist/`** — fires the reload before the
  bundler has emitted the new bundle, producing inconsistent state.
- **Re-connecting the WebSocket on error** — forbidden by no-retry-policy.
  The developer's signal "auto-reload is dead" is the status indicator
  going red.
- **Forgetting the production strip** — leaking the dev bridge into the
  zipped store artifact will be rejected by reviewers (looks like a
  data-exfil channel).
- **Reloading on every keystroke** — without the 250 ms debounce, a single
  save event from VSCode fires `add` + `change` and would double-reload.
- **Reloading `chrome://newtab/`** — blank/new-tab guards must skip the
  `chrome.tabs.reload` step.

## Acceptance

- [ ] `npm run dev` starts the Node watcher and the bundler in watch mode.
- [ ] Editing a content-script source file triggers exactly one extension
      reload after ≤ 500 ms.
- [ ] `dist/` produced by `npm run build` (NODE_ENV=production) contains no
      reference to `dev-reload-bridge`.
- [ ] The bridge logs `DevReload.SocketDown` exactly once when the watcher
      is killed, then stays quiet.
- [ ] Auto-reload on a `chrome://newtab/` tab does NOT call
      `chrome.tabs.reload`.
- [ ] Popup status panel shows "Dev watcher: connected" when the WS is up.

## Tests to ship with this step

- `scripts/__tests__/dev-watch-debounce.test.mjs` — drives chokidar with
  fake events, asserts a 5-event burst collapses to one broadcast.
- `scripts/__tests__/no-dev-bridge-in-prod.test.mjs` — runs a production
  build and greps `dist/` for `dev-reload-bridge` (must fail if found).
- Manual E2E: kill the watcher mid-session, edit a file, confirm the
  bridge logs once and the popup status flips to "disconnected".
