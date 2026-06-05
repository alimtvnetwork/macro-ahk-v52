# Step 11 — Schema Declaration Pattern

## Goal

Declare every SQLite table as a named, exported `const` string in `db-schemas.ts`. No `CREATE TABLE` may live anywhere else. This is
what lets migrations (step 13), tests, and tooling import the canonical schema without booting the runtime.

## Audience

An AI agent authoring `src/background/db-schemas.ts`.

## Hard rules

1. **PascalCase identifiers everywhere.** Tables (`Logs`, `Errors`, `Sessions`, `Deployments`, `Prompts`), columns (`Id`, `SessionId`,
   `CreatedAtMs`, `ProjectId`). No `snake_case`, no `camelCase`. This matches the "Logging data contract" memory: SQLite is PascalCase,
   TypeScript DTOs are `camelCase`, the mapping layer translates.
2. **`Id INTEGER PRIMARY KEY AUTOINCREMENT`** for every table. Never use TEXT/GUID as primary key (it bloats indexes and breaks
   `last_insert_rowid()`). External identifiers (e.g. `ProjectId TEXT`) are stored as ordinary indexed columns.
3. **`CREATE TABLE IF NOT EXISTS`** and **`CREATE INDEX IF NOT EXISTS`** — so the same string can be re-run on a fresh DB or an
   existing one without error. Migrations (step 13) handle column additions.
4. **One `const` per logical group**, then a single `FULL_*_SCHEMA` aggregate exported per physical DB.
5. **Indexes co-located with their table** in the same string. Lookup performance is part of the schema, not an afterthought.
6. **No `DEFAULT CURRENT_TIMESTAMP`.** Always pass the timestamp from the caller (millis since epoch as `INTEGER`, or ISO string as
   `TEXT`). This avoids timezone drift and keeps the schema deterministic for tests. Project default: `INTEGER CreatedAtMs`.
7. **`NOT NULL` on everything that has meaning.** Nullable columns are the #1 source of bind-safety violations (step 15).

## Canonical example (mirrors existing `src/background/db-schemas.ts`)

```ts
// src/background/db-schemas.ts

/* logs.db ----------------------------------------------------------- */

const SESSIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Sessions (
    Id        INTEGER PRIMARY KEY AUTOINCREMENT,
    StartedAt TEXT NOT NULL,
    EndedAt   TEXT,
    Version   TEXT NOT NULL,
    UserAgent TEXT,
    Notes     TEXT
);`;

const LOGS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Logs (
    Id         INTEGER PRIMARY KEY AUTOINCREMENT,
    SessionId  INTEGER NOT NULL,
    Timestamp  TEXT NOT NULL,
    Level      TEXT NOT NULL,
    Source     TEXT NOT NULL,
    Category   TEXT NOT NULL,
    Action     TEXT NOT NULL,
    Detail     TEXT,
    Metadata   TEXT,
    DurationMs INTEGER,
    ProjectId  TEXT,
    ScriptId   TEXT,
    ExtVersion TEXT
);
CREATE INDEX IF NOT EXISTS IdxLogsSession   ON Logs(SessionId);
CREATE INDEX IF NOT EXISTS IdxLogsLevel     ON Logs(Level);
CREATE INDEX IF NOT EXISTS IdxLogsTimestamp ON Logs(Timestamp);
CREATE INDEX IF NOT EXISTS IdxLogsProject   ON Logs(ProjectId);
`;

export const FULL_LOGS_SCHEMA = `${SESSIONS_SCHEMA}\n${LOGS_SCHEMA}`;

/* errors.db --------------------------------------------------------- */

export const ERRORS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Errors (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    SessionId   INTEGER NOT NULL,
    Timestamp   TEXT NOT NULL,
    Level       TEXT NOT NULL,
    Source      TEXT NOT NULL,
    Category    TEXT NOT NULL,
    ErrorCode   TEXT,
    Message     TEXT NOT NULL,
    StackTrace  TEXT,
    Context     TEXT,
    Resolved    INTEGER DEFAULT 0,
    ProjectId   TEXT,
    ScriptId    TEXT,
    ExtVersion  TEXT
);
CREATE INDEX IF NOT EXISTS IdxErrorsSession  ON Errors(SessionId);
CREATE INDEX IF NOT EXISTS IdxErrorsCode     ON Errors(ErrorCode);
CREATE INDEX IF NOT EXISTS IdxErrorsResolved ON Errors(Resolved);
`;

