# Step 05 — Manifest V3 Constraints That Shape Storage

## Goal

State the Manifest V3 (MV3) rules that every storage decision in this spec must respect. If you violate any of these, SQLite will fail to load, the
service worker will be killed mid-write, or the Chrome Web Store will reject the build. This step is the contract; later steps assume it.

## Audience

An AI agent that has never read Chrome MV3 docs. Treat every rule here as non-negotiable.

## The 8 MV3 rules that govern storage

1. **Service worker is ephemeral.**
   - The background context is a Service Worker (`background.service_worker` in `manifest.json`), not a persistent page.
   - Chrome can terminate it after ~30s of inactivity. Any in-memory `Database` object is lost when that happens.
   - Implication: **never** keep SQLite state only in memory. Every mutation must be flushable to a persistence backend (see step 17–18).

2. **No `eval`, no remote code.**
   - `script-src 'self'` is mandatory. The only relaxation we are allowed is `'wasm-unsafe-eval'`, which is required by sql.js.
   - Required CSP (already present in `manifest.json`):
     ```json
     "content_security_policy": {
       "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
     }
     ```
   - Implication: **never** load `sql-wasm.wasm` from a CDN, never `new Function(...)`, never `eval`. Bundle the wasm (step 08).

3. **No DOM in the service worker.**
   - No `window`, no `document`, no `localStorage`, no synchronous `XMLHttpRequest`, no `alert`.
   - Implication: `localStorage` is **unavailable** to the SW. Anything the SW needs to persist must use `chrome.storage.local`, IndexedDB,
     or SQLite-on-IndexedDB.

4. **`chrome.storage.local` has a hard 10 MB quota by default; `unlimitedStorage` permission lifts it.**
   - We already declare `"unlimitedStorage"` in `manifest.json` permissions. Keep it. Removing it breaks the SQLite snapshot blob the
     moment the database exceeds 10 MB.
   - Implication: assume "unlimited" but still budget — Chrome can evict under disk pressure (step 03).

5. **IndexedDB is available in all extension contexts.**
   - Service worker, popup, options page, content scripts, and devtools all see the same per-origin IndexedDB.
   - This is the **only** API that is both (a) async, (b) available to the SW, and (c) capable of storing large blobs and structured rows.
   - Implication: use IndexedDB for the SQLite snapshot, the injection cache, and any large structured payload.

6. **Content scripts run in an isolated world by default; SDK lives in MAIN world.**
   - Storage APIs (`chrome.storage`, IndexedDB on the extension origin) are only reachable from the isolated world / SW.
   - The MAIN world (where `RiseupAsiaMacroExt` SDK runs) must talk to storage through the relay (see step 30).
   - Implication: do not call `chrome.storage` from MAIN world; route through the message relay.

7. **Cross-context coordination requires `chrome.storage.onChanged` or `chrome.runtime.sendMessage`.**
   - There is no shared synchronous memory between SW, popup, options, and content scripts.
   - Implication: if SQLite is mutated in the SW, downstream UIs must be notified via a broadcast (e.g. `ERROR_COUNT_CHANGED` pattern,
     see core memory entry "Real-time error sync").

8. **`alarms` is the only reliable scheduler in the SW.**
   - `setInterval` / `setTimeout` are cleared when the worker sleeps. `chrome.alarms` survives sleep and wakes the worker.
   - Implication: any periodic flush (step 18) or retention prune (step 35) must be driven by `chrome.alarms`, not `setInterval`.
   - This project already declares `"alarms"` in `manifest.json` permissions.

## Required `manifest.json` shape (minimum for this spec)

```json
{
  "manifest_version": 3,
  "background": { "service_worker": "background/index.js", "type": "module" },
  "permissions": ["storage", "alarms", "unlimitedStorage"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  "web_accessible_resources": [
    { "resources": ["assets/sql-wasm.wasm"], "matches": ["<all_urls>"] }
  ]
}
```

`web_accessible_resources` is required because `sql.js` resolves the wasm via a URL; the SW fetches it from the extension origin (see step 08).

## Anti-patterns (auto-reject in PR review)

- Using `localStorage` from the service worker. Will throw `ReferenceError: localStorage is not defined`.
- Adding `'unsafe-eval'` to CSP to "make sql.js work". The correct flag is `'wasm-unsafe-eval'`.
- Loading `sql-wasm.wasm` from `https://cdn.jsdelivr.net/...`. Blocked by CSP; also a Web Store policy violation.
- Using `setInterval` to flush SQLite. Survives only while the SW is awake; misses flushes.
- Holding a `Database` handle in a module-scope `let` and assuming it survives a SW restart.

## Acceptance for this step

- [ ] The implementation satisfies the `Step 05 — Manifest V3 Constraints That Shape Storage` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- `manifest.json` includes the four required fields above.
- A grep for `localStorage` in `src/background/` returns zero hits (or only comments explaining why it is banned there).
- A grep for `setInterval` in flush/retention code returns zero hits; `chrome.alarms.create` is used instead.
- CSP contains `wasm-unsafe-eval` and does **not** contain `unsafe-eval`.

## Cross-references

- Step 03 — quota / persistence / eviction (consumer of `unlimitedStorage`).
- Step 08 — bundling `sql-wasm.wasm` (consumer of `web_accessible_resources` + CSP).
- Step 17–18 — persistence backends and flush strategy (consumer of `chrome.alarms`).
- Step 29 — cross-context access (consumer of `chrome.storage.onChanged`).
- Step 30 — SDK content-script contract (consumer of MAIN/isolated-world rule).

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, quotas, retention, byte caps, chunk sizes) to a named constant declared in `spec/2026-spec/01-prompt-spec/reference/05-runtime-defaults.md` or a local `reference/*-defaults.md` file. Inline literals are rejected.
- **MUST** keep `chrome.storage.local` per-key payloads ≤ `CHROME_STORAGE_LOCAL_PER_KEY_BYTES` (8 192) and aggregate writes ≤ `CHROME_STORAGE_LOCAL_TOTAL_BYTES` (10 485 760). Larger payloads route to IndexedDB or SQLite.
- **MUST** await `navigator.storage.persist()` once at boot, log the resolved boolean via `RiseupAsiaMacroExt.Logger.info`, and surface `{ persisted, usage, quota }` in diagnostics — no fire-and-forget.
- **MUST** classify every DB failure with a stable `Reason` code (see `31-error-model.md`) plus `ReasonDetail`, and route it through `Logger.error` — never `console.error` and never silently swallow.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* ignored */ }` around `db.exec()` — masks corruption; the error-swallow audit (`public/error-swallow-audit.json`) will fail CI. ✅ Re-throw after `Logger.error` with full SQL + bind context.
- ❌ Calling `db.run` on a new-tab/blank URL because the auto-injector did not gate the URL. ✅ Use `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` before scheduling any DB-bound work.
- ❌ Hardcoding `Asia/Kuala_Lumpur` (or any zone) when persisting timestamps. ✅ Store `Date.now()` as UTC ms; render with `Intl.DateTimeFormat(undefined, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })`.
- ❌ Treating `chrome.storage.local.set` as synchronous and reading back in the next line. ✅ Always `await` the Promise (MV3) and verify the write via `storage.local.get` in tests.
- ❌ Retrying a failed migration with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy` — surface a Boot Failure Banner (`34-boot-failure-banner.md`) and require user action.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

