# Step 16 — Bind Safety Proxy Net

## Goal

Wrap every public sql.js `Database` handle in a Proxy that rejects `undefined` bind parameters before they cross the WASM boundary.
This turns sql.js's cryptic native bind failure into a typed `BindError` that names the parameter index, inferred column, and SQL preview.

## Root cause this step catches

Step 15 prevents known bad inputs at handler entry points. This step catches the cases that still slip through: dynamic SQL builders,
new handlers without complete tests, prepared statement paths, and accidental direct `db.run` / `db.exec` calls. The root cause remains an
`undefined` value inside the bind array; the Proxy makes the failure deterministic and actionable.

## Required files

| File | Responsibility |
| --- | --- |
| `src/background/sqlite-bind-safety.ts` | Defines `BindError`, `assertBindable`, and `wrapDatabaseWithBindSafety`. |
| `src/background/db-manager.ts` | Wraps `logsDb` and `errorsDb` at `buildManager()` accessor boundary. |
| `src/background/project-db-manager.ts` | Wraps project DB handles in `getProjectDb()` / manager `getDb()`. |
| `src/test/regression/sqlite-bind-safety.test.ts` | Locks down DB Proxy, Statement Proxy, error shape, and pass-through behavior. |

No additional packages are required; this is plain TypeScript + `Proxy`.

## `BindError` contract

```ts
export class BindError extends Error {
    public readonly paramIndex: number;
    public readonly columnName: string;
    public readonly sqlPreview: string;

    constructor(paramIndex: number, columnName: string, sqlPreview: string) {
        super(
            `[SQLite BindError] param index ${paramIndex} (column "${columnName}") is undefined. ` +
            `Coerce to null via bindOpt() or supply a fallback via bindReq() before binding. ` +
            `SQL: ${sqlPreview}`,
        );
        this.name = "BindError";
        this.paramIndex = paramIndex;
        this.columnName = columnName;
        this.sqlPreview = sqlPreview;
    }
}
```

The message must include `bindOpt()` and `bindReq()` so remediation is visible in crash reports and the Errors panel.

## `assertBindable` contract

```ts
export function assertBindable<T extends ReadonlyArray<WireBindValue>>(
    sql: string,
    params: T,
): T {
    if (!params || params.length === 0) {
        return params;
    }
    const columns = inferColumnNames(sql);
    for (let i = 0; i < params.length; i += 1) {
        if (params[i] === undefined) {
            throw new BindError(i, columns[i] ?? `<param ${i}>`, previewSql(sql));
        }
    }
    return params;
}
```

Only `undefined` is forbidden. `null` is valid SQLite input and must pass through unchanged.

## Column-name inference

`inferColumnNames(sql)` is best effort, not a SQL parser. It must handle the shapes used in the codebase:

- `INSERT INTO Foo (A, B, C) VALUES (?, ?, ?)` → `A`, `B`, `C`
- `INSERT OR REPLACE INTO Foo (A, B) VALUES (?, ?)` → `A`, `B`
- `UPDATE Foo SET A = ?, B = ? WHERE Id = ?` → `A`, `B`, `Id`
- `SELECT * FROM Foo WHERE A = ? AND B = ?` → `A`, `B`
- `DELETE FROM Foo WHERE A = ?` → `A`
- Unknown SQL shape → `<param N>` fallback

Long SQL must be flattened and truncated to roughly 120 characters so logs remain readable.

## Database Proxy skeleton

```ts
import type { Database as SqlJsDatabase, Statement } from "sql.js";

type BindParams = Parameters<SqlJsDatabase["run"]>[1];

export function wrapDatabaseWithBindSafety(db: SqlJsDatabase): SqlJsDatabase {
    return new Proxy(db, {
        get(target, prop, receiver) {
            if (prop === "run") {
                return function wrappedRun(sql: string, params?: BindParams): SqlJsDatabase {
                    if (Array.isArray(params) && params.length > 0) {
                        assertBindable(sql, params as ReadonlyArray<WireBindValue>);
                    }
                    target.run(sql, params);
                    return receiver as SqlJsDatabase;
                };
            }

            if (prop === "exec") {
                return function wrappedExec(sql: string, params?: BindParams) {
                    if (Array.isArray(params) && params.length > 0) {
                        assertBindable(sql, params as ReadonlyArray<WireBindValue>);
                    }
                    return (target.exec as ExecWithParams)(sql, params);
                };
            }

            if (prop === "prepare") {
                return function wrappedPrepare(sql: string): Statement {
                    return wrapStatementWithBindSafety(target.prepare(sql), sql);
                };
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}
```

