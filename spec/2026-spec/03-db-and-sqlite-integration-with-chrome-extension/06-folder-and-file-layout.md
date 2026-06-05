# Step 06 — Folder and File Layout

## Goal

Give the implementing agent an exact, copy-pasteable folder layout for all storage-related code. Every later step refers to files by these
paths; if you place code somewhere else, the bind-safety net (step 15–16), the error router (step 32), and the CI gates (step 39) will not
find it.

## Audience

An AI agent starting from a fresh Vite + TypeScript + MV3 Chrome extension scaffold.

## Canonical layout

```text
extension-root/
├── manifest.json
├── public/
│   └── assets/
│       └── sql-wasm.wasm                # bundled wasm, served from extension origin (step 08)
├── src/
│   ├── background/                      # service worker code only
│   │   ├── index.ts                     # SW entry; imports boot.ts
│   │   ├── boot.ts                      # ordered init: db-manager → migrations → handlers
│   │   ├── db-manager.ts                # ExtensionDB singleton + lifecycle (step 10)
│   │   ├── db-schemas.ts                # CREATE TABLE statements, one const per table (step 11)
│   │   ├── db-persistence.ts            # IndexedDB snapshot backend (step 17)
│   │   ├── db-migrations.ts             # ordered migration list + runner (step 13)
│   │   ├── db-namespaces.ts             # per-namespace DB resolver (step 14)
│   │   ├── sqlite-bind-safety.ts        # entry guards + Proxy net (step 15–16)
│   │   ├── injection-cache.ts           # IndexedDB cache for compiled scripts (step 23)
│   │   ├── error-router.ts              # routes thrown errors to logging tables (step 32)
│   │   └── handlers/                    # message handlers (read/write SQLite on behalf of UIs)
│   ├── shared/
│   │   ├── storage/
│   │   │   ├── chrome-storage.ts        # typed wrapper over chrome.storage.local (step 25)
│   │   │   ├── local-storage.ts         # typed wrapper for UI-only ephemeral state (step 27)
│   │   │   └── indexeddb.ts             # promise wrapper for raw IndexedDB stores (step 22)
│   │   ├── error-model.ts               # CaughtError, ErrorCode enum (step 31)
│   │   └── logger.ts                    # namespace Logger (Logger.error, no bare log())
│   ├── options/                         # UI: Errors panel reads from logging tables (step 33)
│   ├── popup/
│   ├── content-scripts/                 # isolated-world bridge (step 29–30)
│   └── components/
│       └── BootFailureBanner.tsx        # step 34
└── scripts/
    └── __tests__/
        ├── db-schema-grants.test.mjs    # CI gate (step 39)
        ├── no-localstorage-in-sw.test.mjs
        └── sqlite-bind-safety.test.mjs
```

## Why these exact paths

- **`src/background/`** is the service-worker boundary. Anything that imports DOM or `localStorage` belongs **outside** this folder.
  CI greps for forbidden symbols here (step 39).
- **`public/assets/sql-wasm.wasm`** is the only correct place for the wasm. Vite copies `public/` verbatim, and
  `web_accessible_resources` (step 05) exposes it at `chrome-extension://<id>/assets/sql-wasm.wasm`.
- **`db-schemas.ts` separate from `db-manager.ts`** so migrations (step 13) can import the canonical CREATE statements without
  pulling in the runtime singleton.
- **`shared/storage/`** centralises every storage API. No file outside this folder may call `chrome.storage.local.get` or
  `indexedDB.open` directly. This is what makes the four-tier matrix (step 04) enforceable.
- **`handlers/`** is the only place that mutates SQLite at runtime. The Errors panel (step 33), the popup, and content scripts all
  talk to handlers via `chrome.runtime.sendMessage`, never directly to `db-manager.ts`.

## File-creation order (matches step ordering)

The agent must create files in this order so each step compiles against the previous one:

1. `manifest.json` (step 05)
2. `public/assets/sql-wasm.wasm` (step 08, copied from npm package — do not author by hand)
3. `src/shared/error-model.ts` (step 31)
4. `src/shared/logger.ts` (uses error-model)
5. `src/shared/storage/{chrome-storage,local-storage,indexeddb}.ts` (steps 22, 25, 27)
6. `src/background/db-schemas.ts` (step 11)
7. `src/background/db-persistence.ts` (step 17)
8. `src/background/db-manager.ts` (step 10)
9. `src/background/sqlite-bind-safety.ts` (step 15–16)
10. `src/background/db-migrations.ts` (step 13)
11. `src/background/db-namespaces.ts` (step 14)
12. `src/background/injection-cache.ts` (step 23)
13. `src/background/error-router.ts` (step 32)
14. `src/background/handlers/*` (consumer code)
15. `src/background/boot.ts` then `src/background/index.ts`
16. `src/components/BootFailureBanner.tsx` (step 34)
17. `scripts/__tests__/*.test.mjs` (step 39)

## Naming rules (must match across files)

- File names: `kebab-case.ts`.
- Exported singletons: `extensionDb`, `errorRouter`, `injectionCache` (lowerCamelCase).
- Exported classes: `ExtensionDB`, `ErrorRouter`, `InjectionCache` (PascalCase).
- SQL identifiers (tables, columns): `PascalCase` (`Errors`, `Deployments`, `CreatedAtMs`). This matches the project's existing
  SQLite convention and the "Logging data contract" memory (PascalCase in SQLite, camelCase in TS DTOs).
- Constants: `SCREAMING_SNAKE_CASE` with prefixes (`SQL_CREATE_ERRORS`, `IDB_STORE_SNAPSHOT`, `STORAGE_KEY_LAST_FLUSH_MS`).

## Anti-patterns (auto-reject in PR review)

- A new `src/background/utils.ts` that calls `indexedDB.open` directly — must go through `shared/storage/indexeddb.ts`.
- Storage code under `src/components/` or `src/pages/` — UI must call handlers, not storage APIs.
- `sql-wasm.wasm` placed under `src/assets/` (Vite would hash it and break the SW fetch URL).
- Mixing migrations into `db-manager.ts`. Keep them in `db-migrations.ts` so the migration test (step 13) can import them in isolation.

## Acceptance for this step

- [ ] The implementation satisfies the `Step 06 — Folder and File Layout` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- `tree src/background src/shared/storage public/assets` matches the layout above (file names may differ if a step has not been
  reached yet; folders must exist).
- `rg "indexedDB\.open|chrome\.storage\.local\." src --glob '!src/shared/storage/**'` returns zero hits.
- `rg "sql-wasm\.wasm" src public` returns exactly one path: `public/assets/sql-wasm.wasm`.

## Cross-references

- Step 05 — MV3 constraints that justify `public/assets/` + `web_accessible_resources`.
- Step 08 — bundling `sql-wasm.wasm` (consumer of `public/assets/`).
- Step 10 — `ExtensionDB` lifecycle (consumer of `db-manager.ts`).
- Step 39 — CI gates (consumer of the grep rules above).

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
