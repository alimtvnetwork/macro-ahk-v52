# 16 — Storage SQLite Pointer

## Why this step exists

The Chrome-extension feature spec needs SQLite, error logs, diagnostics, and
storage rules, but duplicating the full storage design here creates drift. The
authoritative implementation contract lives in the sibling storage spec:

```text
spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/
```

This file is the binding pointer: it names the exact storage decisions that the
feature specs rely on and states which sibling files are mandatory before an AI
implements SQLite-backed features.

## Contract

1. **Do not re-spec SQLite here.** This step points to the authoritative storage
   spec and records only the integration obligations for feature steps 07–15.
2. **Background-only SQLite.** Content scripts, page MAIN world, popup UI,
   options UI, and the floating panel never import sql.js or DB managers.
3. **Bundled WASM only.** `sql-wasm.wasm` ships with the extension. No CDN,
   remote fetch, base64 inline wasm, or debug wasm in production.
4. **CSP is conditional.** Add `'wasm-unsafe-eval'` to extension-page CSP only
   when sql.js is actually bundled. Pure-JS extensions must not add it.
5. **PascalCase SQLite, central normalization.** SQLite tables and columns use
   PascalCase. Frontend DTOs may be camelCase only after a central mapper.
6. **No `undefined` bind values.** All SQL parameters pass through bind guards or
   the global bind-safety proxy before reaching sql.js.
7. **Persistence waterfall.** Durable DB persistence follows OPFS →
   `chrome.storage.local` fallback → memory-only degraded mode.
8. **Memory-only is visible.** If the extension falls back to memory-only mode,
   status and boot-failure surfaces must show that diagnostics are not durable.
9. **No storage PascalCase migration.** Existing `chrome.storage.local` project
   object keys are preserved; do not rewrite stored JSON casing.
10. **No retry loops.** Storage init, migration, and flush failures are
    sequential and fail-fast with typed Code Red diagnostics.

## Mandatory sibling files

Read these sibling files before implementing any SQLite-backed feature:

| Need | Authoritative file |
|---|---|
| Tier selection | `02-four-tier-storage-decision-matrix.md` |
| MV3 service-worker constraints | `05-mv3-constraints.md` |
| Folder layout | `06-folder-and-file-layout.md` |
| `sql.js` dependency and no remote fetch | `07-required-packages-and-no-remote-fetch.md` |
| WASM bundling | `08-bundling-sql-wasm.md` |
| Runtime `initSqlJs` loader | `09-initializing-sql-js.md` |
| DB lifecycle | `10-extensiondb-lifecycle.md` |
| PascalCase schema declarations | `11-schema-declaration-pattern.md` |
| Migrations | `13-migration-runner-pattern.md` |
| Per-namespace DB pattern | `14-per-namespace-db-pattern.md` |
| Bind safety | `15-bind-safety-entry-point-guards.md`, `16-bind-safety-proxy-net.md` |
| Persistence and flush | `17-persistence-backends.md`, `18-flush-strategy.md` |
| Query helpers | `20-query-helpers.md` |
| Error routing / panel | `31-error-model.md`, `32-error-routing.md`, `33-errors-panel-ui-hookup.md` |
| Boot failure | `34-boot-failure-banner.md` |
| Retention | `35-logging-tables-and-retention.md` |
| CI and acceptance | `38-testing.md`, `39-ci-gates.md`, `40-acceptance-criteria.md` |

## Integration points for this feature folder

| Feature step | SQLite dependency |
|---|---|
| Step 07 Status panel | Reads DB mode, migration status, last flush, and error counts via background status route. |
| Step 11 Error logging discipline | Requires structured `Logs` / `Errors` tables and JSON-safe diagnostic fields. |
| Step 12 Namespace logger | Writes through background logger into SQLite; no UI direct writes. |
| Step 13 Errors panel | Reads normalized `Errors` rows and updates resolved state through background routes. |
| Step 14 Boot failure banner | Shows WASM, OPFS, migration, schema, and flush failures. |
| Step 15 Floating panel | May display status and errors but must not import DB/storage managers. |

## Packaging and manifest obligations

If SQLite is enabled:

