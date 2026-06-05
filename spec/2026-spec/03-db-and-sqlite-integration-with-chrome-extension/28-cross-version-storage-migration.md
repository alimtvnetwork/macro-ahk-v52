# Step 28 — Cross-Version Storage Migration

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

Storage failures have repeatedly come from mixing two unrelated migration ideas: SQLite schema migrations, which are versioned and safe, and browser storage shape rewrites, which can silently corrupt existing `chrome.storage.local` consumers. The fix is a narrow migration runner that migrates only explicitly registered keys, is idempotent, and **never performs the forbidden PascalCase rewrite of existing storage objects**.

## Goal

Provide a fail-fast migration runner for cross-version storage changes while preserving legacy camelCase `chrome.storage.local` keys and keeping SQLite migrations separate from storage-object migrations.

## Required files

- `src/background/storage-migrations.ts` — versioned runner for non-SQLite browser storage migrations.
- `src/background/service-worker-main.ts` or boot entry — calls `runStorageMigrations()` before DB managers and injection cache boot.
- `src/background/storage/chrome-local.ts` — wrapper used by migrations; no direct `chrome.storage.local` calls in migration bodies.
- `scripts/check-no-storage-pascalcase-rewrite.mjs` — guard from step-25 remains mandatory.
- `src/background/__tests__/storage-migrations.test.ts` — idempotency and failure tests.

No new runtime package is required.

## Migration boundaries

| Data | Migration mechanism | Notes |
|---|---|---|
| SQLite schema | step-13 schema migration runner | Uses `PRAGMA user_version` / app schema version table |
| OPFS SQLite bytes | none directly | Open DB, run SQLite migrations, flush via step-18 |
| `chrome.storage.local` settings | this step | Explicit allowlist only |
| IndexedDB cache entries | clear/rebuild preferred | Cache is derived, not migrated |
| localStorage page-origin keys | forbidden | Owned by page/app, not extension migration |

## Canonical runner

```ts
type StorageMigrationContext = {
    fromVersion: string;
    toVersion: string;
    read: <T>(key: string) => Promise<T | null>;
    write: <T>(key: string, value: T) => Promise<void>;
    remove: (key: string) => Promise<void>;
};

type StorageMigration = {
    id: string;
    introducedIn: string;
    description: string;
    run: (context: StorageMigrationContext) => Promise<void>;
};

const STORAGE_SCHEMA_VERSION_KEY = "marco_storage_schema_version";

const MIGRATIONS: readonly StorageMigration[] = [
    {
        id: "2026-06-normalize-debug-toggle",
        introducedIn: "3.50.0",
        description: "Ensure verboseLogging is boolean without changing project object key casing.",
        async run(context) {
            const settings = await context.read<{ verboseLogging?: boolean }>("marco_settings");
            if (settings === null) {
                return;
            }
            await context.write("marco_settings", {
                ...settings,
                verboseLogging: settings.verboseLogging === true,
            });
        },
    },
];

export async function runStorageMigrations(toVersion: string): Promise<void> {
    const fromVersion = await readChromeLocal<string>(STORAGE_SCHEMA_VERSION_KEY) ?? "0.0.0";
    const context: StorageMigrationContext = {
        fromVersion,
        toVersion,
        read: readChromeLocal,
        write: writeChromeLocal,
        remove: removeChromeLocal,
    };

    for (const migration of MIGRATIONS) {
        if (isVersionAfter(migration.introducedIn, fromVersion)) {
            await migration.run(context);
        }
    }

    await writeChromeLocal(STORAGE_SCHEMA_VERSION_KEY, toVersion);
}
```

## Non-negotiable rules

1. **Idempotent only.** Running the same migration twice must leave the same state.
2. **Sequential and fail-fast.** Do not parallelize migrations; do not retry or back off.
3. **No whole-store rewrites.** Migrations read/write named keys only.
4. **No PascalCase project rewrite.** Existing `StoredProject` and `marco_projects` key shapes remain untouched unless a migration targets one scalar field without changing casing.
5. **No deletion of authoritative data.** Deletes are allowed only for derived caches explicitly named disposable in step-26.
6. **Write schema version last.** Never mark a migration complete before all writes finish.
7. **Log exact paths.** Every failure includes storage key, migration id, missing item, `Reason`, and `ReasonDetail`.

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| Migration throws | `StorageMigrationFailed` | `RiseupAsiaMacroExt.Logger.error("Storage.Migration", ...)` | BootFailureBanner if boot cannot continue |
| Forbidden PascalCase rewrite found | `ForbiddenStoragePascalCaseRewrite` | CI failure | build fails |
| Schema version write fails | `StorageSchemaVersionWriteFailed` | Code Red storage log | BootFailureBanner if persistence state is ambiguous |
| Cache migration requested | `DerivedCacheMigrationRejected` | migration test failure / CI | build fails |

Log shape:

```ts
RiseupAsiaMacroExt.Logger.error("Storage.Migration", "storage migration failed", {
    Path: `chrome.storage.local:${key}`,
    Missing: "successfully migrated storage key",
    Reason: "StorageMigrationFailed",
    ReasonDetail: `migrationId=${migration.id}; from=${fromVersion}; to=${toVersion}`,
});
```

## Acceptance

- [ ] `runStorageMigrations()` runs once during service-worker boot before DB/cache initialization.
- [ ] Every migration has a stable `id`, `introducedIn`, and test coverage.
- [ ] Running migrations twice is a no-op on the second run.
- [ ] `scripts/check-no-storage-pascalcase-rewrite.mjs` is still in CI and fails on PascalCase rewrite attempts.
- [ ] No migration reads or writes page `localStorage`.
- [ ] No migration changes IndexedDB cache rows except by calling the clear-cache API from step-24.
- [ ] Failure logs include exact storage key path, missing item, `Reason`, and `ReasonDetail`.

## Cross-references

- [step-13](./13-migration-runner-pattern.md) — SQLite schema migration runner; do not merge it with storage migrations.
- [step-24](./24-indexeddb-invalidation.md) — derived IndexedDB caches are cleared, not migrated.
- [step-25](./25-chrome-storage-local-usage.md) — wrapper and camelCase preservation rules.
- [step-26](./26-chrome-storage-local-quota.md) — disposable-key list.
- Core memory: No Storage PascalCase Migration; no-retry policy; Code Red exact path logging.

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
