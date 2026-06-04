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
