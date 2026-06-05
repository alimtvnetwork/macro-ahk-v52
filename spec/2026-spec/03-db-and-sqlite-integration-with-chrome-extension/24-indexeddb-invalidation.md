# Step 24 — IndexedDB Invalidation

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Define every allowed way to invalidate the injection IndexedDB cache so stale script bytes cannot survive extension updates, dev rebuilds, manual user clears, or authoritative script-store mutations.

## Root cause this prevents

The cache is intentionally rebuildable, but rebuildable does not mean harmless: an MV3 service worker can keep IndexedDB entries across many extension restarts, while dev rebuilds may leave `manifest.json` version unchanged. A pure version check therefore misses “same version, new bundle” changes. The fix is layered invalidation: install/update clear, build-id synchronization, per-entry version/build guards, explicit manual clear, and targeted deletes when a script changes.

## Required files

- `src/background/injection-cache.ts` — `invalidateCacheOnDeploy()`, `syncCacheWithBuildId()`, `purgeStaleEntries()`, `cacheDelete()`, `cacheClearAll()`.
- `src/background/boot.ts` — reads `build-meta.json`, calls `syncCacheWithBuildId()`, later calls `purgeStaleEntries()`.
- `src/background/default-project-seeder.ts` — `chrome.runtime.onInstalled` listener calls deploy invalidation and warming.
- `src/background/message-registry.ts` and cache message handler file — `INVALIDATE_CACHE` request path.
- `src/components/options/**` or popup/options cache UI — manual clear action and diagnostics badge.
- `src/background/__tests__/injection-cache-invalidation.test.ts` — fake-indexeddb + mocked `chrome.storage.local` coverage.

## Invalidation layers

| Layer | Trigger | Scope | Required behavior |
|---|---|---|---|
| Install/update | `chrome.runtime.onInstalled` with `install` or `update` | Full cache | Call `invalidateCacheOnDeploy(reason)` before `warmScriptCache()` |
| Build id | `boot()` reads `build-meta.json` | Full cache when id changed | Compare with `STORAGE_KEY_LAST_BUILD_ID`; clear then store new id |
| Entry guard | Every `getCachedScriptCode()` | Single read | Treat version/build/stub mismatch as miss |
| Stale purge | Boot after seeding/normalization | Stale rows only | Delete rows whose extension version differs |
| Manual | `INVALIDATE_CACHE` message / UI button | Full cache | Clear all rows; return count for diagnostics |
| Mutation | Script/config/project save/delete | Affected rows | Delete exact script-code aliases or namespace/settings entries |
| Quota pressure | IDB quota exceeded | Least-safe stale rows, then full cache | Prune; no retry/backoff loop |

No invalidation path may rewrite source-of-truth stores. It only deletes cache entries.

## Build-id contract

`build-meta.json` is the deployment-level cache sentinel. It exists because `EXTENSION_VERSION` may stay stable during local development or same-version redeploys.

```ts
export type BuildMeta = {
  readonly buildId: string;
  readonly version: string;
  readonly generatedAt?: string;
};

async function readCurrentBuildId(): Promise<string | null> {
  try {
    const response = await fetch(chrome.runtime.getURL("build-meta.json"));
    if (!response.ok) return null;
    const meta = await response.json() as Partial<BuildMeta>;
    return typeof meta.buildId === "string" && meta.buildId.length > 0
      ? meta.buildId
      : null;
  } catch (err) {
    RiseupAsiaMacroExt.Logger.error("[injection-cache] build-meta read failed", {
      Path: "chrome.runtime.getURL(\"build-meta.json\")",
      Missing: "Readable buildId",
      Reason: "BuildMetaReadFailed",
      ReasonDetail: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
```

If `build-meta.json` is missing, invalidation still works through install/update and extension-version guards. Missing build meta is a warning, not a boot failure.

## Copy-pasteable invalidation sample

```ts
import { STORAGE_KEY_LAST_BUILD_ID } from "../shared/constants";
import { cacheClearAll, cacheDelete, purgeStaleEntries } from "./injection-cache";

export async function syncCacheWithBuildId(
  currentBuildId: string | null,
): Promise<{ readonly changed: boolean; readonly cleared: number }> {
  if (currentBuildId === null || currentBuildId.length === 0) {
    return { changed: false, cleared: 0 };
  }

  const result = await chrome.storage.local.get(STORAGE_KEY_LAST_BUILD_ID);
  const previousBuildId = typeof result[STORAGE_KEY_LAST_BUILD_ID] === "string"
    ? result[STORAGE_KEY_LAST_BUILD_ID]
    : null;

  if (previousBuildId === currentBuildId) {
    return { changed: false, cleared: 0 };
  }

  const clearResult = await cacheClearAll();
  await chrome.storage.local.set({ [STORAGE_KEY_LAST_BUILD_ID]: currentBuildId });
  return { changed: true, cleared: clearResult.cleared };
}

export async function invalidateCacheOnDeploy(reason: string): Promise<void> {
  RiseupAsiaMacroExt.Logger.info("[injection-cache] deploy invalidation", { ReasonDetail: reason });
  await cacheClearAll();
}

export async function invalidateScriptCacheForPath(filePath: string): Promise<void> {
  await cacheDelete("script_code", normalizeCachePath(filePath));
}

export async function bootCacheInvalidation(currentBuildId: string | null): Promise<void> {
  await syncCacheWithBuildId(currentBuildId);
  await purgeStaleEntries();
}
```

