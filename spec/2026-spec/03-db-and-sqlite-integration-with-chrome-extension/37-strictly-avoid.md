# Step 37 — Strictly Avoid

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The spec can be technically correct and still fail if future implementation reintroduces a known-bad shortcut: remote wasm, direct storage calls, SQLite `undefined` binds, cache-as-source-of-truth, vague Code Red logs, or recursive retry. The fix is to make the “never do this” list explicit, mirrored in `.lovable/strictly-avoid.md`, and enforced by CI gates in step-39.

## Goal

Define the hard prohibitions for the SQLite + OPFS + IndexedDB + `chrome.storage.local` storage stack so future agents cannot re-open already-solved failure classes.

## Required files

- `.lovable/strictly-avoid.md` — project-wide hard prohibitions; must include this storage/error set.
- `spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/step-37-strictly-avoid.md` — detailed rationale for this spec.
- `scripts/check-no-storage-pascalcase-rewrite.mjs` — rejects forbidden storage shape rewrites.
- `scripts/check-no-background-localstorage.mjs` — rejects `localStorage` in MV3 background code.
- `scripts/check-code-red-diagnostics.mjs` — rejects incomplete Code Red messages.
- `scripts/check-sqlite-remote-fetch.mjs` — rejects remote sql.js/wasm loading.
- `src/test/regression/code-red-logging.test.ts` — runtime shape guard.

No new runtime package is required.

## Hard prohibitions

| Prohibited pattern | Why it is banned | Correct replacement |
|---|---|---|
| Remote `sql.js` or wasm from CDN | MV3/CSP failure and supply-chain risk | bundled `public/assets/sql-wasm.wasm` |
| Binding `undefined` to SQLite | sql.js crashes with opaque API error | `requireX()`, `bindOpt()`, `bindReq()`, bind-safety Proxy |
| Direct OPFS calls outside persistence module | duplicated fallback logic corrupts durability | `src/background/db-persistence.ts` |
| Direct DB blob writes to `chrome.storage.local` outside persistence module | quota and serialization drift | `flushToStorage()` / `loadFromStorage()` |
| Using IndexedDB injection cache as source of truth | stale/stub script execution | source manifest + rebuildable cache only |
| Storing `STUB_PREFIX` script bytes in cache | executes placeholder code | reject + Code Red |
| PascalCase rewrite of existing `chrome.storage.local` projects | breaks existing consumers | preserve legacy camelCase keys |
| `localStorage` in background code | MV3 service worker cannot access it | `chrome.storage.local` wrapper or DB manager |
| Auth outside `getBearerToken()` | multiple token paths drift and leak | single-path auth contract |
| Supabase SDK/storage keys | explicitly forbidden project constraint | existing extension auth/storage stack |
| Recursive retry/exponential backoff | hides root cause and risks platform blocks | sequential fail-fast |
| Vague Code Red logs | impossible to triage | exact `Path`, `Missing`, `Reason`, `ReasonDetail` |
| Errors panel rows missing diagnostic JSON | operators cannot debug | full `SelectorAttempts` + `VariableContext` |

## Review rejection checklist

Reject the implementation if any of these searches return matches outside documented allowlists:

```bash
rg "cdn\.jsdelivr|unpkg\.com|sql-wasm\.wasm\?url" src standalone-scripts scripts spec/2026-spec
rg "\blocalStorage\b" src/background
rg "STUB_PREFIX|stub script" src/background/injection-cache.ts
rg "\.run\([^\)]*undefined|\.bind\([^\)]*undefined" src/background
rg "sb-[a-zA-Z0-9_-]+|@supabase|supabase-js" src standalone-scripts
```

The intent is not to ban references inside this spec; it is to ban implementation code that reintroduces these patterns.

## Error model

| Violation | Reason | Logger/CI surface | User-visible surface |
|---|---|---|---|
| Remote wasm | `ForbiddenRemoteSqlJsAsset` | CI failure | build fails |
| Background `localStorage` | `ForbiddenBackgroundLocalStorage` | CI failure | build fails |
| PascalCase rewrite | `ForbiddenStoragePascalCaseRewrite` | CI failure | build fails |
| Stub script cached | `StubScriptCacheRejected` | Code Red + Errors panel | warning/Code Red row |
| Vague Code Red | `IncompleteCodeRedDiagnostic` | CI/test failure | build fails |

All runtime violations that survive CI must route through step-32 error routing with full failure diagnostics.

## Acceptance

- [ ] `.lovable/strictly-avoid.md` includes the storage/SQLite/cache/Code Red prohibitions from this step.
- [ ] CI gates from step-39 enforce the machine-checkable bans.
- [ ] Code review checklist rejects implementation code with remote wasm, direct background `localStorage`, or raw SQLite `undefined` binds.
- [ ] Any unavoidable exception is documented in the step that owns it and covered by a regression test.
- [ ] No prohibition conflicts with the no-question mode, no-retry policy, or no-storage-PascalCase policy.

## Cross-references

- [step-07](./07-required-packages-and-no-remote-fetch.md) — no remote `sql.js`.
- [step-16](./16-bind-safety-proxy-net.md) — bind-safety backstop.
- [step-23](./23-indexeddb-injection-cache.md) — cache never stores stubs or source-of-truth data.
- [step-25](./25-chrome-storage-local-usage.md) — camelCase preservation.
- [step-36](./36-code-red-logging-rule.md) — no vague Code Red diagnostics.
- [step-39](./39-ci-gates.md) — CI enforcement.

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
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

