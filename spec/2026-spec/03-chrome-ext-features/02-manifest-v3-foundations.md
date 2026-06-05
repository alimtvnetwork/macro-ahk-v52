# 02 — Manifest V3 Foundations

## Why this step exists

Every feature later in this folder depends on assumptions about how Manifest V3
(MV3) loads code, where it can run, and what it can touch. This step pins down
the baseline so no later spec has to re-explain it.

## Contract

Any extension implementing this spec MUST:

1. Ship `manifest.json` with `"manifest_version": 3`. MV2 is rejected by the
   Chrome Web Store and out of scope.
2. Declare exactly one background entry point as a service worker — never a
   persistent background page.
3. Treat the service worker as **ephemeral**: it can be terminated at any
   time. No module-scope state survives a restart. Persist everything that
   matters (see step `18-chrome-storage-local-usage.md` and
   `16-sqlite-integration.md`).
4. Never use `eval`, `new Function`, remote `<script src>` from a CDN, or any
   form of remote code execution. MV3 forbids it via CSP and the store will
   reject the package.
5. Declare the minimum set of `permissions` and `host_permissions` needed.
   Each permission added MUST be justified in the README.
6. Use `chrome.scripting.executeScript` to inject page logic — never
   `<script>` tag injection from a content script, never `eval`.
7. Be aware of the two execution contexts inside any tab and pick the right
   one per call site (see "World model" below).

## Minimum manifest skeleton

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
  "permissions": ["storage", "scripting", "activeTab", "tabs"],
  "host_permissions": ["https://*/*"],
  "icons": { "48": "icons/48.png", "128": "icons/128.png" }
}
```

`"type": "module"` lets the SW use `import` / `export`. Without it, only a
classic script is supported and dynamic `import()` is not available.

## World model

A content script runs in one of two JavaScript worlds inside the target tab:

| World     | Sees page globals (`window.X`)? | Sees `chrome.*` APIs? | Used for                                       |
|-----------|---------------------------------|-----------------------|------------------------------------------------|
| ISOLATED  | No (mirror only)                | Yes                   | DOM reads/writes, message bus to background.   |
| MAIN      | Yes (full page scope)           | No                    | Exposing page-reachable SDKs (e.g. `window.MyExt`), reading page-defined variables. |

Programmatic injection picks a world explicitly:

```ts
chrome.scripting.executeScript({
  target: { tabId },
  world: "MAIN",              // or "ISOLATED"
  files: ["injected/sdk.js"],
});
```

Pitfalls:

- Putting `chrome.runtime.sendMessage` in a MAIN-world script silently fails.
- Putting `window.MyExt = …` in an ISOLATED-world script leaks nothing to the
  page — the page cannot see it.
- Relaying messages between MAIN and ISOLATED requires a `window.postMessage`
  bridge inside the same tab; there is no direct API.

## Service worker lifecycle pitfalls

1. **No `window`, no `document`, no `localStorage`.** Anything referencing
   those at module top level crashes the worker on registration.
2. **Top-level `await` is allowed** but slows worker startup; prefer lazy
   initialization inside the relevant `chrome.*` event handler.
3. **`setTimeout` / `setInterval` are unreliable** — the worker can be
   evicted before they fire. Use `chrome.alarms` for anything scheduled more
   than ~30 s out.
4. **Listeners must be registered synchronously at top level** so the worker
   wakes correctly on the next event. Registering inside an async callback
   misses early events after eviction.
5. **No DOM APIs**, including `URL.createObjectURL` for blob downloads from
   the SW — bounce through the popup or an offscreen document instead.

## Storage at-a-glance (full spec in sibling folder)

| Layer                    | Use for                                  | Survives reload? | Quota |
|--------------------------|------------------------------------------|------------------|-------|
| `chrome.storage.local`   | Small JSON config, per-tab maps          | Yes              | 10 MB |
| IndexedDB                | Large blobs, build cache                 | Yes              | ~½ disk |
| SQLite via sql.js (OPFS) | Structured logs, recorder data, metrics  | Yes              | ~½ disk |
| `localStorage`           | Avoid in SW; OK in popup for trivial UI flags | Yes        | 5 MB  |

See `../03-db-and-sqlite-integration-with-chrome-extension/` for the
authoritative storage spec.

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
- WASM (e.g. `sql-wasm.wasm`) must be bundled and loaded with `fetch` against
  a `chrome-extension://` URL. See sibling spec `08-bundling-sql-wasm.md`.

## Common pitfalls (do not repeat)

- Declaring `<all_urls>` "just in case" — store reviewers reject this.
- Forgetting `"type": "module"` then importing ESM modules.
- Storing auth tokens in `localStorage` from the SW (it does not exist there).
- Reading `chrome.runtime.id` before the worker has bound — wrap in a guard
  helper that returns null if `chrome?.runtime?.id` is undefined.
- Using `window.fetch` in the SW — use plain `fetch`; `window` is not defined.

## Acceptance

A reviewer can answer "yes" to every line:

- [ ] `manifest.json` declares `manifest_version: 3` and a single
      `background.service_worker`.
- [ ] No `eval`, no `new Function`, no remote `<script src>` anywhere in the
      shipped bundle.
- [ ] All programmatic injection uses `chrome.scripting.executeScript` with an
      explicit `world`.
- [ ] No SW module-scope code references `window`, `document`, or
      `localStorage`.
- [ ] Every declared permission has a one-line justification in `README.md`.
- [ ] A boot smoke test loads the unpacked extension and confirms the SW
      registers without console errors.

## Tests to ship with this step

- Static check: a script that greps the build output for `eval(`, `new Function(`,
  and `<script src="http`, failing the build if any are found.
- Manifest lint: a Node script that validates `manifest.json` against the
  contract above.
- Smoke E2E: load the unpacked extension, assert
  `chrome.runtime.getManifest().manifest_version === 3` from the popup.