The sample is intentionally sequential. Do not add exponential backoff or recursive retry; cache invalidation is fail-fast and the resolver can recover by fetching live bytes.

## Manual `INVALIDATE_CACHE` contract

The manual clear command is for users and debugging tools. The request/response shape must stay tiny enough for `chrome.runtime.sendMessage`.

```ts
export type InvalidateCacheRequest = {
  readonly type: "INVALIDATE_CACHE";
  readonly scope: "all" | "script_code";
  readonly reason: "manual" | "diagnostics" | "quota";
};

export type InvalidateCacheResponse = {
  readonly ok: boolean;
  readonly cleared: number;
  readonly errorMessage?: string;
};
```

Rules:

1. `scope: "all"` calls `cacheClearAll()`.
2. `scope: "script_code"` clears only `script_code:*` entries if the wrapper supports prefix deletes; otherwise it clears all and reports the true count.
3. The handler returns `{ ok: false, cleared: 0, errorMessage }` on failure and logs Code-Red details.
4. The UI shows success/failure, but never blocks script execution on a clear failure.

## Mutation invalidation

Any write to authoritative script data must delete matching cache rows after the authoritative write succeeds.

| Authoritative mutation | Cache action |
|---|---|
| Script `filePath` changed | Delete old path key and new path key |
| Script code uploaded with no `filePath` | Delete old path key; embedded code is not cached |
| Script deleted | Delete its path key and bundled alias key if present |
| Built-in manifest reseeded | Full cache clear before warming |
| Namespace blob rebuilt | Delete namespace cache entry, not script-code entries |

Never clear before the source-of-truth write succeeds; otherwise a failed save can leave the app with neither a valid store update nor a warm cache.

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| `chrome.storage.local.get(STORAGE_KEY_LAST_BUILD_ID)` failed | `BgLogTag.INJECTION_CACHE` Code-Red | Errors panel | Return unchanged; resolver still uses entry guards |
| `cacheClearAll()` failed during install/update | `BgLogTag.SEEDER` warning/Error | Toast only in manual path | Continue seeding; live fetch can rebuild |
| Manual clear failed | `BgLogTag.INJECTION_CACHE` Code-Red | Manual-clear UI error | User can retry once manually; no automatic retry loop |
| Prefix delete unsupported | `BgLogTag.INJECTION_CACHE` info | None | Clear all cache entries |
| Quota prune failed | `BgLogTag.INJECTION_CACHE` Code-Red | Errors panel + optional toast | Continue without cache |

All failure logs MUST include `Path`, `Missing`, `Reason`, and `ReasonDetail`. Selector/variable diagnostic arrays are not relevant for this storage-only step and should be `null` only if a shared error envelope requires them.

## Acceptance

- [ ] Install/update listener calls `invalidateCacheOnDeploy()` before `warmScriptCache()`.
- [ ] Boot calls `syncCacheWithBuildId(readCurrentBuildId())` before any cache warming or injection can rely on entries.
- [ ] Boot calls `purgeStaleEntries()` so stale version rows are physically deleted, not only treated as misses.
- [ ] Manual `INVALIDATE_CACHE` returns the number of cleared rows and logs failures with Code-Red shape.
- [ ] Tests cover first build-id initialization, same build-id no-op, changed build-id full clear, and missing build-meta no-op.
- [ ] Tests cover mutation invalidation for old and new `filePath` aliases.
- [ ] No invalidation path writes script/config/project source-of-truth data.

## See also

- [step-18](./18-flush-strategy.md) — Drain points and no retry/backoff policy
- [step-21](./21-indexeddb-when-to-choose.md) — Why this cache belongs in IDB
- [step-22](./22-indexeddb-wrapper-pattern.md) — Wrapper and close behavior
- [step-23](./23-indexeddb-injection-cache.md) — Cache schema and resolver contract
- [step-26](./26-chrome-storage-local-quota.md) — Quota and pruning behavior

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
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