```json
{
  "permissions": ["storage", "unlimitedStorage"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  "web_accessible_resources": [
    { "resources": ["assets/sql-wasm.wasm"], "matches": ["<all_urls>"] }
  ]
}
```

Rules:

- `unlimitedStorage` is required when durable SQLite/OPFS storage is a core
  product feature; omit it only for tiny demo extensions.
- `assets/sql-wasm.wasm` is stable and un-hashed when using the recommended
  public-asset copy strategy.
- Never add `'unsafe-eval'`, `'unsafe-inline'`, remote script sources, `data:`,
  or `blob:` script sources.
- The manifest must not request `<all_urls>` host permissions solely for SQLite;
  the `web_accessible_resources.matches` entry does not grant page access.

## Runtime loader obligation

```ts
// src/background/storage/sqlite/sql-loader.ts
import initSqlJs, { SqlJsStatic } from "sql.js";

let sqlInitPromise: Promise<SqlJsStatic> | null = null;

export function getSqlJs(): Promise<SqlJsStatic> {
  if (sqlInitPromise == null) {
    sqlInitPromise = initSqlJs({
      locateFile: (file) => chrome.runtime.getURL(`assets/${file}`),
    });
  }
  return sqlInitPromise;
}
```

Rules:

- Memoize the init promise once per service-worker lifetime.
- Probe `chrome.runtime.getURL("assets/sql-wasm.wasm")` during boot so missing
  asset failures become BootFailureBanner data, not silent blank UI.
- Missing or truncated wasm logs Code Red with path
  `chrome-extension://<id>/assets/sql-wasm.wasm`, missing
  `sql-wasm.wasm`, and reason `SqlWasmAssetMissing` or
  `SqlWasmAssetTruncated`.

## Data ownership boundaries

Only these modules may open or mutate SQLite handles:

- background DB manager,
- migration runner,
- logger/error store,
- query helper layer,
- diagnostic export builder,
- test fixtures.

Forbidden import paths:

- `src/content/**` importing `sql.js`, `db-manager`, or SQLite helpers,
- `src/pages/**` importing `sql.js`, `db-manager`, or SQLite helpers,
- `src/components/**` importing `sql.js`, `db-manager`, or SQLite helpers,
- any page MAIN-world SDK importing extension DB code.

UI contexts communicate with background routes only.

## Required Code Red reasons

| Reason | Required fields |
|---|---|
| `SqlWasmAssetMissing` | `path`, `missing="sql-wasm.wasm"`, URL/status detail |
| `SqlWasmAssetTruncated` | `path`, `missing="release sql-wasm.wasm"`, byte length detail |
| `SqlJsInitFailed` | `path="background://storage/sqlite/sql-loader"`, thrown message |
| `OpfsUnavailable` | exact OPFS path or API name, browser capability detail |
| `SqliteMigrationFailed` | `sqlite://<DbName>/<Table>#<MigrationId>` |
| `SqliteSchemaMismatch` | `sqlite://<DbName>/<Table>#schema-check` |
| `SqliteBindUndefined` | SQL preview, param index, inferred column when available |
| `SqliteFlushFailed` | persistence target path, pending dirty state detail |
| `SqliteMemoryOnlyMode` | fallback reason and durability warning |

All storage failures must preserve `Reason` and `ReasonDetail` through step 13
error routes and step 14 support reports.

## CI gates

The implementing project must include guard checks equivalent to:

```text
sql-wasm-shipped        public/assets/sql-wasm.wasm exists and is release-sized
no-remote-wasm          no CDN/unpkg/jsdelivr/sql-wasm remote URL references
sqlite-background-only  no UI/content/page imports of sql.js or DB managers
sqlite-bind-safety      no raw undefined can reach SQL bind APIs
schema-drift           declared schema matches migration output
storage-casing          no PascalCase rewrite of chrome.storage.local project JSON
```

Guard failures must output exact path, missing item, `Reason`, and
`ReasonDetail`.

## Pitfalls

- Copying sql.js snippets that fetch wasm from a CDN; MV3 CSP and store review
  reject it.
