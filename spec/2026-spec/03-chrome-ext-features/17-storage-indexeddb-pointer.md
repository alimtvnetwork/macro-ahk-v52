# 17 — Storage IndexedDB Pointer

## Why this step exists

The feature specs need an IndexedDB lane for rebuildable caches, especially
injection-time script bytes, but IndexedDB must not become a second source of
truth beside SQLite or `chrome.storage.local`. This file binds the Chrome
extension feature spec to the authoritative IndexedDB rules in the sibling
storage spec and prevents tier drift.

Authoritative folder:

```text
spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/
```

## Contract

1. **IndexedDB is cache/storage overflow only.** It is for derived bytes,
   rebuildable caches, and large per-origin/per-context payloads; not
   authoritative projects, scripts, configs, logs, errors, auth, or role state.
2. **Wrapper-only access.** Direct `indexedDB.open()` is allowed only inside the
   shared IndexedDB wrapper. All consumers use `openDb()` and `runTx()`.
3. **No source-of-truth migration.** IndexedDB cache rows are cleared and
   rebuilt. Do not migrate them as durable business data.
4. **Build/version guarded.** Cache entries include extension version and build
   id, and stale entries are treated as misses before they are physically purged.
5. **No stub execution.** Cached script bytes starting with the stub prefix are
   invalid and must be deleted/refetched, never executed.
6. **No hidden fallback success.** Cache failure degrades to fetching canonical
   bundled files; bundled-file failure for built-ins remains a hard injection
   failure.
7. **Sequential fail-fast invalidation.** Clear/purge paths are bounded and do
   not retry, back off, or schedule background repair loops.
8. **Code Red on hard failures.** Open, transaction, quota, corrupt cache, and
   built-in fetch failures include exact path, missing item, `Reason`, and
   `ReasonDetail`.

## Mandatory sibling files

Read these files before implementing or changing any IndexedDB behavior:

| Need | Authoritative file |
|---|---|
| Tier decision | `21-indexeddb-when-to-choose.md` |
| Wrapper and transaction lifetime | `22-indexeddb-wrapper-pattern.md` |
| Injection cache schema/resolver | `23-indexeddb-injection-cache.md` |
| Invalidation rules | `24-indexeddb-invalidation.md` |
| Storage migrations boundary | `28-cross-version-storage-migration.md` |
| Cross-context routing | `29-cross-context-access.md`, `30-sdk-content-script-contract.md` |
| Error shape | `31-error-model.md`, `36-code-red-logging-rule.md` |
| Testing / CI | `38-testing.md`, `39-ci-gates.md`, `40-acceptance-criteria.md` |

## Allowed use cases

| Use case | IndexedDB allowed? | Reason |
|---|---:|---|
| Injection cache for fetched/bundled script bytes | Yes | Derived and rebuildable. |
| Prompt dual cache (`JsonCopy` / `HtmlCopy`) | Yes | Large derived page-side blobs. |
| Backup ZIP staging | Yes | Temporary bytes too large for `chrome.storage.local`. |
| Diagnostic overflow cache | Yes, bounded | Only when SQLite retention cap is reached. |
| Error rows / Code Red logs | No | SQLite is source of truth. |
| Projects / scripts / configs | No | Existing owner is SQLite or `chrome.storage.local`. |
| Active project id / small settings | No | Use `chrome.storage.local`. |
| Auth tokens / secrets / roles | No | Forbidden in browser storage. |

Anything outside the allowed list needs a storage-tier decision recorded before
implementation.

## Required wrapper shape

All IDB access follows the sibling wrapper contract:

```ts
export interface IdbStoreSpec {
  readonly Name: string;
  readonly KeyPath: string | null;
  readonly Indexes?: ReadonlyArray<{
    readonly Name: string;
    readonly KeyPath: string;
    readonly Unique: boolean;
  }>;
}

export interface IdbDbSpec {
  readonly Name: string;
  readonly Version: number;
  readonly Stores: readonly IdbStoreSpec[];
}
```

Rules:

- `onupgradeneeded` reads only declarative store specs.
- Transaction work is synchronous-inside; do not `await` fetch, storage, hashing,
  timers, or message calls inside a transaction callback.
- `closeAllDbs()` is registered with service-worker suspend teardown.
- UI and content code do not call `indexedDB.open()` directly; if a content-side
  cache is required, it still uses a dedicated wrapper with the same contract.

## Injection cache binding

Canonical cache entry:

