# Step 38 — Testing

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The storage stack spans MV3 service worker lifecycle, sql.js, OPFS, IndexedDB, `chrome.storage.local`, SDK page bridges, UI error surfaces, and CI scripts. A unit-only test plan misses the actual regressions: undefined SQLite binds, stale injection cache bytes, missing wasm, lost flushes, invalid cross-context payloads, and incomplete failure diagnostics. The fix is layered tests that match each failure boundary.

## Goal

Define the required unit, regression, component, and E2E-style tests for the SQLite/storage/error implementation.

## Required test files

- `src/background/__tests__/sqljs-loader.test.ts` — wasm path and memoization.
- `src/background/__tests__/sqlite-bind-safety.test.ts` — bind param detection and column inference.
- `src/background/__tests__/db-persistence.test.ts` — OPFS → storage → memory waterfall.
- `src/background/__tests__/db-flush.test.ts` — 5 s debounce and dirty restore.
- `src/background/__tests__/storage-migrations.test.ts` — idempotent migration runner.
- `src/background/__tests__/injection-cache.test.ts` — build-id invalidation and stub rejection.
- `src/background/__tests__/error-routing.test.ts` — normalized route/persist/broadcast behavior.
- `src/test/regression/sdk-selftest-handler.test.ts` — SDK project id and KV safety.
- `src/test/regression/sessions-logging-path.test.ts` — OPFS session log paths and retention.
- `src/pages/__tests__/Popup.test.tsx` — BootFailureBanner and Errors panel summary.
- `src/test/regression/code-red-logging.test.ts` — required Code Red diagnostic shape.
- `scripts/__tests__/storage-and-ci-guards.test.mjs` — static guard scripts.

Use existing project test tooling. Add `fake-indexeddb` only for IndexedDB wrapper/cache tests if it is not already present.

## Test matrix

| Area | Required cases |
|---|---|
| sql.js loader | same promise returned twice; wasm URL is `assets/sql-wasm.wasm`; missing wasm creates Code Red fields |
| persistence | OPFS success; OPFS fail → storage success; OPFS+storage fail → memory + BootFailureBanner |
| flush | 1000 writes coalesce; no reset of timer; failed flush restores dirty flag; `onSuspend` drains |
| bind safety | raw `undefined` throws `BindError`; optional values become `null`; required missing fields fail before DB call |
| storage migrations | idempotent; schema version written last; no PascalCase rewrite; no page `localStorage` |
| IndexedDB cache | source manifest rebuild; build-id mismatch clears; `STUB_PREFIX` rejected; cache never source of truth |
| cross-context bridge | request id echoed; missing project id rejected; timeout fail-fast; no retry loop |
| error model | `Reason`, `ReasonDetail`, `Path`, `Missing`, `SelectorAttempts`, `VariableContext` always present |
| UI surfaces | Errors panel wraps long paths; BootFailureBanner shows exact diagnostic fields; malformed JSON fallback |
| CI scripts | fail on remote wasm, background `localStorage`, PascalCase rewrite, incomplete Code Red |

## Example regression test shapes

```ts
it("rejects undefined before sql.js receives bind params", () => {
    const db = wrapDatabaseWithBindSafety(createFakeSqlJsDb());
    expect(() => {
        db.run("INSERT INTO Kv(ProjectId, Key) VALUES (?, ?)", [undefined, "a"]);
    }).toThrow(/ProjectId|paramIndex=0/);
});
```

```ts
it("routes BindError into a visible diagnostic", async () => {
    const result = await buildErrorResponse({
        requestId: "req-1",
        messageType: "KV_SET",
        error: new BindError("bad bind", 0, "ProjectId", "INSERT INTO Kv"),
    });

    expect(result.isOk).toBe(false);
    expect(result.reason).toBe("SQLITE_BIND_ERROR");
    expect(result.reasonDetail).toContain("ProjectId");
});
```

## Manual Chrome E2E checklist

Manual Chrome E2E is allowed for this project. Run it for implementation close-out:

1. Load unpacked extension.
2. Confirm wasm loads from packaged extension URL, not CDN.
3. Start a session, produce logs, stop session.
4. Export diagnostics and confirm `events.log`, `errors.log`, and `scripts.log` exist.
5. Force OPFS failure in a test build and confirm storage fallback.
6. Force both persistence tiers to fail and confirm BootFailureBanner.
7. Run SDK self-test and confirm no SQLite bind error.

## Error model

| Test failure | Reason | Surface |
|---|---|---|
| Missing regression test for new storage code | `MissingStorageRegressionTest` | CI fails |
| Snapshot hides required diagnostic field | `MissingErrorDiagnosticField` | component test fails |
| Manual E2E skipped at close-out | `ManualChromeE2ENotRecorded` | acceptance fails |

## Acceptance

- [ ] Every new storage/error feature ships with a matching unit, regression, component, or E2E test.
- [ ] Tests cover both success path and the failure mode the code is designed to prevent.
- [ ] Bind-safety regression proves `undefined` cannot reach sql.js silently.
- [ ] UI tests prove Code Red details are visible and copyable.
- [ ] CI guard tests prove forbidden patterns fail builds.
- [ ] Manual Chrome E2E checklist is recorded before final acceptance.

## Cross-references

- [step-16](./16-bind-safety-proxy-net.md) — bind-safety regression.
- [step-18](./18-flush-strategy.md) — flush tests.
- [step-23](./23-indexeddb-injection-cache.md) — cache tests.
- [step-31](./31-error-model.md) — diagnostic field tests.
- [step-39](./39-ci-gates.md) — CI enforcement.
- Core memory: test-with-features; manual Chrome E2E ban lifted.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../01-prompt-spec/reference/05-runtime-defaults.md). If a value differs, the SOT wins.