`db.run()` must return the wrapper, not the raw DB, so chained calls cannot escape the safety layer.

## Statement Proxy skeleton

```ts
function wrapStatementWithBindSafety(stmt: Statement, sql: string): Statement {
    return new Proxy(stmt, {
        get(target, prop, receiver) {
            if (prop === "bind") {
                return function wrappedBind(params?: BindParams): boolean {
                    if (Array.isArray(params) && params.length > 0) {
                        assertBindable(sql, params as ReadonlyArray<WireBindValue>);
                    }
                    return target.bind(params);
                };
            }

            if (prop === "run") {
                return function wrappedStatementRun(params?: BindParams): void {
                    if (Array.isArray(params) && params.length > 0) {
                        assertBindable(sql, params as ReadonlyArray<WireBindValue>);
                    }
                    target.run(params);
                };
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}
```

Prepared statements are mandatory coverage because many query helpers use `prepare` + `bind` instead of `db.run`.

## Where wrapping happens

Wrap at accessor boundaries, not at raw persistence boundaries:

```ts
function buildManager(): DbManager {
    const wrappedLogs = wrapDatabaseWithBindSafety(logsDb!);
    const wrappedErrors = wrapDatabaseWithBindSafety(errorsDb!);
    return {
        getLogsDb: () => wrappedLogs,
        getErrorsDb: () => wrappedErrors,
        getPersistenceMode: () => persistenceMode,
        flushIfDirty,
        markDirty,
    };
}

export function getProjectDb(slug: string): SqlJsDatabase {
    const db = projectDbs.get(slug);
    if (!db) {
        throw new Error(`[project-db] Not initialized: ${slug}`);
    }
    return wrapDatabaseWithBindSafety(db);
}
```

Raw DB instances stay raw for internal `export()`, `close()`, flush, and persistence code paths; consumers receive only wrapped handles.

## Error routing

Do not catch `BindError` inside `sqlite-bind-safety.ts`. Let the message router / caller classify it as a programming failure.

Expected visible detail:

- `name`: `BindError`
- `paramIndex`: zero-based bind position
- `columnName`: inferred column or `<param N>`
- `sqlPreview`: flattened first ~120 chars of SQL
- remediation text: `bindOpt()` / `bindReq()`

This is intentionally louder than step 15's clean missing-field response because a `BindError` means handler guard coverage is incomplete.

## Anti-patterns (auto-reject in PR review)

- Returning raw `logsDb`, `errorsDb`, or project DB handles from public accessors.
- Wrapping only `db.run` while forgetting `db.exec(sql, params)` and `prepare().bind()`.
- Treating `null` as invalid. `null` is the correct SQLite representation for optional values.
- Catching `BindError` and retrying with `null`. That hides the missing handler guard and violates fail-fast behavior.
- Recreating a new Proxy for every single call inside hot loops. Cache wrapped handles at manager/accessor level where possible.

## Acceptance for this step

- [ ] The implementation satisfies the `Step 16 — Bind Safety Proxy Net` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- `wrapDatabaseWithBindSafety(db).run(sql, ["x", undefined])` throws `BindError` and the raw DB receives zero calls.
- `exec(sql, params)` is covered even though sql.js typings commonly declare only `exec(sql)`.
- `prepare(sql).bind(params)` and `prepare(sql).run(params)` both reject `undefined` before delegating.
- `close`, `export`, and other untouched methods still pass through unchanged.
- Error messages include param index, inferred column, SQL preview, and the `bindOpt` / `bindReq` guidance.
- Regression tests in `src/test/regression/sqlite-bind-safety.test.ts` cover insert, update, select, delete, unknown SQL fallback, null pass-through, and pass-through methods.

## Cross-references

- Step 10 — `db-manager.ts` lifecycle and accessor boundaries.
- Step 15 — entry-point guards that should prevent most `BindError`s.
- Step 20 — prepared statement helpers must rely on wrapped handles.
- Step 31 — `BindError` belongs in the shared error model.
- Step 32–33 — routing and Errors panel presentation for escaped bind failures.