```ts
export interface InjectionCacheEntry {
  readonly key: string;
  readonly value: string;
  readonly cachedAt: string;
  readonly extensionVersion: string;
  readonly buildId: string | null;
  readonly byteLength: number;
  readonly sha256: string;
}
```

Resolver order:

1. Built-in scripts must have a `filePath`; missing built-in `filePath` is hard
   failure.
2. Custom embedded scripts with no `filePath` bypass IndexedDB.
3. Read cache by normalized file path + current build id.
4. Version/build/stub mismatch returns cache miss and schedules/executes purge.
5. Fetch canonical bundled/declarative path on miss.
6. Cache only after `response.ok`, non-empty source, and stub rejection.
7. Built-in fetch failure throws. Custom fetch failure may fall back to embedded
   code only after Code Red detail is logged.

This prevents stale/stub script execution while preserving fast repeat injects.

## Invalidation binding

| Trigger | Required behavior |
|---|---|
| Extension install/update | Clear all cache before warming. |
| Build id changed | Clear all cache, then store new build id. |
| Cache read mismatch | Treat as miss immediately; stale purge may follow. |
| Script path changed | Delete old and new path aliases after authoritative save succeeds. |
| Manual clear | Return `{ ok, cleared }`; do not block future live fetch. |
| Quota pressure | Prune stale rows first, then full cache if needed; no retry loop. |

No invalidation path writes source-of-truth project/script/config records.

## Error reasons

| Reason | When |
|---|---|
| `IdbOpenFailed` | `indexedDB.open()` fails in wrapper. |
| `IdbUpgradeFailed` | Declarative store upgrade throws. |
| `IdbTxFailed` | Transaction aborts or errors. |
| `IndexedDbTierMismatch` | Caller tries to store SQLite/chrome-local data in IDB. |
| `InjectionCacheStubRejected` | Cache value or write starts with stub prefix. |
| `InjectionCacheBuildMismatch` | Entry build id differs from current build id. |
| `InjectionCacheVersionMismatch` | Entry extension version differs from current version. |
| `InjectionCacheInvalidationFailed` | Manual/deploy/build clear fails. |
| `BuiltinScriptFetchFailed` | Built-in canonical file cannot be fetched. |

Every error includes `Path`, `Missing`, `Reason`, `ReasonDetail`, and when
available `DbName`, `StoreName`, `CacheKey`, and `BuildId`.

## CI gates

The implementing project must enforce:

```text
indexeddb-wrapper-only     indexedDB.open appears only in the wrapper
idb-no-source-of-truth     IDB stores only allowed derived/cache payloads
injection-cache-no-stub    stub bytes are never cached or served
idb-build-guard            cache entries include version/build id guards
idb-invalidation-tests     deploy/build/manual/mutation invalidation covered
no-idb-storage-migration   derived caches are cleared, not migrated
```

Guard failures must emit exact file path, missing requirement, `Reason`, and
`ReasonDetail`.

## Pitfalls

- Treating IndexedDB as “bigger `chrome.storage.local`”. It is not the default
  settings store; it is a cache/large-payload lane.
- Awaiting external work inside an active transaction. IndexedDB can auto-commit
  and lose later requests.
- Serving stale cached built-in scripts after a same-version rebuild. Use build
  id checks, not version checks alone.
- Caching embedded stub placeholders. Stubs are metadata, not executable source.
- Migrating cache entries across schema versions. Clear and rebuild instead.

## Acceptance criteria

- [ ] All IDB access goes through the wrapper; direct `indexedDB.open()` appears
      only in the wrapper file.
- [ ] `pickStorageTier()` or equivalent rejects source-of-truth payloads routed
      to IndexedDB.
- [ ] Injection cache entries include extension version, build id, byte length,
      and fingerprint.
- [ ] Stub, version mismatch, and build mismatch entries return cache miss and
      never execute.
- [ ] Install/update, build-id change, manual clear, mutation invalidation, and
      quota pruning are tested.
- [ ] Built-in script fetch failure is a hard failure with Code Red detail.
- [ ] Cache failure does not hide injection failure and does not retry/back off.
- [ ] Service-worker suspend closes IDB handles.

## Cross-references

- Step 08 — script injection lifecycle consumes script bytes.
- Step 09 — sentinel prevents duplicate injection independent of cache state.
- Step 10 — re-inject may clear cache manually but must not rewrite sources.
- Step 16 — SQLite remains source of truth for logs/errors/structured records.
- Step 18 — `chrome.storage.local` owns small shared JSON and build-id sentinel.