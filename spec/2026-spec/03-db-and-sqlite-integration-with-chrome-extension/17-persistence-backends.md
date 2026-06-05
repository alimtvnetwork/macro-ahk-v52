# Step 17 — Persistence Backends

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Define a **strict three-tier persistence waterfall** — OPFS → `chrome.storage.local` → in-memory — that every SQLite DB manager (global `db-manager.ts` + per-project `project-db-manager.ts`) MUST follow, recorded once per boot via a `PersistenceMode` value used in diagnostics.

## Required files

- `src/background/db-persistence.ts` — single source of truth for low-level read/write primitives:
  - `loadOrCreateFromOpfs(filename, schemaSql)`
  - `saveToOpfs(filename, db)`
  - `loadFromStorage(key, schemaSql)`
  - `flushToStorage({ key, db })`
- `src/background/db-manager.ts` — global `Logs` / `Errors` DBs
- `src/background/project-db-manager.ts` — per-project DBs keyed by slug

Both managers MUST import from `db-persistence.ts`. No background module may call `navigator.storage.getDirectory()` or `chrome.storage.local.set(<serialized-db>)` directly.

## The waterfall (mandatory order)

```ts
type PersistenceMode = "opfs" | "storage" | "memory";

let persistenceMode: PersistenceMode = "memory";

async function tryInit(): Promise<void> {
  // 1. OPFS — primary, no quota pressure, fastest fsync
  try {
    await loadOrCreateFromOpfs(LOGS_FILE, FULL_LOGS_SCHEMA);
    await loadOrCreateFromOpfs(ERRORS_FILE, FULL_ERRORS_SCHEMA);
    persistenceMode = "opfs";
    return;
  } catch (err) {
    // allow-swallow: OPFS unavailable (Firefox-ish UA, private window, quota)
    console.error(`[db-manager] OPFS unavailable
  Path: navigator.storage.getDirectory() → OPFS root
  Missing: SQLite database files (logs + errors)
  Reason: ${err instanceof Error ? err.message : String(err)}`, err);
  }

  // 2. chrome.storage.local — fallback, 10 MB hard ceiling
  try {
    await loadFromStorage(LOGS_KEY, FULL_LOGS_SCHEMA);
    await loadFromStorage(ERRORS_KEY, FULL_ERRORS_SCHEMA);
    persistenceMode = "storage";
    return;
  } catch (err) {
    console.error(`[db-manager] storage.local persistence failed
  Path: chrome.storage.local → SQLite serialized blobs
  Missing: Deserialized SQLite database instances
  Reason: ${err instanceof Error ? err.message : String(err)}`, err);
  }

  // 3. In-memory — last resort, no persistence, banner shown
  persistenceMode = "memory";
}
```

Rules — non-negotiable:

1. **OPFS is always tried first.** Never skip OPFS, even if the previous boot landed on `storage`. Backends are re-probed every boot.
2. **`storage` mode is only entered after OPFS fails.** It exists for environments where OPFS is blocked. It is NOT a performance tier choice.
3. **`memory` mode is a hard failure surface.** When entered, BootFailureBanner (see step-34) MUST be raised; user data is volatile and will be lost on SW idle.
4. **Mode is decided once per boot and frozen** in the module-scoped `persistenceMode`. Mid-session switching is forbidden — would corrupt the dirty-tracking and flush debounce contract.
5. **Both managers MUST use identical waterfall code.** Diverging the order between `db-manager` and `project-db-manager` is a CR violation.

## OPFS payload

OPFS stores the raw `Uint8Array` from `db.export()` as a file (`logs.sqlite`, `errors.sqlite`, `proj_<slug>.sqlite`). No JSON wrapping, no base64.

## chrome.storage.local payload

`chrome.storage.local` only accepts JSON-cloneable values, so the serialized DB MUST be wrapped as `Array.from(db.export())`. Re-hydration uses `new Uint8Array(stored)`. Keys MUST be namespaced:

- `marco_db_logs`
- `marco_db_errors`
- `marco_db_proj_<slug>`

Quota gate (10 MB per item, 10 MB total in MV3) is covered in step-26.

## Error model

| Failure | Logger tag | User-visible surface |
|---|---|---|
| OPFS unavailable | `[db-manager]` Code-Red error log | none (silent fallback) |
| storage.local quota exceeded | `[db-manager]` Code-Red, written to `Errors` DB if reachable | toast on next write attempt |
| All tiers failed | `[db-manager]` Code-Red + `bootFailure` flag | BootFailureBanner (step-34) |

Every Code-Red log MUST include `Path:`, `Missing:`, `Reason:` lines per the file-path error-logging rule.

## Acceptance

- [ ] `db-persistence.ts` is the only module that touches OPFS or `chrome.storage.local` for DB blobs.
- [ ] `db-manager.ts` and `project-db-manager.ts` both expose `getPersistenceMode(): PersistenceMode`.
- [ ] Forcing OPFS to throw lands the SW on `"storage"` and the second boot still re-probes OPFS first.
- [ ] Forcing both to throw lands on `"memory"` and triggers BootFailureBanner.
- [ ] Persistence mode is included in every error report (step-32) and boot diagnostics blob.

## See also

- [step-10](./10-extensiondb-lifecycle.md) — ExtensionDb lifecycle
- [step-18](./18-flush-strategy.md) — Flush strategy (debounce + dirty tracking)
- [step-26](./26-chrome-storage-local-quota.md) — Quota handling
- [step-34](./34-boot-failure-banner.md) — BootFailureBanner

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
