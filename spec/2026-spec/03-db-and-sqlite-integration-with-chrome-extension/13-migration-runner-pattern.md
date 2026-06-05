# Step 13 — Migration Runner Pattern

## Goal

Define the sequential, fail-fast migration runner that walks SQLite from whatever `SchemaVersion` is recorded in `Deployments`
(step 12) up to `CURRENT_SCHEMA_VERSION` (step 12). Every step is atomic, idempotent at the boundary, and audited via a
`Deployments` row.

## Audience

An AI agent authoring `src/background/schema-migration.ts` against the registry pattern already used in this project
(`migration-v2-sql.ts` … `migration-v9-sql.ts`).

## Runner contract (hard rules)

1. **Sequential only.** Apply `v→v+1`, then `v+1→v+2`, never skip. No parallelism, no batching across versions.
2. **Fail-fast, no auto-retry.** On the first failed step, abort, write a `Deployments` row with `Success=0` + the error message,
   re-throw to `boot.ts`. Subsequent boots resume at the last successful version. (Honors core "No-Retry Policy" memory.)
3. **One transaction per step.** Wrap `up()` in `BEGIN`/`COMMIT`. On throw, `ROLLBACK`. SQLite (sql.js) supports nested savepoints,
   but step authors should not rely on them — keep each `up()` a single transaction.
4. **No DML in migrations unless required.** Prefer schema-only changes. If data backfill is necessary, do it in the same step and
   document the cost in `description`.
5. **`down()` is mandatory but may throw `NotSupported`** for irreversible changes (e.g. column drops). The runner records the
   throw as `event: 'rollback'`, `Success=0`. Rollback is opt-in (step 28), never automatic.
6. **No network, no async I/O inside `up`/`down`.** sql.js is synchronous; mixing async work breaks the transaction boundary.

## File: `src/background/schema-migration.ts` (canonical skeleton)

```ts
import type { Database as SqlJsDatabase } from "sql.js";
import { Logger } from "../shared/logger";
import { readCurrentSchemaVersion, recordDeployment } from "./schema-version";

export interface Migration {
    version: number;                // target version this step produces
    description: string;
    up: (logsDb: SqlJsDatabase, errorsDb: SqlJsDatabase) => void;
    down: (logsDb: SqlJsDatabase, errorsDb: SqlJsDatabase) => void;
}

export const CURRENT_SCHEMA_VERSION = 10;

const MIGRATIONS: Migration[] = [
    // import per-version step modules; keep ordered by `version`
    // { version: 2, description: "...", up: applyV2Up, down: applyV2Down },
    // { version: 3, ... }, ...
];

export async function migrateSchema(
    logsDb: SqlJsDatabase,
    errorsDb: SqlJsDatabase,
    extVersion: string,
): Promise<void> {
    const fromVersion = await readCurrentSchemaVersion(errorsDb);
    if (fromVersion === CURRENT_SCHEMA_VERSION) {
        return;
    }
    if (fromVersion > CURRENT_SCHEMA_VERSION) {
        Logger.error("[schema-migration] schema is newer than binary", {
            fromVersion, target: CURRENT_SCHEMA_VERSION,
            reason: "user downgraded extension; refusing to mutate",
        });
        throw new Error(`Schema v${fromVersion} > binary v${CURRENT_SCHEMA_VERSION}`);
    }

    const pending = MIGRATIONS
        .filter((m) => m.version > fromVersion && m.version <= CURRENT_SCHEMA_VERSION)
        .sort((a, b) => a.version - b.version);

    let cursor = fromVersion;
    for (const step of pending) {
        const start = Date.now();
        logsDb.exec("BEGIN");
        errorsDb.exec("BEGIN");
        try {
            step.up(logsDb, errorsDb);
            logsDb.exec("COMMIT");
            errorsDb.exec("COMMIT");
        } catch (err) {
            try { logsDb.exec("ROLLBACK"); } catch { /* noop */ }
            try { errorsDb.exec("ROLLBACK"); } catch { /* noop */ }
            recordDeployment(errorsDb, {
                schemaVersion: cursor,
                extVersion,
                event: cursor === 1 ? "install" : "upgrade",
                fromVersion: cursor,
                toVersion: step.version,
                durationMs: Date.now() - start,
                success: false,
                errorMessage: err instanceof Error ? err.message : String(err),
            });
            Logger.error("[schema-migration] step failed", {
                fromVersion: cursor, toVersion: step.version,
                description: step.description, error: err,
            });
            throw err; // fail-fast; no retry
        }
        recordDeployment(errorsDb, {
            schemaVersion: step.version,
            extVersion,
            event: cursor === 1 && step.version === 2 ? "install" : "upgrade",
            fromVersion: cursor,
            toVersion: step.version,
            durationMs: Date.now() - start,
            success: true,
            errorMessage: null,
        });
        cursor = step.version;
    }
}
```

