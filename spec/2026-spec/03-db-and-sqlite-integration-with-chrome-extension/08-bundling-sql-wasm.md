# Step 08 — Bundling `sql-wasm.wasm`

## Goal

Get the `sql-wasm.wasm` binary out of the `sql.js` npm package and into the extension build so that `sql.js` can locate it at runtime
via the `chrome-extension://<id>/assets/sql-wasm.wasm` URL. This step is the single biggest source of "SQLite mysteriously doesn't load
in production" bugs — do it exactly as specified.

## Audience

An AI agent that has already run `npm install sql.js@^1.14.0` (step 07) and set up the folder layout (step 06).

## Where the wasm lives in the npm package

After install:

```text
node_modules/sql.js/dist/
├── sql-wasm.js          # JS loader (the module you `import`)
├── sql-wasm.wasm        # the binary we must ship
├── sql-wasm-browser.js  # do NOT use — assumes a bundler-injected URL
└── sql-wasm-debug.wasm  # do NOT ship in production builds
```

The file we ship is **`sql-wasm.wasm`** (release build, smaller, no debug symbols).

## The two acceptable bundling strategies

### Strategy A — Static copy via Vite `publicDir` (recommended)

1. Place the wasm under `public/assets/sql-wasm.wasm` so Vite copies it verbatim into `dist/assets/sql-wasm.wasm`.
2. Automate the copy in `package.json` so a `npm install` upgrade of `sql.js` keeps the wasm in sync:

   ```json
   {
     "scripts": {
       "postinstall": "node scripts/copy-sql-wasm.mjs",
       "prebuild": "node scripts/copy-sql-wasm.mjs"
     }
   }
   ```

3. `scripts/copy-sql-wasm.mjs`:

   ```js
   // scripts/copy-sql-wasm.mjs
   import { copyFileSync, mkdirSync, statSync } from 'node:fs';
   import { dirname, resolve } from 'node:path';
   import { fileURLToPath } from 'node:url';

   const HERE = dirname(fileURLToPath(import.meta.url));
   const SRC = resolve(HERE, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
   const DEST = resolve(HERE, '..', 'public', 'assets', 'sql-wasm.wasm');

   try {
     statSync(SRC);
   } catch {
     console.error('[copy-sql-wasm] CODE RED: missing source wasm at', SRC,
       '— reason: sql.js not installed or version mismatch. Run `npm install sql.js`.');
     process.exit(1);
   }

   mkdirSync(dirname(DEST), { recursive: true });
   copyFileSync(SRC, DEST);
   console.log('[copy-sql-wasm] copied', SRC, '→', DEST);
   ```

   The error message follows the Code Red logging rule (exact path, missing item, reason — see core memory).

4. Declare the asset in `manifest.json` so content scripts can also resolve it if ever needed:

   ```json
   "web_accessible_resources": [
     { "resources": ["assets/sql-wasm.wasm"], "matches": ["<all_urls>"] }
   ]
   ```

5. At runtime (step 09) point `sql.js` at the extension-relative URL:

   ```ts
   import initSqlJs from 'sql.js';
   const SQL = await initSqlJs({
     locateFile: (file) => chrome.runtime.getURL(`assets/${file}`),
   });
   ```

   `chrome.runtime.getURL('assets/sql-wasm.wasm')` resolves to
   `chrome-extension://<id>/assets/sql-wasm.wasm`, served by the extension itself — no network.

### Strategy B — Vite `?url` import (acceptable for SPA-style builds only)

```ts
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
const SQL = await initSqlJs({ locateFile: () => wasmUrl });
```

Pros: no `postinstall` script. Cons: Vite hashes the filename (`sql-wasm.<hash>.wasm`), which means the file is **not** at a stable
URL. This breaks `web_accessible_resources` matching by exact filename and breaks the Code Red diagnostic "is this file shipped?".
**Choose Strategy A** unless you have a specific reason.

## Anti-patterns (auto-reject in PR review)

1. **`locateFile` pointing at a CDN.**
   ```ts
   // FORBIDDEN — blocked by CSP and Web Store policy
   const SQL = await initSqlJs({
     locateFile: (f) => `https://cdn.jsdelivr.net/npm/sql.js/dist/${f}`,
   });
   ```
2. **Shipping `sql-wasm-debug.wasm` in production.** 2–3x larger, leaks symbols, slower init.
3. **Placing the wasm under `src/assets/`.** Vite would hash it, and `manifest.json` would not be able to declare a stable
   `web_accessible_resources` entry.
4. **Forgetting `web_accessible_resources`.** The SW can still fetch from the extension origin without it, but content scripts cannot
   — and the diagnostic surface becomes asymmetric. Always declare it.
5. **Inlining the wasm as base64.** Bloats every JS chunk that touches `sql.js` by ~1.5 MB and forces `'unsafe-eval'`. Banned.

## Failure modes and exact error messages

If `sql.js` cannot locate the wasm, you will see one of:

- `RuntimeError: Aborted(both async and sync fetching of the wasm failed)`
- `TypeError: Failed to fetch dynamically imported module: chrome-extension://.../sql-wasm.wasm`

When you see either, check in order:
1. `dist/assets/sql-wasm.wasm` exists after build (`ls dist/assets/sql-wasm.wasm`).
2. `manifest.json` lists `assets/sql-wasm.wasm` under `web_accessible_resources`.
3. `locateFile` returns `chrome.runtime.getURL('assets/sql-wasm.wasm')`, not a relative path like `./sql-wasm.wasm` (resolves against
   the SW URL, which is `chrome-extension://<id>/background/index.js` → wrong).
4. The CSP includes `'wasm-unsafe-eval'`.

Log every miss with the Code Red shape: exact path attempted, missing item, reasoning.

## Build-time verification

Add to the prebuild gate (`scripts/__tests__/sql-wasm-shipped.test.mjs`, see step 39):

```js
import { statSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('public/assets/sql-wasm.wasm is present', () => {
  const s = statSync('public/assets/sql-wasm.wasm');
  assert.ok(s.size > 100_000, 'sql-wasm.wasm looks truncated');
  assert.ok(s.size < 2_000_000, 'sql-wasm.wasm looks like the debug build — ship the release build');
});
```

## Acceptance for this step

- [ ] The implementation satisfies the `Step 08 — Bundling sql-wasm.wasm` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- `public/assets/sql-wasm.wasm` exists, size between ~600 KB and ~1.2 MB (release build).
- `npm run build` produces `dist/assets/sql-wasm.wasm` of the same size.
- `manifest.json` declares the asset under `web_accessible_resources`.
- The `postinstall` and `prebuild` scripts both invoke `scripts/copy-sql-wasm.mjs`.
- The CI test `sql-wasm-shipped.test.mjs` passes.
- `rg "cdn\\.jsdelivr|unpkg\\.com" src public` returns zero hits.

## Cross-references

- Step 05 — CSP `wasm-unsafe-eval` + `web_accessible_resources` justification.
- Step 06 — folder layout (`public/assets/`).
- Step 07 — `sql.js` package pin.
- Step 09 — `initSqlJs({ locateFile })` consumer of this step.
- Step 39 — CI gates including `sql-wasm-shipped.test.mjs`.

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

