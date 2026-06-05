# Step 12 — Schema Versioning and the `Deployments` Table

## Goal

Track a single integer **schema version** per physical SQLite DB, persisted *inside* the DB itself, and record every install / upgrade
/ rollback event in a `Deployments` audit table. Without this, migrations (step 13) cannot know what work has already been done and
will either re-apply destructive changes or silently skip required ones.

## Audience

An AI agent extending `db-schemas.ts` + `schema-migration.ts` (matches existing `CURRENT_SCHEMA_VERSION = 9` pattern in this project).

## Two storage locations for the version number

| Location                                  | When read                                            | When written                          |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| `chrome.storage.local["marco_schema_version"]` | Boot-time fast check before opening SQLite     | After every successful migration step |
| `Deployments.SchemaVersion` (latest row)  | Reconciliation when storage value is missing/corrupt | Always — audit log                    |

The two must agree. On mismatch, the `Deployments` row wins (it is inside the DB that owns the schema). Fix `chrome.storage.local`
to match and log a Code Red entry (exact key, expected vs found, reason).

## The `Deployments` schema

Add to `db-schemas.ts` (lives in **both** logs.db and errors.db — each physical DB tracks its own version):

```ts
export const DEPLOYMENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Deployments (
    Id            INTEGER PRIMARY KEY AUTOINCREMENT,
    SchemaVersion INTEGER NOT NULL,
    ExtVersion    TEXT NOT NULL,
    Event         TEXT NOT NULL,           -- 'install' | 'upgrade' | 'rollback' | 'reconcile'
    FromVersion   INTEGER,                 -- null on first install
    ToVersion     INTEGER NOT NULL,
    AppliedAtMs   INTEGER NOT NULL,        -- Date.now(); see timezone core memory
    DurationMs    INTEGER NOT NULL,
    Success       INTEGER NOT NULL,        -- 1 | 0
    ErrorMessage  TEXT
);
CREATE INDEX IF NOT EXISTS IdxDeploymentsAppliedAt ON Deployments(AppliedAtMs);
`;
```

Include `DEPLOYMENTS_SCHEMA` in both `FULL_LOGS_SCHEMA` and `FULL_ERRORS_SCHEMA`.

## The version constant

```ts
// src/background/schema-migration.ts
const SCHEMA_VERSION_KEY = "marco_schema_version";
export const CURRENT_SCHEMA_VERSION = 10;   // bump when adding a migration
```

`CURRENT_SCHEMA_VERSION` is the **target**. The migration runner (step 13) walks from whatever is recorded up to this number.

## Reading the current version (boot path)

```ts
// src/background/schema-migration.ts
import type { Database as SqlJsDatabase } from "sql.js";

