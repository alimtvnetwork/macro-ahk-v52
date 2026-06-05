# Step 36 — Code Red Logging Rule

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The highest-severity failures have previously been logged as vague strings like “failed” or “not found,” forcing repeated debugging loops. Code Red logs must be impossible to misunderstand: exact path, exact missing item, stable reason code, detailed reasoning, and the required selector/variable diagnostic fields.

## Goal

Define when a failure is Code Red and the minimum structured fields every Code Red log must include.

## Required files

- `src/background/bg-logger.ts` — Code Red helper.
- `src/shared/logger.ts` — namespace logger implementation.
- `src/types/error-model.ts` — `FailureDiagnostic` from step-31.
- `scripts/check-code-red-diagnostics.mjs` — static guard for incomplete Code Red messages.
- `src/test/regression/code-red-logging.test.ts` — runtime shape tests.
- `.lovable/strictly-avoid.md` — must list vague Code Red logging as forbidden.

No new runtime package is required.

## What counts as Code Red

Use `level: "code-red"` for invariant or durability failures, including:

- missing bundled wasm or required built asset,
- OPFS + `chrome.storage.local` persistence both unavailable,
- SQLite bind safety violation (`BindError`),
- storage migration failure leaving state ambiguous,
- schema migration failure after DB open,
- required injection script missing or stub bytes selected for execution,
- auth contract regression that bypasses `getBearerToken()`,
- any file/path failure where the extension cannot continue safely.

Do **not** use Code Red for expected absence such as no open Lovable tab, no project selected, or no optional cache row.

## Minimum log shape

```ts
type CodeRedDiagnostic = FailureDiagnostic & {
    Level: "code-red";
    Source: string;
    Operation: string;
};

export function logCodeRed(input: CodeRedDiagnostic): void {
    RiseupAsiaMacroExt.Logger.error(input.Source, "CODE RED", {
        Level: input.Level,
        Operation: input.Operation,
        Path: input.Path,
        Missing: input.Missing,
        Reason: input.Reason,
        ReasonDetail: input.ReasonDetail,
        SelectorAttempts: input.SelectorAttempts,
        VariableContext: input.VariableContext,
    });
}
```

Mandatory fields:

| Field | Required content |
|---|---|
| `Level` | exactly `code-red` |
| `Source` | namespaced logger scope, e.g. `DB_PERSISTENCE` |
| `Operation` | what was being attempted |
| `Path` | exact file/storage/API path |
| `Missing` | exact missing item or failed outcome |
| `Reason` | stable short code |
| `ReasonDetail` | specific actionable explanation |
| `SelectorAttempts` | full array or `null` when not DOM-related |
| `VariableContext` | full array or `null` when not data-related |

## Good examples

```ts
logCodeRed({
    Level: "code-red",
    Source: "SQLJS_LOADER",
    Operation: "initialize sql.js wasm",
    Path: "chrome-extension://<id>/assets/sql-wasm.wasm",
    Missing: "bundled sql-wasm.wasm asset",
    Reason: "WasmAssetMissing",
    ReasonDetail: "HEAD probe returned 404; public/assets/sql-wasm.wasm was not copied before build",
    SelectorAttempts: null,
    VariableContext: null,
});
```

```ts
logCodeRed({
    Level: "code-red",
    Source: "SQLITE_BIND",
    Operation: "bind SQLite statement params",
    Path: "ProjectDb:proj_alpha.sqlite SQL:INSERT INTO kv(projectId,key,value)",
    Missing: "bindable value for column projectId",
    Reason: "SQLITE_BIND_ERROR",
    ReasonDetail: "paramIndex=0 column=projectId contained undefined before sql.js bind",
    SelectorAttempts: null,
    VariableContext: null,
});
```

## Rejected examples

```ts
console.error("db failed", error);
console.error("CODE RED missing file");
log("wasm not found");
```

Each rejected example is missing exact `Path`, `Missing`, `Reason`, `ReasonDetail`, or uses the wrong logger.

## Static guard

```js
// scripts/check-code-red-diagnostics.mjs
import { readFileSync } from "node:fs";
import { globSync } from "glob";

const files = globSync("src/**/*.{ts,tsx}");
const offenders = [];

for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (text.includes("CODE RED") && !text.includes("ReasonDetail")) {
        offenders.push(file);
    }
}

if (offenders.length > 0) {
    console.error("Incomplete Code Red diagnostics:");
    for (const file of offenders) {
        console.error(`- ${file}`);
    }
    process.exit(1);
}
```

This guard is intentionally conservative; tests enforce the exact runtime shape.

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| Code Red helper receives blank path | `CodeRedDiagnosticInvalid` | `CODE_RED_LOGGER` | test/build failure |
| Code Red persistence fails | `CodeRedPersistenceFailed` | `ERROR_ROUTER` | console fallback + banner if boot-critical |
| Static guard detects incomplete message | `IncompleteCodeRedDiagnostic` | CI output | build fails |

The logger helper must validate all required strings are non-empty before writing. If validation fails in production, write a secondary Code Red diagnostic naming the invalid field.

## Acceptance

- [ ] All Code Red logs use `RiseupAsiaMacroExt.Logger.error()` or `logCodeRed()`.
- [ ] Every Code Red diagnostic includes `Path`, `Missing`, `Reason`, and `ReasonDetail`.
- [ ] Every Code Red diagnostic includes `SelectorAttempts` and `VariableContext`, even when `null`.
- [ ] Static guard is wired into the validation chain from `pipeline/04-validation-scripts.md`.
- [ ] Tests reject blank `Path`, blank `Missing`, blank `Reason`, and blank `ReasonDetail`.
- [ ] `.lovable/strictly-avoid.md` forbids vague Code Red messages.

## Cross-references

- [step-09](./09-initializing-sql-js.md) — wasm missing Code Red example.
- [step-16](./16-bind-safety-proxy-net.md) — SQLite bind Code Red example.
- [step-31](./31-error-model.md) — `FailureDiagnostic` shape.
- [step-32](./32-error-routing.md) — persistence/routing for Code Red rows.
- Memory: Code Red Logging; Namespace Logging; Failure logs mandatory shape.

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