- Placing `sql-wasm.wasm` under `src/assets` and letting the bundler hash it;
  diagnostics and manifest resources become unstable.
- Importing SQLite from popup/options/panel code because it is “just a read”.
  Reads still cross privilege and lifecycle boundaries; use background routes.
- Treating OPFS support as permanent. Probe every boot and surface fallback mode.
- Resetting the flush debounce timer on every write. Use fixed debounce windows
  so append-heavy logs still flush.
- Rewriting existing `chrome.storage.local` objects to PascalCase while adding
  SQLite. This breaks existing consumers.

## Acceptance criteria

- [ ] The implementing AI reads the mandatory sibling files listed above before
      writing SQLite code.
- [ ] `public/assets/sql-wasm.wasm` exists, is release-sized, and is copied into
      the extension build.
- [ ] Loader uses `chrome.runtime.getURL("assets/sql-wasm.wasm")` and memoizes
      `initSqlJs()`.
- [ ] Manifest CSP contains `'wasm-unsafe-eval'` iff SQLite is enabled.
- [ ] No remote wasm or CDN fallback exists.
- [ ] UI/content/page code imports zero SQLite or DB-manager modules.
- [ ] SQLite identifiers are PascalCase and frontend normalization is central.
- [ ] Bind-safety tests prove `undefined` cannot reach sql.js.
- [ ] OPFS fallback to `chrome.storage.local` and memory-only mode are tested.
- [ ] Memory-only mode appears in status and boot-failure diagnostics.
- [ ] Error rows and support exports include storage `Reason` and `ReasonDetail`.
- [ ] Storage CI gates pass with exact-path Code Red output on failure.

## Cross-references

- Step 02 — MV3 CSP and storage-at-a-glance.
- Step 07 — status fields that expose DB health.
- Step 11 — failure diagnostic shape.
- Step 13 — Errors panel reads SQLite via background routes.
- Step 14 — BootFailureBanner owns boot-critical storage failures.
- Sibling storage spec — authoritative SQLite, IndexedDB, and storage rules.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every extension numeric (alarm intervals, debounce ms, retry counts=0, sentinel TTL, badge text limits) to a constant in `src/shared/constants.ts` or a local `*-defaults.ts` module. Inline literals are rejected by code review.
- **MUST** gate auto-injector and project-matcher with `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` — never run on `about:blank`, `chrome://newtab/`, or empty URLs (see `mem://features/new-tab-no-url-guard`).
- **MUST** route every failure through `RiseupAsiaMacroExt.Logger.error` with `Reason`+`ReasonDetail` and surface boot-time failures via `BootFailureBanner`. Bare `console.error` is rejected by `public/logger-compliance-audit.json`.
- **MUST** pair every `setInterval` / `setTimeout` / `MutationObserver` / event listener with a teardown registered on `pagehide` (see `mem://standards/timer-and-observer-teardown`). Tick UIs MUST pause on `document.hidden`.

## Pitfalls / Counter-examples

- ❌ `catch (caught) { /* ignore */ }` around `chrome.runtime.sendMessage`. ✅ `Logger.error('scope', 'send failed', caught)` and re-throw (see `public/error-swallow-audit.json`).
- ❌ Calling `chrome.scripting.executeScript` on a new-tab URL because the matcher did not gate it. ✅ Always call `isNewTabOrBlankUrl(tab.url)` first; treat true as a non-error skip.
- ❌ Storing a timestamp as `new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })`. ✅ Store `Date.now()` ms UTC; render with `Intl.DateTimeFormat().resolvedOptions().timeZone` (see `mem://localization/timezone`).
- ❌ Retrying `fetch` with `for (let i=0;i<3;i++)` and exponential backoff after a 4xx/5xx. ✅ Use `httpFetchOrThrow` / `httpFailFast` from `src/shared/http-fail-fast.ts`; one attempt, then halt (see `.lovable/checklists/http-fail-fast.md`).
- ❌ Injecting the same content-script twice because the sentinel check was skipped. ✅ Read `#marco-css-sentinel` / data-attribute sentinel before re-injection (see `09-injection-idempotency-sentinel.md`).

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](readme.md) for sibling specs and cross-references.
