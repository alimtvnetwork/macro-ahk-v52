# Step 09 — Initializing `sql.js`

## Goal

Provide the single, canonical async loader for the `sql.js` runtime. It must (a) point `locateFile` at the bundled wasm (step 08),
(b) memoize the `SqlJsStatic` factory so the wasm is fetched at most once per worker lifetime, and (c) surface a Code Red error if
the wasm is missing.

## Audience

An AI agent wiring the service worker boot path against `sql.js@^1.14.0`.

## File: `src/background/sqljs-loader.ts`

```ts
import initSqlJsFactory from "sql.js";
import type { SqlJsStatic } from "sql.js";
import { Logger } from "../shared/logger";

const WASM_PATH = "assets/sql-wasm.wasm";

let cached: Promise<SqlJsStatic> | null = null;

export default function initSqlJs(): Promise<SqlJsStatic> {
    if (cached !== null) {
        return cached;
    }
    cached = (async () => {
        const wasmUrl = chrome.runtime.getURL(WASM_PATH);
        try {
            const head = await fetch(wasmUrl, { method: "HEAD" });
            if (!head.ok) {
                Logger.error(
                    "[sqljs-loader] CODE RED: wasm asset not found",
                    { path: WASM_PATH, url: wasmUrl, status: head.status,
                      reason: "public/assets/sql-wasm.wasm missing from build; re-run prebuild copy script" },
                );
                throw new Error(`sql-wasm.wasm missing at ${wasmUrl} (HTTP ${head.status})`);
            }
        } catch (probeErr) {
            Logger.error("[sqljs-loader] wasm HEAD probe failed", { url: wasmUrl, error: probeErr });
            throw probeErr;
        }
        return initSqlJsFactory({ locateFile: () => wasmUrl });
    })();
    return cached;
}
```

## Why exactly this shape

1. **Module-level `cached` promise** — sql.js spawns a fresh wasm instance per `initSqlJs()` call. Memoize so SW restarts after the
   first call reuse the same `SqlJsStatic`. The cache is automatically dropped when the SW is killed.
2. **HEAD probe before init** — sql.js's internal failure mode is opaque (`Aborted(both async and sync fetching of the wasm failed)`).
   A 404 from HEAD gives us a deterministic, classifiable error that the BootFailureBanner (step 34) can render as `kind: "wasm-missing"`.
3. **`chrome.runtime.getURL`** — required because the SW URL is `chrome-extension://<id>/background/index.js`; a relative `./sql-wasm.wasm`
   would resolve under `/background/`, not `/assets/`. (See step 08 anti-patterns.)
4. **No `await import('sql.js')`** — sql.js does not export the wasm path itself, so dynamic import buys nothing and slows the boot.

## Anti-patterns (auto-reject in PR review)

- Awaiting `initSqlJs` inside a hot path (every `db.exec`). Always call once from `boot.ts` (step 10) and pass the result down.
- Catching the probe error and continuing with `new Database()`. The Database will throw a less-actionable error 200 ms later.
- Removing the HEAD probe to "save a request". The probe is the only thing that turns an opaque sql.js abort into a Code Red log line.

## Acceptance for this step

- [ ] The implementation satisfies the `Step 09 — Initializing sql.js` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

- `src/background/sqljs-loader.ts` exports a default `initSqlJs()` returning `Promise<SqlJsStatic>`.
- Calling `initSqlJs()` twice in the same worker returns the same promise instance.
- Deleting `public/assets/sql-wasm.wasm` and reloading the extension produces a Code Red log line containing the path and `404`.
- No `cdn.jsdelivr.net` / `unpkg.com` strings in this file.

## Cross-references

- Step 07 — `sql.js` package pin.
- Step 08 — wasm bundling that this loader consumes.
- Step 10 — `ExtensionDB.init()` calls this loader.
- Step 31 — error model (`CaughtError`) used by `Logger.error`.
- Step 34 — `BootFailureBanner` renders the Code Red message.

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