export const ERROR_CODES_SCHEMA = `
CREATE TABLE IF NOT EXISTS ErrorCodes (
    Code        TEXT PRIMARY KEY,
    Severity    TEXT NOT NULL,
    Description TEXT NOT NULL,
    Resolution  TEXT
);`;

export const FULL_ERRORS_SCHEMA = `${ERRORS_SCHEMA}\n${ERROR_CODES_SCHEMA}`;
```

## TS DTO mapping (the "Logging data contract")

```ts
// src/shared/types/logs.ts
export interface LogRow {
    id: number;
    sessionId: number;
    timestamp: string;
    level: "info" | "warn" | "error";
    source: string;
    category: string;
    action: string;
    detail: string | null;
    metadata: string | null;
    durationMs: number | null;
    projectId: string | null;
    scriptId: string | null;
    extVersion: string | null;
}

// Mapping is centralised; handlers never read PascalCase keys directly.
export function rowToLog(r: Record<string, unknown>): LogRow {
    return {
        id: r.Id as number,
        sessionId: r.SessionId as number,
        timestamp: r.Timestamp as string,
        level: r.Level as LogRow["level"],
        source: r.Source as string,
        category: r.Category as string,
        action: r.Action as string,
        detail: (r.Detail as string | null) ?? null,
        metadata: (r.Metadata as string | null) ?? null,
        durationMs: (r.DurationMs as number | null) ?? null,
        projectId: (r.ProjectId as string | null) ?? null,
        scriptId: (r.ScriptId as string | null) ?? null,
        extVersion: (r.ExtVersion as string | null) ?? null,
    };
}
```

## Anti-patterns (auto-reject in PR review)

- `CREATE TABLE` strings inlined in `db-manager.ts`, handlers, or migrations. Must live in `db-schemas.ts`.
- `snake_case` or `camelCase` column names. Auto-rejected by `scripts/__tests__/db-schema-naming.test.mjs`.
- `Id TEXT PRIMARY KEY`. Use `INTEGER PRIMARY KEY AUTOINCREMENT` and a separate `ProjectId TEXT` if you need an external GUID.
- `DEFAULT CURRENT_TIMESTAMP`. Pass timestamps from the caller (timezone Asia/Kuala_Lumpur per core memory).
- Mixing logs and errors tables into one physical DB. Keep `FULL_LOGS_SCHEMA` and `FULL_ERRORS_SCHEMA` separate (step 10).

## Acceptance for this step

- `rg "CREATE TABLE" src --glob '!src/background/db-schemas.ts' --glob '!**/migration-v*-sql.ts'` returns zero hits.
- `rg "[a-z]_[a-z]" src/background/db-schemas.ts` returns zero hits (no snake_case).
- Every `CREATE TABLE` in `db-schemas.ts` has an `Id INTEGER PRIMARY KEY AUTOINCREMENT`.
- A round-trip test (`scripts/__tests__/db-schemas-roundtrip.test.mjs`) runs `FULL_LOGS_SCHEMA` + `FULL_ERRORS_SCHEMA` against a
  fresh `new SQL.Database()` and asserts every declared table exists.

## Cross-references

- Step 10 — `ExtensionDB.init()` consumes `FULL_LOGS_SCHEMA` / `FULL_ERRORS_SCHEMA`.
- Step 12 — schema versioning + `Deployments` table.
- Step 13 — migration runner that adds columns to these tables across versions.
- Step 15–16 — bind-safety relies on `NOT NULL` columns being non-null.
- "Logging data contract" core memory — PascalCase SQLite ↔ camelCase TS DTOs.
