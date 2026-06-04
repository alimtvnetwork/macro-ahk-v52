# Step 15 — Bind Safety Entry Point Guards

## Goal

Stop missing or malformed message fields **before** a handler obtains a SQLite handle, so `undefined` can never reach sql.js from a
known entry point. This is the first line of defense; step 16 is the global safety net.

## Root cause this step prevents

sql.js throws the native message `Wrong API use : tried to bind a value of an unknown type (undefined)` when a `?` parameter is
`undefined`. The real project already hit this failure class in SQLite-backed message handlers. The root cause is not sql.js; it is
unguarded request payloads such as `{ type: "KV_GET", key: "k" }` reaching code like:

```ts
db.exec("SELECT Value FROM ProjectKv WHERE ProjectId = ? AND Key = ?", [msg.projectId, msg.key]);
```

The fix is to validate required fields at the handler boundary and coerce optional binds to `null` or a fallback before the DB call.

## Required files

| File | Responsibility |
| --- | --- |
| `src/background/handlers/handler-guards.ts` | Single source of truth for `requireProjectId`, `requireKey`, `requireSlug`, `requireField`, `missingFieldError`, `bindOpt`, `bindReq`, `safeBind`. |
| `src/background/handlers/*-handler.ts` | Call guards at the top of every DB-backed handler. Do not call `getLogsDb()`, `getErrorsDb()`, or `getProjectDb()` first. |
| `src/test/regression/handler-guards.test.ts` | Regression suite proving missing fields return clean errors and leave the fake DB untouched. |
| `src/background/sqlite-bind-safety.ts` | Step 16 fallback layer that catches any missed `undefined` bind. |

No additional packages are required.

## Guard contract

### Required field guards

Required string fields must be non-empty strings:

```ts
export function requireProjectId(value: WireValue): string | null;
export function requireKey(value: WireValue): string | null;
export function requireSlug(value: WireValue): string | null;
export function requireField(value: WireValue): string | null;
```

`WireValue` is a message-boundary value type, not a storage type. Keep it local to the guard module; do not spread loose request
payloads through business logic.

### Error response

Every missing required field returns the same shape:

```ts
export interface HandlerErrorResponse {
    isOk: false;
    errorMessage: string;
}

export function missingFieldError(field: string, op: string): HandlerErrorResponse {
    return {
        isOk: false,
        errorMessage: `[${op}] Missing or invalid '${field}' (expected non-empty string)`,
    };
}
```

This keeps the message router on the normal `{ isOk: false }` path instead of generating crash spam in the Errors panel.

### Optional bind coercion

SQLite accepts `null`, not `undefined`:

```ts
export function bindOpt(value: WireValue): string | null {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    return typeof value === "string" ? value : String(value);
}

export function bindReq(value: WireValue, fallback: string): string {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return typeof value === "string" ? value : String(value);
}
```

Use `bindOpt` for nullable columns and `bindReq` for `NOT NULL` columns where an empty fallback is explicitly acceptable.

## Canonical handler pattern

Use this structure for every DB-backed handler:

```ts
import type { MessageRequest } from "../../shared/messages";
import {
    bindOpt,
    missingFieldError,
    requireKey,
    requireProjectId,
    type HandlerErrorResponse,
} from "./handler-guards";

type KvSetRequest = MessageRequest & {
    projectId?: string;
    key?: string;
    value?: string | number | boolean | null;
};

export async function handleKvSet(
    msg: MessageRequest,
): Promise<{ isOk: true } | HandlerErrorResponse> {
    const raw = msg as KvSetRequest;
    const projectId = requireProjectId(raw.projectId);
    const key = requireKey(raw.key);

    if (!projectId) {
        return missingFieldError("projectId", "kv:set");
    }
    if (!key) {
        return missingFieldError("key", "kv:set");
    }

    const value = bindOpt(raw.value) ?? "";
    const db = getDb();
    db.run(
        `INSERT OR REPLACE INTO ProjectKv (ProjectId, Key, Value, UpdatedAt)
         VALUES (?, ?, ?, datetime('now'))`,
        [projectId, key, value],
    );
    markDirty();
    return { isOk: true };
}
```

Order matters: validate → coerce → obtain DB → execute SQL → mark dirty.

## `safeBind` usage

`safeBind` is reserved for dynamic parameter arrays where one bind expression cannot be inspected column-by-column:

```ts
db.run(sql, safeBind(params, "project-api:insert", { allowUndefined: false }));
```

Rules:

- Prefer explicit `require*`, `bindOpt`, and `bindReq` at the handler boundary.
- Use `allowUndefined: false` in tests and in dynamic SQL builders where undefined indicates a programming error.
- Do not use default silent coercion as a blanket substitute for missing-field validation.

## Error model

| Failure | Surface | Meaning |
| --- | --- | --- |
| Missing required field | `{ isOk: false, errorMessage: "[op] Missing or invalid 'field' ..." }` | Caller sent an invalid request; DB must not be touched. |
| Undefined in `safeBind(..., { allowUndefined: false })` | `SqliteBindError` | Dynamic bind builder produced an undefined slot. |
| Undefined that escapes all guards | `BindError` from step 16 | Handler guard coverage is incomplete; fix the entry point. |

Do not log these as bare strings. If an error is escalated to the router, preserve the operation name and field name so the Errors
panel can show the exact failed request path.

## Anti-patterns (auto-reject in PR review)

- Calling `getLogsDb()`, `getErrorsDb()`, or `getProjectDb()` before required fields are validated.
- Passing raw `msg.*` values directly into a SQL parameter array.
- Using `value || ""` for required fields; it hides `0`, `false`, and malformed payloads.
- Converting optional values with `String(value)` without handling `undefined` first; this stores the literal string `"undefined"`.
- Catching a `BindError` and returning success. It is a programming error, not a recoverable user action.

## Acceptance for this step

- `src/test/regression/handler-guards.test.ts` proves that missing `projectId`, `key`, `group`, `filename`, `fileId`, and equivalent
  required fields return `isOk: false` with `[op]` in the message.
- The same tests prove the fake DB call log has zero `run`, `exec`, or `prepare` calls for invalid requests.
- Every new SQLite-backed handler has a matching missing-field test before it ships.
- Grep check: DB-backed handlers do not bind optional `msg.*` values without `bindOpt`, `bindReq`, or a domain-specific validator.
- A deliberate invalid request never produces the native sql.js `Wrong API use` message.

## Cross-references

- Step 10 — DB accessors are the only sanctioned handles.
- Step 11 — `NOT NULL` columns determine where `bindReq` is required.
- Step 16 — global Proxy net that catches missed undefined binds.
- Step 20 — query helpers must call these guards before prepared statements.
- Step 31–33 — error model, routing, and Errors panel display for escalated failures.
