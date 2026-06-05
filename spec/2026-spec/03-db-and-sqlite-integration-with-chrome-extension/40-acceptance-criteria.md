# Step 40 — Acceptance Criteria

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

A long implementation can appear “done” while still missing the one thing that caused the original failures: a reliable end-to-end contract proving storage durability, safe SQLite binding, correct cross-context routing, visible diagnostics, and CI enforcement. The fix is a single final checklist that maps every major risk to a concrete acceptance signal.

## Goal

Define the final go/no-go checklist for accepting the SQLite + OPFS + IndexedDB + `chrome.storage.local` integration.

## Required evidence

- implementation files exist in the paths named by steps 06–36,
- test files from step-38 pass in the harness,
- CI gates from step-39 are wired and covered by guard tests,
- manual Chrome E2E checklist is recorded,
- Errors panel and BootFailureBanner are visually verified,
- `.lovable/strictly-avoid.md` includes the final prohibited patterns.

## Final acceptance checklist

### A. Packaging and sql.js

- [ ] `sql.js` is pinned in project dependencies.
- [ ] `public/assets/sql-wasm.wasm` is bundled with the extension.
- [ ] Loader uses `chrome.runtime.getURL("assets/sql-wasm.wasm")`.
- [ ] Loader memoizes the `initSqlJs()` promise.
- [ ] Missing wasm creates a Code Red diagnostic with exact path.
- [ ] No CDN or remote wasm fallback exists.

### B. SQLite lifecycle and schema

- [ ] Global DB manager initializes Logs and Errors DBs once per service-worker lifetime.
- [ ] Per-project DB manager keys DBs by validated project slug/namespace.
- [ ] Schema declarations are centralized and versioned.
- [ ] SQLite schema migrations are separate from browser storage migrations.
- [ ] Query helpers use prepared statements and safe bind values.
- [ ] No raw `undefined` can reach sql.js bind APIs.

### C. Persistence and flush durability

- [ ] Persistence waterfall is OPFS → `chrome.storage.local` → memory.
- [ ] OPFS is re-probed every boot.
- [ ] Memory mode sets BootFailureBanner.
- [ ] Dirty tracking uses a fixed 5 s debounce.
- [ ] Timer does not reset on repeated writes.
- [ ] Failed flush restores dirty state.
- [ ] `onSuspend`, export, diagnostics, and migration boundaries drain pending writes.

### D. IndexedDB and cache

- [ ] IndexedDB is used only for medium/derived/cache payloads.
- [ ] Injection cache stores only derived bytes.
- [ ] Cache entries include extension version and build id.
- [ ] Build-id mismatch clears the cache.
- [ ] Stub script bytes are rejected and never cached.
- [ ] Cache clear/rebuild is tested.

### E. `chrome.storage.local` and migrations

- [ ] All extension-wide storage access goes through wrappers.
- [ ] Existing camelCase stored project shapes are preserved.
- [ ] PascalCase storage rewrite is prohibited and CI-guarded.
- [ ] Quota pressure model exists and prunes only disposable keys.
- [ ] Storage migrations are explicit, idempotent, sequential, and fail-fast.
- [ ] Storage schema version is written only after migration success.

### F. localStorage and auth

- [ ] Background code has zero `localStorage` references.
- [ ] Page-origin storage access is limited to the SDK auth helper allowlist.
- [ ] Public auth still uses only `getBearerToken()`.
- [ ] No Supabase SDK, imports, or storage keys exist.

### G. Cross-context and SDK bridge

- [ ] Background is the only context importing DB/storage managers.
- [ ] SDK requests include request id, message type, and project id.
- [ ] SDK default project id is `RiseupMacroSdk` for self-owned KV.
- [ ] Content-script relay validates channel and fields before forwarding.
- [ ] Responses echo request id.
- [ ] Timeouts are fail-fast and do not retry.

### H. Error routing and UI surfaces

- [ ] All handler failures route through the central error router.
- [ ] Error responses include `reason` and `reasonDetail`.
- [ ] Errors DB rows include `Path`, `Missing`, `SelectorAttemptsJson`, and `VariableContextJson`.
- [ ] Errors panel shows reason, detail, path, and missing item.
- [ ] BootFailureBanner shows boot-critical diagnostics.
- [ ] Code Red rows are durable until acknowledged.

### I. Logging and retention

- [ ] `Logs` and `Errors` SQLite tables exist with required indexes.
- [ ] OPFS session logs use `events.log`, `errors.log`, and `scripts.log`.
- [ ] OPFS session logs older than 7 days are pruned on new session initialization.
- [ ] Verbose logging gate controls full HTML/text payloads.
- [ ] Diagnostic export includes SQLite rows and OPFS session files.

### J. Tests and CI

- [ ] Unit/regression/component tests from step-38 are present.
- [ ] CI gates from step-39 are wired into validation.
- [ ] CI `push` trigger is unfiltered.
- [ ] No CI build notifications are added.
- [ ] Guard scripts emit exact `Path`, `Missing`, `Reason`, and `ReasonDetail`.
- [ ] Manual Chrome E2E checklist is recorded.

## Go/no-go rule

The implementation is accepted only when every checklist section A–J is complete. Any unchecked Code Red, persistence, bind-safety, CI, or auth item is a **no-go**.

## Final error model

| No-go area | Required reason |
|---|---|
| missing wasm or remote fetch | `SqlJsAssetAcceptanceFailed` |
| bind safety gap | `SqliteBindSafetyAcceptanceFailed` |
| persistence durability gap | `PersistenceAcceptanceFailed` |
| bridge contract gap | `CrossContextAcceptanceFailed` |
| diagnostics gap | `ErrorDiagnosticsAcceptanceFailed` |
| CI gate gap | `CiGateAcceptanceFailed` |
| test gap | `TestCoverageAcceptanceFailed` |

Acceptance failures must be logged with exact path, missing item, reason, and reason detail before the work is considered incomplete.

## Cross-references

- [step-01](./01-purpose-and-mindset.md) — implementation intent.
- [step-17](./17-persistence-backends.md) — durability baseline.
- [step-31](./31-error-model.md) — diagnostics baseline.
- [step-37](./37-strictly-avoid.md) — no-go patterns.
- [step-38](./38-testing.md) — required tests.
- [step-39](./39-ci-gates.md) — required CI gates.

## Acceptance

- [ ] The implementation satisfies the `Step 40 — Acceptance Criteria` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../01-prompt-spec/reference/05-runtime-defaults.md). If a value differs, the SOT wins.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

