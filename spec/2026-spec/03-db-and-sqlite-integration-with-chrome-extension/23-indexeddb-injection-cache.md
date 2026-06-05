# Step 23 — IndexedDB Injection Cache

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./readme.md).

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
| Embedded custom script code | `chrome.storage.local` script record | none | No |
| Project/config metadata | SQLite or `chrome.storage.local` owner layer | none | No for this step |

The current codebase already moved in this direction: `src/background/script-resolver.ts` checks `getCachedScriptCode(filePath)` first, fetches from `chrome.runtime.getURL(filePath)` on miss, then calls `cacheScriptCode(filePath, code)` only after a non-empty response. This step locks that as the spec and removes the older “cache full projects/configs” idea from Issue 88.

## Store schema

Use the Step 22 wrapper, but keep the physical shape compatible with the existing `marco_injection_cache` database unless an explicit migration is written.

```ts
export const INJECTION_CACHE_DB = {
  Name: "marco_injection_cache",
  Version: 1,
  Stores: [{ Name: "cache", KeyPath: "key" }],
} as const;

export type InjectionCacheEntry = {
  readonly key: string;              // `script_code:${normalizedFilePath}`
  readonly value: string;            // real script source, never a STUB_PREFIX placeholder
  readonly cachedAt: string;         // ISO string for diagnostics only
  readonly extensionVersion: string; // EXTENSION_VERSION at write time
  readonly buildId: string | null;   // build-meta.json id when available
  readonly byteLength: number;
  readonly sha256: string;           // integrity/debug fingerprint, not a security boundary
};
```

Required key rules:

1. Normalize `\` to `/` and strip query/hash fragments before keying.
2. Use the same key for resolver reads and cache-warmer writes.
3. Do not key by script name alone; filenames collide across projects.
4. Keep `extensionVersion` and `buildId` in the value so Step 24 can purge stale rows without relying on object-store version bumps.

## Copy-pasteable TypeScript sample

```ts
import { EXTENSION_VERSION } from "../shared/constants";
import { openDb, runTx } from "./idb/idb-wrapper";

const STORE_NAME = "cache";