## File layout for individual steps

```text
src/background/
├── schema-migration.ts        # runner + registry only
├── migration-v2-sql.ts        # exports applyV2Up, applyV2Down + raw SQL constants
├── migration-v3-sql.ts
├── ...
└── migration-v10-sql.ts
```

Each `migration-vN-sql.ts` exports:

```ts
export function applyVNUp(logsDb: SqlJsDatabase, errorsDb: SqlJsDatabase): void {
    logsDb.exec(`ALTER TABLE Logs ADD COLUMN NewColumn TEXT;`);
}
export function applyVNDown(logsDb: SqlJsDatabase, errorsDb: SqlJsDatabase): void {
    // SQLite cannot DROP COLUMN before 3.35; recreate the table or throw:
    throw new Error("NotSupported: v10→v9 drops Logs.NewColumn");
}
```

Splitting one file per version makes diff review trivial and lets tests load each step in isolation.

## Idempotency notes

- `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` are always safe to re-run.
- `ALTER TABLE … ADD COLUMN` is **not** idempotent — re-running throws "duplicate column". Guard with a probe before adding:

  ```ts
  function hasColumn(db: SqlJsDatabase, table: string, col: string): boolean {
      const r = db.exec(`PRAGMA table_info(${table})`);
      if (r.length === 0) { return false; }
      return r[0].values.some((row) => row[1] === col);
  }

  if (hasColumn(logsDb, "Logs", "NewColumn") === false) {
      logsDb.exec(`ALTER TABLE Logs ADD COLUMN NewColumn TEXT;`);
  }
  ```

- Renames before SQLite 3.25 require table recreation (`CREATE NEW`, `INSERT … SELECT`, `DROP OLD`, `ALTER RENAME`). Pattern used in
  this project's `migration-v4-sql.ts`.

## Anti-patterns (auto-reject in PR review)

- `async`/`await` inside `up`/`down`. sql.js is sync; awaits break the transaction.
- Catching the error inside the step and continuing. Violates fail-fast; the next boot will misread the version.
- Mutating `MIGRATIONS` at runtime (e.g. `.push` from a feature flag). The list must be deterministic at build time.
- A step that targets `version: N` without bumping `CURRENT_SCHEMA_VERSION` to `N`. Caught by
  `scripts/__tests__/schema-version-monotonic.test.mjs`.
- "Helpful" auto-retry on transient errors. Banned by core memory; the next boot is the retry.

## Acceptance for this step

- [ ] The implementation satisfies the `Step 13 — Migration Runner Pattern` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- A fresh DB (no `Deployments` rows) boots, runs all migrations 2..CURRENT, writes N successful `Deployments` rows.
- A DB at `SchemaVersion=5` boots into a binary with `CURRENT_SCHEMA_VERSION=10` and applies exactly steps 6,7,8,9,10.
- Forcing `applyV8Up` to throw leaves `SchemaVersion=7` recorded and re-throws to `boot.ts`. The next boot resumes from 7→8.
- A DB at `SchemaVersion=10` booting into a binary with `CURRENT_SCHEMA_VERSION=9` throws "schema is newer than binary" and does
  **not** mutate the DB.
- Unit tests under `scripts/__tests__/schema-migration-*.test.mjs` cover: fresh install, partial resume, downgrade-refuse, idempotent
  column add.

## Cross-references

- Step 11 — `FULL_*_SCHEMA` declarations consumed on first install.
- Step 12 — `Deployments` table + `readCurrentSchemaVersion` / `recordDeployment` helpers.
- Step 15–16 — bind-safety wrapping happens BEFORE the runner is invoked (step 10) so migrations also benefit.
- Step 28 — cross-version rollback consumer.
- "No-Retry Policy" core memory — justifies fail-fast.

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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](readme.md) for sibling specs and cross-references.