export async function readCurrentSchemaVersion(
    db: SqlJsDatabase,
): Promise<number> {
    const fromStorage = await chrome.storage.local.get(SCHEMA_VERSION_KEY);
    const storageVer = typeof fromStorage[SCHEMA_VERSION_KEY] === "number"
        ? (fromStorage[SCHEMA_VERSION_KEY] as number)
        : null;

    const res = db.exec(
        "SELECT SchemaVersion FROM Deployments ORDER BY Id DESC LIMIT 1",
    );
    const dbVer = res.length > 0 && res[0].values.length > 0
        ? Number(res[0].values[0][0])
        : null;

    if (storageVer !== null && dbVer !== null && storageVer !== dbVer) {
        Logger.error("[schema-migration] CODE RED: version mismatch", {
            key: SCHEMA_VERSION_KEY,
            storageValue: storageVer,
            deploymentsValue: dbVer,
            reason: "chrome.storage.local drifted from Deployments table; using DB value",
        });
    }
    return dbVer ?? storageVer ?? 1;   // 1 = pre-Deployments baseline
}
```

## Writing a Deployments row (called by the migration runner)

```ts
export function recordDeployment(
    db: SqlJsDatabase,
    row: {
        schemaVersion: number;
        extVersion: string;
        event: "install" | "upgrade" | "rollback" | "reconcile";
        fromVersion: number | null;
        toVersion: number;
        durationMs: number;
        success: boolean;
        errorMessage: string | null;
    },
): void {
    db.run(
        `INSERT INTO Deployments
            (SchemaVersion, ExtVersion, Event, FromVersion, ToVersion,
             AppliedAtMs, DurationMs, Success, ErrorMessage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            row.schemaVersion,
            row.extVersion,
            row.event,
            row.fromVersion,
            row.toVersion,
            Date.now(),
            row.durationMs,
            row.success ? 1 : 0,
            row.errorMessage,
        ],
    );
    void chrome.storage.local.set({ [SCHEMA_VERSION_KEY]: row.toVersion });
}
```

## Why a row per migration step, not per boot

Every applied migration (v3→v4, v4→v5, …) gets its own row. Reasons:

1. **Resumability.** If v4→v5 succeeds but v5→v6 crashes mid-flight, the next boot reads `SchemaVersion=5` from Deployments and
   resumes from v5→v6. Without per-step rows we cannot tell where we stopped.
2. **Forensics.** The Errors panel (step 33) shows a timeline of upgrades; users can see which extension version introduced a
   migration that took 8 seconds.
3. **Rollback support (step 28).** A `rollback` event row records the down-migration, so subsequent boots know the schema is older
   than the binary expects.

## The pre-Deployments baseline (version `1`)

If neither `chrome.storage.local["marco_schema_version"]` nor a `Deployments` row exists, the DB is treated as **version 1**
(pre-Deployments). The first migration the runner applies must be the one that creates the `Deployments` table itself — a tiny
bootstrap that is allowed to live in `db-migrations.ts` rather than as a separate v1→v2 step.

```ts
// First-ever migration (idempotent)
function bootstrapDeployments(logsDb: SqlJsDatabase, errorsDb: SqlJsDatabase): void {
    logsDb.exec(DEPLOYMENTS_SCHEMA);
    errorsDb.exec(DEPLOYMENTS_SCHEMA);
}
```

## Anti-patterns (auto-reject in PR review)

- Storing the schema version **only** in `chrome.storage.local`. Wiped on uninstall/reinstall; loses sync with the DB blob restored
  from a backup.
- Storing it **only** in the DB. A corrupted DB with no readable rows leaves you unable to decide whether to migrate or to refuse to
  boot. Belt and suspenders: keep both.
- Combining all migration steps into a single Deployments row ("upgrade 3→9"). Hides per-step duration and resumability state.
- Using `Date.now()` formatted as a string. Always store `INTEGER` millis; format at display time using the Asia/Kuala_Lumpur
  timezone per core memory.
- Forgetting to bump `CURRENT_SCHEMA_VERSION` when adding a migration. Caught by `scripts/__tests__/schema-version-monotonic.test.mjs`
  (asserts the constant equals `Math.max(...MIGRATIONS.map(m => m.version))`).

## Acceptance for this step

- `Deployments` table exists in both `logs.db` and `errors.db`.
- `CURRENT_SCHEMA_VERSION` equals the highest `version` in the `MIGRATIONS` array (CI-checked).
- `recordDeployment` writes both to the DB **and** updates `chrome.storage.local` atomically (DB first, storage second; if storage
  write fails, next boot's reconcile will fix it from the DB).
- A version-mismatch test simulates the storage value drifting and asserts the DB value wins + a Code Red log is emitted.

## Cross-references

- Step 10 — `ExtensionDB.init()` calls `readCurrentSchemaVersion` before `migrateSchema`.
- Step 11 — `db-schemas.ts` hosts `DEPLOYMENTS_SCHEMA`.
- Step 13 — migration runner consumes / writes Deployments rows.
- Step 28 — cross-version rollback uses the `rollback` event row.
- "Logging data contract" core memory — `AppliedAtMs INTEGER` ↔ `appliedAtMs: number` in DTOs.
- Timezone core memory — display in Asia/Kuala_Lumpur, store as UTC millis.
