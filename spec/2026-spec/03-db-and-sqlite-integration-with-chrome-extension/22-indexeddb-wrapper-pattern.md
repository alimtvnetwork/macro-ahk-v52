# Step 22 — IndexedDB Wrapper Pattern

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./readme.md).

## Goal

Provide a **single, minimal IndexedDB wrapper** that every approved IDB consumer (Step 21) uses, so version upgrades, transaction lifetimes, error logging, and teardown follow one auditable pattern instead of ad-hoc `indexedDB.open()` calls scattered across the codebase.

## Root cause this prevents

The recurring IDB failure mode in MV3 extensions is **silent transaction loss**: callers `await` a `Promise` that resolves on `onsuccess`, but the surrounding transaction has already auto-committed because the microtask queue yielded. The wrapper closes this by exposing `runTx(mode, work)` where `work` is invoked synchronously inside the transaction and only its returned value is awaited outside.

## Required files

- `src/background/idb/idb-wrapper.ts` — `openDb()`, `runTx()`, `closeAllDbs()`
- `src/background/idb/idb-types.ts` — `IdbStoreSpec`, `IdbDbSpec`, `IdbTxMode`
- `src/background/idb/idb-policy.ts` — Step 21 tier guard, called before every write
- `src/background/idb/__tests__/idb-wrapper.test.ts` — fake-indexeddb-backed tests

Required dev dependency (test-only): `fake-indexeddb`. No new runtime dependency is added; the wrapper uses the platform `indexedDB` global.

## Wrapper contract

1. **One handle per (dbName, version)** — cached in a module-level `Map`; reused across calls.
2. **Schema is declarative** — `IdbDbSpec` lists stores and indexes; `onupgradeneeded` reads only from the spec.
3. **`runTx(work)` is synchronous-inside** — `work(stores)` MUST NOT `await` anything; it returns a value or a `Promise.resolve(value)` that the wrapper resolves after `transaction.oncomplete`.
4. **No long-lived cursors across awaits** — cursor walks happen entirely inside `work`.
5. **Every failure is logged** with `Path`, `Missing`, `Reason`, `ReasonDetail`, and the `dbName`/`storeName` involved.
6. **`closeAllDbs()` runs on `chrome.runtime.onSuspend`** alongside SQLite flush (Step 18 drain points).

## Copy-pasteable TypeScript sample

```ts
import { RiseupAsiaMacroExt } from "../../shared/logger";

export type IdbTxMode = "readonly" | "readwrite";

export type IdbStoreSpec = {
  readonly Name: string;
  readonly KeyPath: string | null;
  readonly Indexes?: ReadonlyArray<{ readonly Name: string; readonly KeyPath: string; readonly Unique: boolean }>;
};

export type IdbDbSpec = {
  readonly Name: string;
  readonly Version: number;
  readonly Stores: readonly IdbStoreSpec[];
};

const openDbs = new Map<string, IDBDatabase>();

export function openDb(spec: IdbDbSpec): Promise<IDBDatabase> {
  const cacheKey = `${spec.Name}@${spec.Version}`;
  const cached = openDbs.get(cacheKey);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(spec.Name, spec.Version);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of spec.Stores) {
        if (db.objectStoreNames.contains(store.Name)) continue;
        const os = db.createObjectStore(store.Name, store.KeyPath !== null ? { keyPath: store.KeyPath } : undefined);
        for (const idx of store.Indexes ?? []) {
          os.createIndex(idx.Name, idx.KeyPath, { unique: idx.Unique });
        }
      }
    };
    req.onsuccess = () => {
      openDbs.set(cacheKey, req.result);
      resolve(req.result);
    };
    req.onerror = () => {
      RiseupAsiaMacroExt.Logger.error("[idb-wrapper] open failed", {
        Path: `idb:${spec.Name}@${spec.Version}`,
        Missing: "IndexedDB handle",
        Reason: "IdbOpenFailed",
        ReasonDetail: req.error?.message ?? "unknown",
      });
      reject(req.error);
    };
  });
}

export async function runTx<T>(
  db: IDBDatabase,
  storeNames: readonly string[],
  mode: IdbTxMode,
  work: (stores: Record<string, IDBObjectStore>) => T | Promise<T>,
): Promise<T> {
  const tx = db.transaction(storeNames as string[], mode);
  const stores: Record<string, IDBObjectStore> = {};
  for (const name of storeNames) stores[name] = tx.objectStore(name);

  const workResult = work(stores); // MUST be sync-or-immediately-resolved

  return new Promise<T>((resolve, reject) => {
    tx.oncomplete = () => Promise.resolve(workResult).then(resolve, reject);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    tx.onerror = () => {
      RiseupAsiaMacroExt.Logger.error("[idb-wrapper] tx failed", {
        Path: `idb-tx:${storeNames.join(",")}`,
        Missing: "IndexedDB transaction commit",
        Reason: "IdbTxFailed",
        ReasonDetail: tx.error?.message ?? "unknown",
      });
      reject(tx.error);
    };
  });
}

export function closeAllDbs(): void {
  for (const db of openDbs.values()) db.close();
  openDbs.clear();
}
```

## Usage example

```ts
const db = await openDb({
  Name: "InjectionCache",
  Version: 1,
  Stores: [{ Name: "Scripts", KeyPath: "BuildHash", Indexes: [{ Name: "ByCreatedAt", KeyPath: "CreatedAtMs", Unique: false }] }],
});

await runTx(db, ["Scripts"], "readwrite", (stores) => {
  stores.Scripts.put({ BuildHash: "abc123", Bytes: payload, CreatedAtMs: Date.now() });
});
```

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| `indexedDB.open` rejected | `[idb-wrapper] open failed` Code-Red | BootFailureBanner if cache is required | Throw; do not silently rebuild |
| `onupgradeneeded` threw | `[idb-wrapper] upgrade failed` Code-Red | Errors panel row with dbName | Throw; user must reinstall or clear cache |
| Transaction aborted | `[idb-wrapper] tx failed` Code-Red | Toast for user-initiated writes | Throw; do **not** auto-retry (memory: `mem://constraints/no-retry-policy`) |
| `work()` returned a Promise that awaited external IO | Detected in tests, not at runtime | None | Refactor caller to be sync-inside |
| Quota exceeded | `[idb-wrapper] quota` Code-Red | Toast naming the store | Caller invokes Step 24 invalidation |

## Acceptance

- [ ] All IDB access in `src/background/` goes through `openDb` + `runTx`.
- [ ] `rg "indexedDB\.open\(" src/` returns only `src/background/idb/idb-wrapper.ts`.
- [ ] Tests prove `runTx` resolves only after `oncomplete` fires, not after `onsuccess` of inner requests.
- [ ] Tests prove `runTx` rejects when the transaction aborts, even if inner requests succeeded.
- [ ] `closeAllDbs()` is wired into `chrome.runtime.onSuspend` next to SQLite flush.
- [ ] No retry/backoff branch exists inside the wrapper (enforced by `mem://constraints/no-retry-policy`).

## See also

- [step-21](./21-indexeddb-when-to-choose.md) — Tier decision rule
- [step-23](./23-indexeddb-injection-cache.md) — Canonical consumer
- [step-24](./24-indexeddb-invalidation.md) — Cache invalidation policy
- [step-18](./18-flush-strategy.md) — Drain points shared with SQLite

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

