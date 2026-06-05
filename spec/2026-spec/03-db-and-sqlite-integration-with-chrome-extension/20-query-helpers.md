# Step 20 — Query Helpers

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Centralize SQLite read/write helpers so every query uses typed bind values, deterministic statement cleanup, namespace guards, dirty marking after writes, and Code-Red logging on failure.

## Root cause this prevents

The recurring sql.js failure class is **ad-hoc query execution**: callers manually prepare statements, forget `stmt.free()`, pass `undefined` into binds, or write without calling `markDirty()`. Query helpers are the implementation seam that makes Steps 15–18 enforceable everywhere.

## Required files

- `src/background/sqlite-query-helpers.ts` — global helper functions
- `src/background/project-query-helpers.ts` — project-scoped wrapper that injects slug/namespace context
- `src/background/sqlite-bind-safety.ts` — existing Proxy net from Step 16 remains the final safety layer
- `src/shared/sql-types.ts` — `SqlValue`, `SqlRow`, and result contracts
- `src/shared/namespace.ts` — `assertNamespace()` from Step 14

No new package is required.

## Data types

```ts
export type SqlValue = string | number | bigint | boolean | Uint8Array | null;

export type SqlRow = Record<string, SqlValue>;

export type QueryContext = {
  readonly Tag: string;
  readonly Path: string;
  readonly Namespace: string | null;
};
```

`undefined` is not part of `SqlValue`. Optional values must be normalized by handler guards (`bindOpt`, `bindReq`) before reaching helpers.

## Copy-pasteable TypeScript sample

```ts
import type { Database } from "sql.js";
import { RiseupAsiaMacroExt } from "../shared/logger";
import type { QueryContext, SqlRow, SqlValue } from "../shared/sql-types";
import { assertNamespace } from "../shared/namespace";
import { markDirty } from "./db-manager";

type StatementBindValue = SqlValue[] | Record<string, SqlValue>;

function assertNoUndefinedBind(bind: StatementBindValue): void {
  const values = Array.isArray(bind) ? bind : Object.values(bind);
  for (const value of values) {
    if (value === undefined) {
      throw new TypeError("SQLite bind contains undefined; use null or bindOpt() instead");
    }
  }
}

export function selectRows(
  db: Database,
  sql: string,
  bind: StatementBindValue,
  context: QueryContext,
): SqlRow[] {
  assertNoUndefinedBind(bind);
  if (context.Namespace !== null) assertNamespace(context.Namespace);

  const stmt = db.prepare(sql);
  try {
    stmt.bind(bind);
    const rows: SqlRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as SqlRow);
    }
    return rows;
  } catch (err) {
    RiseupAsiaMacroExt.Logger.error("[sqlite-query] select failed", {
      Path: context.Path,
      Missing: "SQLite query result rows",
      Reason: "SelectFailed",
      ReasonDetail: err instanceof Error ? err.message : String(err),
      Tag: context.Tag,
      SqlPreview: sql.slice(0, 240),
    });
    throw err;
  } finally {
    stmt.free();
  }
}

export function executeWrite(
  db: Database,
  sql: string,
  bind: StatementBindValue,
  context: QueryContext,
): void {
  assertNoUndefinedBind(bind);
  if (context.Namespace !== null) assertNamespace(context.Namespace);

  const stmt = db.prepare(sql);
  try {
    stmt.bind(bind);
    stmt.step();
    markDirty();
  } catch (err) {
    RiseupAsiaMacroExt.Logger.error("[sqlite-query] write failed", {
      Path: context.Path,
      Missing: "SQLite write committed and marked dirty",
      Reason: "WriteFailed",
      ReasonDetail: err instanceof Error ? err.message : String(err),
      Tag: context.Tag,
      SqlPreview: sql.slice(0, 240),
    });
    throw err;
  } finally {
    stmt.free();
  }
}
```

## Helper rules

1. **No raw `db.prepare()` outside helpers** except schema migration files from Step 13 and bind-safety proxy internals from Step 16.
2. **Every statement is freed in `finally`.** Leaked statements hold memory in long-lived extension sessions.
3. **Writes mark dirty only after successful `stmt.step()`.** Failed writes must not schedule misleading flushes.
4. **No helper accepts `undefined`.** Optional fields become `null` at handler boundaries.
5. **Namespace-aware tables require `assertNamespace()` before query execution.** Never trust UI-provided namespace strings.
6. **No string interpolation for values.** SQL text may contain table/column constants only; values must be bound.
7. **Project helpers inject project context.** Callers should not hand-build `Path` strings for project DBs.

## Project wrapper pattern

```ts
import type { Database } from "sql.js";
import type { SqlRow, SqlValue } from "../shared/sql-types";
import { selectRows, executeWrite } from "./sqlite-query-helpers";
import { markProjectDirty } from "./project-db-manager";

export function selectProjectRows(
  db: Database,
  projectSlug: string,
  namespace: string,
  sql: string,
  bind: readonly SqlValue[],
): SqlRow[] {
  return selectRows(db, sql, [...bind], {
    Tag: "project-query",
    Path: `project-db:${projectSlug}`,
    Namespace: namespace,
  });
}

export function executeProjectWrite(
  db: Database,
  projectSlug: string,
  namespace: string,
  sql: string,
  bind: readonly SqlValue[],
): void {
  executeWrite(db, sql, [...bind], {
    Tag: "project-query",
    Path: `project-db:${projectSlug}`,
    Namespace: namespace,
  });
  markProjectDirty(projectSlug);
}
```

For project DBs, `executeProjectWrite()` MUST mark the project dirty after the write. Global `executeWrite()` marks the global DB dirty.

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| Undefined bind | `[sqlite-query] bind failed` or Step 16 `BindError` | Errors panel row with SQL preview | Caller fixes guard normalization; no retry |
| Select failed | `[sqlite-query] select failed` Code-Red when data is required | Toast only if user action is blocked | Throw to caller |
| Write failed | `[sqlite-query] write failed` Code-Red | Toast + Errors panel row | Throw; dirty flag is not marked |
| Statement cleanup failed | `[sqlite-query] cleanup failed` warning | None unless repeated | Log exact path and continue throwing original error |

Every logged failure MUST include `Path`, `Missing`, `Reason`, and `ReasonDetail`.

## Acceptance

- [ ] `rg "\.prepare\(" src/background` shows raw prepares only in `sqlite-query-helpers.ts`, schema migration files, and bind-safety internals.
- [ ] Tests prove `selectRows()` frees statements on success and failure.
- [ ] Tests prove `executeWrite()` calls `markDirty()` only after successful `stmt.step()`.
- [ ] Tests prove passing `undefined` throws before sql.js receives the bind array.
- [ ] Project write tests prove `markProjectDirty(projectSlug)` is called for project DB writes.
- [ ] All helper failures use `RiseupAsiaMacroExt.Logger.error()` and include `Path`, `Missing`, `Reason`, and `ReasonDetail`.

## See also

- [step-14](./14-per-namespace-db-pattern.md) — Namespace guard rules
- [step-15](./15-bind-safety-entry-point-guards.md) — Handler boundary normalization
- [step-16](./16-bind-safety-proxy-net.md) — Global bind-safety proxy
- [step-18](./18-flush-strategy.md) — Dirty marking and flush debounce

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

