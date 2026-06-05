# Step 10 — `ExtensionDB` Lifecycle

## Goal

Define the single owner object for every SQLite database the extension uses. The lifecycle is: **init → migrate → expose handles → debounced flush → graceful shutdown**. Every handler in `src/background/handlers/` must read/write SQLite **only** through the
handles this class exposes — never via fresh `new SQL.Database()` calls.

## Audience

An AI agent assembling `src/background/db-manager.ts` (singleton) on top of `sqljs-loader.ts` (step 09).

## Lifecycle phases

```text
[SW wakes]
   │
   ├── 1. init()              once-per-worker; idempotent
   │     ├── loadSqlJs        (step 09)
   │     ├── loadFromStorage  hydrate Uint8Array from IndexedDB/chrome.storage.local (step 17)
   │     ├── new SQL.Database(bytes)   or new SQL.Database() if no snapshot
   │     ├── wrapBindSafety   (step 15–16)
   │     └── migrateSchema    (step 13)
   │
   ├── 2. getLogsDb()/getErrorsDb()    synchronous handle accessors
   │
   ├── 3. markDirty()          called by every mutating handler
   │     └── schedules debounced flush (5 s)
   │
   ├── 4. flushIfDirty()       persists Database.export() to storage (step 18)
   │
   └── 5. onbeforeunload / chrome.runtime.onSuspend
         └── flushIfDirty()    final synchronous-style flush
```

## File: `src/background/db-manager.ts` (canonical skeleton)

```ts
import type { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
import initSqlJs from "./sqljs-loader";
import { migrateSchema } from "./schema-migration";
import { FULL_LOGS_SCHEMA, FULL_ERRORS_SCHEMA } from "./db-schemas";
import { loadFromStorage, flushToStorage } from "./db-persistence";
import { wrapDatabaseWithBindSafety } from "./sqlite-bind-safety";
import { Logger } from "../shared/logger";

const DB_NAMES = { logs: "marco-logs.db", errors: "marco-errors.db" } as const;
const FLUSH_DEBOUNCE_MS = 5_000;

let SQL: SqlJsStatic | null = null;
let logsDb: SqlJsDatabase | null = null;
let errorsDb: SqlJsDatabase | null = null;
let isInitialized = false;
let isDirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export interface DbManager {
    getLogsDb(): SqlJsDatabase;
    getErrorsDb(): SqlJsDatabase;
    markDirty(): void;
    flushIfDirty(): Promise<void>;
}

export async function init(): Promise<void> {
    if (isInitialized === true) {
        return;
    }
    SQL = await initSqlJs();

    const logsBytes = await loadFromStorage(DB_NAMES.logs);
    const errorsBytes = await loadFromStorage(DB_NAMES.errors);

    const rawLogsDb = logsBytes !== null ? new SQL.Database(logsBytes) : new SQL.Database();
    const rawErrorsDb = errorsBytes !== null ? new SQL.Database(errorsBytes) : new SQL.Database();

    logsDb = wrapDatabaseWithBindSafety(rawLogsDb, "logs");
    errorsDb = wrapDatabaseWithBindSafety(rawErrorsDb, "errors");

    migrateSchema(logsDb, FULL_LOGS_SCHEMA);
    migrateSchema(errorsDb, FULL_ERRORS_SCHEMA);

    isInitialized = true;
}

export function getLogsDb(): SqlJsDatabase {
    if (logsDb === null) {
        throw new Error("[db-manager] getLogsDb() before init()");
    }
    return logsDb;
}

export function getErrorsDb(): SqlJsDatabase {
    if (errorsDb === null) {
        throw new Error("[db-manager] getErrorsDb() before init()");
    }
    return errorsDb;
}

export function markDirty(): void {
    isDirty = true;
    if (flushTimer !== null) {
        return;
    }
    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushIfDirty();
    }, FLUSH_DEBOUNCE_MS);
}

export async function flushIfDirty(): Promise<void> {
    if (isDirty === false) {
        return;
    }
    isDirty = false;
    try {
        if (logsDb !== null) {
            await flushToStorage(DB_NAMES.logs, logsDb.export());
        }
        if (errorsDb !== null) {
            await flushToStorage(DB_NAMES.errors, errorsDb.export());
        }
    } catch (err) {
        isDirty = true; // re-queue
        Logger.error("[db-manager] flushIfDirty failed", { error: err });
        throw err;
    }
}
```

## Why exactly this shape

1. **Two physical databases, not one** — Logs are append-heavy + prunable (step 35); Errors are smaller but critical. Separating them
   means a corrupt logs DB never takes down the errors panel, and pruning logs does not lock the errors DB. Matches the existing
   `marco-logs.db` / `marco-errors.db` split in this project.
2. **Module-scoped singletons, not a class instance** — The SW will be killed and reloaded; instance state is moot. Module scope is
   the simplest way to express "lives as long as this worker lives".
3. **`wrapDatabaseWithBindSafety` happens BEFORE `migrateSchema`** — Migrations themselves use `db.run(sql, params)`; they must also
   benefit from the bind-safety net (step 15–16) that strips `undefined` and coerces unsupported types.
4. **`markDirty()` schedules; it does not flush** — Flushing on every mutation thrashes IndexedDB. A 5 s debounce keeps the SW awake
   long enough to coalesce 100s of writes into one snapshot.
5. **Re-queue on flush failure** — If `flushToStorage` throws (quota exceeded, IDB transaction abort), set `isDirty = true` so the
   next mutation re-arms the timer. Never swallow.

## Anti-patterns (auto-reject in PR review)

- `new SQL.Database()` outside `init()`. Creates an orphan DB that is never persisted.
- `db.exec(sql)` from a handler without the handle going through `getLogsDb()`. Bypasses bind-safety.
- Calling `flushIfDirty()` from a tight loop. Use `markDirty()`; the debounce is the contract.
- Catching the `getLogsDb()` "before init" error and returning a fresh DB. Hides a real boot-order bug.
- Holding the `SqlJsDatabase` reference inside a closure that outlives the SW restart. The reference dangles.

## Acceptance for this step

- `init()` is idempotent: calling it twice returns the same promise effect; no second wasm fetch.
- `getLogsDb()` / `getErrorsDb()` throw a clear error if called before `init()`.
- `markDirty()` followed by a 6 s wait results in exactly one `flushToStorage` call per DB.
- Killing the SW between `markDirty()` and the debounce window loses at most 5 s of writes (acceptable for logs/errors; the
  `chrome.runtime.onSuspend` hook in `boot.ts` will catch most of these — see step 18).
- Unit test in `scripts/__tests__/db-manager-lifecycle.test.mjs` verifies init→mutate→flush→export round-trips data.

## Cross-references

- Step 09 — `sqljs-loader` consumed by `init()`.
- Step 11 — `FULL_LOGS_SCHEMA`, `FULL_ERRORS_SCHEMA` (db-schemas.ts).
- Step 13 — `migrateSchema` runner.
- Step 15–16 — `wrapDatabaseWithBindSafety`.
- Step 17 — `loadFromStorage` / `flushToStorage` (persistence backends).
- Step 18 — flush strategy (debounce + `onSuspend`).
- Step 34 — `BootFailureBanner` consumes init errors.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../01-prompt-spec/reference/05-runtime-defaults.md). If a value differs, the SOT wins.
