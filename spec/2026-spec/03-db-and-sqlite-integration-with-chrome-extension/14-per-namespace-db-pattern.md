# Step 14 — Per-Namespace DB Pattern

## Goal

Let independent feature areas ("namespaces" — e.g. `System.Logs`, `System.Errors`, `Recorder`, `Prompts`) own logically separate
SQLite content **without** spinning up one physical sql.js `Database` per namespace. Physical DBs are expensive (each holds a
~2 MB wasm heap slice + its own snapshot blob); namespaces are cheap (one `Namespace TEXT` column + index).

This mirrors the project memory **"Namespace database creation — dot-separated namespaces, max 25, `System.*` reserved"**.

## Audience

An AI agent adding a new feature that needs structured storage but does not justify a new physical DB.

## The rule

| Need                                                            | Choice                                            |
| --------------------------------------------------------------- | ------------------------------------------------- |
| Append-heavy logs, retention-pruned, separable from errors      | Physical DB (`logs.db`)                           |
| Critical audit data, must survive logs-DB corruption            | Physical DB (`errors.db`)                         |
| Anything else (feature KV, per-project blobs, recorder state)   | **Namespace inside `errors.db`** (or `logs.db`)   |

Default: namespace. Adding a third physical DB requires a written justification in `plan.md`.

## Namespace format (hard constraints, from core memory)

- Dot-separated identifiers: `System.Logs`, `System.Errors`, `Recorder`, `Prompts.Json`, `Prompts.Html`.
- Each segment matches `^[A-Z][A-Za-z0-9]*$` (PascalCase, no underscores/hyphens).
- `System.*` is **reserved** for built-in infrastructure (Logs, Errors, Deployments, ScriptAudit).
- Hard ceiling: **25 distinct namespaces** per physical DB. Enforced at insert time and CI.

## Schema pattern

Every namespaced table includes a `Namespace TEXT NOT NULL` column and an index on it:

```sql
CREATE TABLE IF NOT EXISTS NamespacedKv (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    Namespace   TEXT NOT NULL,
    Key         TEXT NOT NULL,
    Value       TEXT NOT NULL,
    UpdatedAtMs INTEGER NOT NULL,
    UNIQUE (Namespace, Key)
);
CREATE INDEX IF NOT EXISTS IdxNamespacedKvNs ON NamespacedKv(Namespace);
```

For richer per-namespace shapes (Recorder steps, Prompt rows) the table stays singular; the `Namespace` column scopes the rows.

## Resolver / guard

```ts
// src/background/db-namespaces.ts
import { Logger } from "../shared/logger";

const NAMESPACE_RE = /^[A-Z][A-Za-z0-9]*(\.[A-Z][A-Za-z0-9]*)*$/;
const SYSTEM_RESERVED = ["System.Logs", "System.Errors", "System.Deployments", "System.ScriptAudit"];
const MAX_NAMESPACES_PER_DB = 25;

export function assertNamespace(ns: string, allowSystem: boolean): void {
    if (NAMESPACE_RE.test(ns) === false) {
        Logger.error("[db-namespaces] CODE RED: invalid namespace", {
            value: ns, expectedShape: "PascalCase.PascalCase[.PascalCase]",
            reason: "namespace identifier rejected by NAMESPACE_RE",
        });
        throw new Error(`Invalid namespace: ${ns}`);
    }
    if (allowSystem === false && ns.startsWith("System.") === true) {
        throw new Error(`Namespace ${ns} is reserved for built-in infrastructure`);
    }
}

export function assertWithinNamespaceCeiling(distinctCount: number): void {
    if (distinctCount > MAX_NAMESPACES_PER_DB) {
        throw new Error(
            `Too many namespaces (${distinctCount} > ${MAX_NAMESPACES_PER_DB}). ` +
            `Promote one to a physical DB or consolidate.`,
        );
    }
}
```

## Read / write helpers

```ts
// src/background/handlers/namespaced-kv-handler.ts
import { getErrorsDb, markDirty } from "../db-manager";
import { assertNamespace } from "../db-namespaces";

export function putKv(ns: string, key: string, value: string): void {
    assertNamespace(ns, false);
    const db = getErrorsDb();
    db.run(
        `INSERT INTO NamespacedKv (Namespace, Key, Value, UpdatedAtMs)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(Namespace, Key) DO UPDATE SET Value=excluded.Value, UpdatedAtMs=excluded.UpdatedAtMs`,
        [ns, key, value, Date.now()],
    );
    markDirty();
}

export function getKv(ns: string, key: string): string | null {
    assertNamespace(ns, true);
    const db = getErrorsDb();
    const r = db.exec(
        `SELECT Value FROM NamespacedKv WHERE Namespace = ? AND Key = ? LIMIT 1`,
        [ns, key],
    );
    if (r.length === 0 || r[0].values.length === 0) {
        return null;
    }
    return String(r[0].values[0][0]);
}

export function listNamespaceKeys(ns: string): string[] {
    assertNamespace(ns, true);
    const db = getErrorsDb();
    const r = db.exec(`SELECT Key FROM NamespacedKv WHERE Namespace = ? ORDER BY Key`, [ns]);
    return r.length === 0 ? [] : r[0].values.map((row) => String(row[0]));
}
```

## When to promote a namespace to a physical DB

Promote only when **all** of these are true:

1. Row count routinely exceeds **10⁵** within a week.
2. The data has independent retention (e.g. logs at 7 days vs. errors forever).
3. Corruption in this namespace would compromise the host DB if co-located.

If any of those is false, stay namespaced. Promotion implies a migration (step 13) that copies rows out and a `Deployments` event
documenting the split.

## Anti-patterns (auto-reject in PR review)

- `new SQL.Database()` for a new feature without justification in `plan.md`. Use a namespace instead.
- Skipping `assertNamespace` — invalid namespaces leak into indexes and rot the table.
- Using `System.*` from feature code. Reserved for infrastructure.
- Looking up rows by `Key` alone, ignoring `Namespace`. Collides across features.
- Removing the `UNIQUE (Namespace, Key)` constraint to "support multiple values". Use a child table instead.

## Acceptance for this step

- [ ] The implementation satisfies the `Step 14 — Per-Namespace DB Pattern` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- `assertNamespace` rejects `recorder` (lowercase), `System.Foo` from non-system caller, `Foo_Bar` (underscore).
- Inserting into a 26th namespace throws and is logged Code Red.
- A handler reading namespace `X` never sees rows from namespace `Y` (test fixture verifies isolation).
- CI greps for `new SQL.Database` outside `db-manager.ts` and `__tests__/`: zero hits.

## Cross-references

- Step 10 — `getErrorsDb()` / `getLogsDb()` are the only sanctioned handles.
- Step 11 — schema declaration including the `Namespace` column.
- Step 13 — migrations that introduce or promote namespaces.
- Step 35 — retention pruning may be namespace-scoped (`WHERE Namespace=?`).
- Core memory "Namespace database creation" — source of the 25-cap + `System.*` rules.

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
