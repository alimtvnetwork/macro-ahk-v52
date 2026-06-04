# Step 23 — IndexedDB Injection Cache

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Define the canonical IndexedDB cache for injection-time script bytes so large `web_accessible_resources` payloads are fast to reuse, never stored as source-of-truth, and never allowed to mask missing bundled files.

## Root cause this prevents

The recurring injection failure is **stale-or-stub script execution**. `manifest-seeder.ts` and `builtin-script-guard.ts` intentionally store `STUB_PREFIX` placeholders in `chrome.storage.local` so built-in code is fetched from canonical bundled files. If the cache blindly serves old `script_code` blobs, or if the resolver falls back to embedded stubs for built-ins, the macro controller can report “injected” while the UI never loads. The cache must therefore be rebuildable, version/build guarded, and subordinate to bundled-file validation.

## Required files

- `src/background/idb/idb-wrapper.ts` — Step 22 wrapper used by every IDB call.
- `src/background/injection-cache.ts` — public injection cache API.
- `src/background/script-resolver.ts` — reads cache before fetch, writes cache only after valid fetch.
- `src/background/cache-warmer.ts` — optional install/update prefetch path.
- `src/background/boot.ts` — boot-time stale purge and build sync.
- `src/background/__tests__/injection-cache.test.ts` — fake-indexeddb coverage.
- `src/background/__tests__/script-resolver-cache.test.ts` — resolver cache-hit/cache-miss/stub-guard coverage.

No runtime dependency is required beyond the browser `indexedDB` global. Test files may use `fake-indexeddb` from Step 22.

## Cache ownership rule

IndexedDB stores **derived script bytes only**. It MUST NOT become the authoritative script/config/project store.

| Data | Source of truth | Cache key | Cached? |
|---|---|---|---|
| Built-in script code (`macro-looping.js`, `marco-sdk.js`, `xpath.js`) | `dist/projects/scripts/**` via `chrome.runtime.getURL()` | normalized dist path + build id | Yes |
| Custom script with real `filePath` | its declared `filePath` fetch target | normalized path + build id | Yes |
| Embedded custom script code | `chrome.storage.local[