function normalizeCachePath(path: string): string {
  return path.trim().replace(/\\/g, "/").split(/[?#]/)[0];
}

function buildScriptCodeKey(filePath: string): string {
  return `script_code:${normalizeCachePath(filePath)}`;
}

function assertCacheableScriptCode(filePath: string, code: string): void {
  if (code.length < 10) {
    throw new Error(`Tiny script response\n  Path: ${filePath}\n  Missing: Script code >= 10 chars\n  Reason: Empty or placeholder response`);
  }
  if (code.startsWith("// STUB:")) {
    throw new Error(`Refusing to cache stub script\n  Path: ${filePath}\n  Missing: Real bundled script bytes\n  Reason: STUB_PREFIX is not executable source`);
  }
}

export async function cacheScriptCode(
  filePath: string,
  code: string,
  buildId: string | null,
): Promise<void> {
  assertCacheableScriptCode(filePath, code);
  const db = await openDb(INJECTION_CACHE_DB);
  const key = buildScriptCodeKey(filePath);

  await runTx(db, [STORE_NAME], "readwrite", (stores) => {
    stores[STORE_NAME].put({
      key,
      value: code,
      cachedAt: new Date().toISOString(),
      extensionVersion: EXTENSION_VERSION,
      buildId,
      byteLength: new TextEncoder().encode(code).byteLength,
      sha256: "computed-by-caller-or-wrapper",
    });
  });
}

export async function getCachedScriptCode(
  filePath: string,
  currentBuildId: string | null,
): Promise<string | null> {
  const db = await openDb(INJECTION_CACHE_DB);
  const key = buildScriptCodeKey(filePath);

  return runTx(db, [STORE_NAME], "readonly", (stores) => {
    const request = stores[STORE_NAME].get(key);
    return new Promise<string | null>((resolve) => {
      request.onsuccess = () => {
        const entry = request.result as InjectionCacheEntry | undefined;
        if (entry === undefined) return resolve(null);
        if (entry.extensionVersion !== EXTENSION_VERSION) return resolve(null);
        if (entry.buildId !== currentBuildId) return resolve(null);
        if (entry.value.startsWith("// STUB:")) return resolve(null);
        resolve(entry.value);
      };
      request.onerror = () => resolve(null);
    });
  });
}
```

The `Promise` around `IDBRequest` must remain inside the immediate transaction work scheduled by the wrapper. Do not add network fetches, `chrome.storage.local` reads, hashing workers, or other external awaits inside the transaction callback.

## Resolver contract

`resolveScriptCode(script)` MUST follow this order:

1. If `script.filePath` is absent and the script is built-in, throw. Built-ins never use embedded fallback.
2. If `script.filePath` is absent and the script is custom, return embedded `script.code` without touching IDB.
3. Read `getCachedScriptCode(script.filePath, currentBuildId)`.
4. If cache hit passes version/build/stub guards, return `{ code, source: "cache" }`.
5. On miss, fetch the bundled/declarative path.
6. Only after `response.ok` and `code.length >= 10`, write to IDB.
7. If the fetched path is a bundled fallback alias, cache both the canonical fetched path and the original `script.filePath` alias.
8. If all built-in fetches fail, throw; do not execute `script.code`.
9. If all custom file fetches fail, log Code-Red detail and only then use embedded code.

## Cache warmer contract

`warmScriptCache()` is a performance optimization, not correctness logic.

- It runs after install/update seeding.
- It reads enabled, filePath-backed scripts from the authoritative store.
- It warms sequentially and fail-fast on the first HTTP response failure, matching the HEFF rule.
- It logs failures with `Path`, `Missing`, `Reason`, and `ReasonDetail`.
- Injection must still work if warming never ran; the resolver is the authoritative cache-fill path.

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| IDB open/transaction failed | `BgLogTag.INJECTION_CACHE` | Errors panel if persistent; no boot block | Cache miss; fetch live bundled file |
| Cached version/build mismatch | `[injection-cache] version/build mismatch` info | None | Return miss; Step 24 purge later |
| Cached value starts with `STUB_PREFIX` | `BgLogTag.INJECTION_CACHE` Code-Red | Errors panel row | Delete entry and fetch live file |
| Built-in file fetch failed | `BgLogTag.SCRIPT_RESOLVER` Code-Red | Errors panel / injection diagnostics | Throw; refuse stale embedded fallback |
| Cache write quota exceeded | `BgLogTag.INJECTION_CACHE` Code-Red | Toast only if user-initiated run | Invoke Step 24 pruning, then continue without cache |

No cache operation may hide an injection failure. Cache failures degrade to a fetch; bundled-file failures for built-ins are hard failures.

## Acceptance

- [ ] `rg "indexedDB\.open\(" src/` returns only the Step 22 wrapper file.
- [ ] `cacheScriptCode()` rejects empty/tiny source and `STUB_PREFIX` source.
- [ ] `getCachedScriptCode()` returns `null` for extension-version mismatch, build-id mismatch, missing entry, corrupt value, or stub value.
- [ ] Built-in scripts never fall back to embedded `script.code`.
- [ ] Cache-warmer failure does not prevent later injection from fetching live bytes.
- [ ] Tests cover first-run miss → fetch → cache, second-run cache hit, build mismatch miss, and built-in fetch failure.

## See also

- [step-21](./21-indexeddb-when-to-choose.md) — Why script bytes belong in IDB
- [step-22](./22-indexeddb-wrapper-pattern.md) — Required wrapper
- [step-24](./24-indexeddb-invalidation.md) — Purge triggers and manual clear
- [step-30](./30-sdk-content-script-contract.md) — Content-script execution contract

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

