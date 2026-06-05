# Step 07 — Required NPM Packages and the No-Remote-Fetch Rule

## Goal

Pin the exact npm packages this spec depends on, and forbid every alternative that would force a remote fetch at runtime. Manifest V3 CSP
(`script-src 'self' 'wasm-unsafe-eval'`) blocks remote scripts; the Chrome Web Store reviewer rejects extensions that fetch executable
code at runtime. Bundling is non-negotiable.

## Audience

An AI agent installing dependencies into a fresh Vite + TypeScript MV3 extension.

## Required packages (exact)

| Package        | Version          | Why                                                                  | Where it is used                          |
| -------------- | ---------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `sql.js`       | `^1.14.0`        | SQLite compiled to WebAssembly. Only viable SQLite engine in MV3.    | `db-manager.ts`, `db-persistence.ts`      |
| `idb`          | `^8.0.3`         | Tiny promise wrapper over IndexedDB. Avoids hand-written request/onsuccess boilerplate. | `shared/storage/indexeddb.ts`, snapshot, injection cache |
| `@types/sql.js`| matching minor   | TypeScript types for `Database`, `SqlValue`, `Statement`.            | All files importing `sql.js`              |

Install:

```bash
npm install sql.js@^1.14.0 idb@^8.0.3
npm install -D @types/sql.js
```

Do **not** add `better-sqlite3`, `wa-sqlite`, `absurd-sql`, `dexie`, `localforage`, `pouchdb`, or `lokijs`. See "rejected alternatives" below.

## The no-remote-fetch rule

The following are **banned at runtime**, enforced by CSP and by a CI grep (step 39):

1. **No CDN URLs for wasm or JS.** `https://cdn.jsdelivr.net/npm/sql.js/...` is blocked by `script-src 'self'`. The wasm must be
   copied into `public/assets/sql-wasm.wasm` at build time (step 08).
2. **No `fetch()` of executable code.** `fetch('/some.js').then(r => r.text()).then(eval)` is banned; CSP blocks `eval` anyway.
3. **No dynamic `import()` of remote URLs.** Only relative imports resolved at build time are allowed.
4. **No `new Function(...)`.** Blocked by CSP and by lint rule `no-new-func`.
5. **No `<script src="https://...">` injection.** Even from a content script into the page, this is a Web Store policy violation when
   used to load extension logic.

The only network calls allowed are to user-controlled APIs (the product's backend), and they must never return code — only data.

## Why `sql.js` and not the alternatives

| Candidate                | Why rejected                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `better-sqlite3`         | Native Node addon. Cannot run in a browser / service worker. No wasm build.                                                   |
| `wa-sqlite`              | Requires SharedArrayBuffer + COOP/COEP headers, which extensions cannot set for `chrome-extension://` pages. DX is fragile.   |
| `absurd-sql`             | Depends on `wa-sqlite` + OPFS in a worker; unavailable in MV3 service worker; extra build complexity for marginal speed.      |
| `sql.js` (chosen)        | Pure wasm, no special headers, runs in SW, popup, options, content-script-isolated, and (via injection) MAIN world.           |

## Why `idb` and not raw IndexedDB or Dexie

| Candidate            | Why rejected / chosen                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Raw `indexedDB.open` | Verbose; every request needs `onsuccess`/`onerror` wiring; easy to forget transaction lifetimes. Error-prone in SW.   |
| `dexie`              | Bigger surface, query DSL, hooks. Overkill — we only need `get`, `put`, `delete` for the snapshot + injection cache.  |
| `idb` (chosen)       | ~1 KB, promise wrapper, zero DSL, works in SW. Matches existing pattern in `src/background/injection-cache.ts`.       |

## CI gates that enforce this step

(Full test definitions in step 39.)

- `scripts/__tests__/no-remote-script-loads.test.mjs` — greps `src/` for `cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`,
  `https://...\.wasm`, `https://...\.js`. Fails on any hit outside comments/tests.
- `scripts/__tests__/no-eval.test.mjs` — greps for `new Function(`, `\beval\(`, `setTimeout\(['"\`]`, `setInterval\(['"\`]` (string-form timers).
- `scripts/__tests__/banned-storage-deps.test.mjs` — fails if `package.json` declares `better-sqlite3`, `wa-sqlite`, `absurd-sql`,
  `dexie`, `localforage`, `pouchdb`, or `lokijs`.

## Acceptance for this step

- [ ] The implementation satisfies the `Step 07 — Required NPM Packages and the No-Remote-Fetch Rule` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- `package.json` contains exactly the three packages above (`sql.js`, `idb`, `@types/sql.js`) for storage. No other SQLite/IndexedDB dep.
- `npm ls sql.js idb` shows the resolved versions match the table above (no duplicates from transitive deps).
- CI greps in step 39 pass.
- The Chrome Web Store review checklist item "No remote code" is satisfiable.

## Cross-references

- Step 05 — CSP that makes remote fetch impossible.
- Step 08 — bundling `sql-wasm.wasm` (consumer of `sql.js`).
- Step 22 — IndexedDB wrapper (consumer of `idb`).
- Step 39 — CI gates that enforce this step.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

