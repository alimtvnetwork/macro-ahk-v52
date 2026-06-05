# 18 — Storage `chrome.storage.local` Pointer

## Why this step exists

`chrome.storage.local` is convenient, cross-context, and persistent, so it is
often misused as a database. In this extension spec it has a narrower job:
small extension-wide JSON state that must be shared between the background
service worker and extension UI. This file binds that job to the authoritative
storage spec and repeats the non-negotiable rule: do not rewrite existing stored
project/script/config objects to PascalCase.

Authoritative folder:

```text
spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/
```

## Contract

1. **Small shared JSON only.** Use `chrome.storage.local` for small settings,
   sentinels, UI state, active ids, and bootstrap metadata shared across
   extension contexts.
2. **Not a database.** Logs, errors, replay traces, selector attempts, variable
   context, metrics, and tabular records belong in SQLite.
3. **Not a large cache.** Script bytes, WASM bytes, ZIP staging, screenshots,
   and large blobs belong in IndexedDB, OPFS, or exported files.
4. **No secrets.** Tokens, cookies, private keys, role claims, and admin flags
   are forbidden in browser storage.
5. **Stable key constants.** New code uses exported storage-key constants and a
   typed wrapper. No ad-hoc literal keys.
6. **CamelCase payload preservation.** Existing `StoredProject`, `StoredScript`,
   and `StoredConfig` JSON shapes remain camelCase. No PascalCase storage
   rewrite or whole-store shape migration.
7. **Quota-aware writes.** New writes measure JSON bytes and refuse oversized
   non-allowlisted values.
8. **Bounded pruning only.** Automatic pruning may delete only explicitly listed
   disposable keys. Never delete authoritative projects/scripts/configs.
9. **No retry loops.** Storage failures are fail-fast. A caller may expose a
   user-triggered manual retry, but no recursive retry/backoff/scheduled queue.

## Mandatory sibling files

Read these files before adding or changing `chrome.storage.local` behavior:

| Need | Authoritative file |
|---|---|
| Tier matrix | `02-four-tier-storage-decision-matrix.md` |
| MV3 constraints | `05-mv3-constraints.md` |
| `chrome.storage.local` lane | `25-chrome-storage-local-usage.md` |
| Quota and pruner | `26-chrome-storage-local-quota.md` |
| `localStorage` boundary | `27-localstorage-usage.md` |
| Cross-version storage migration | `28-cross-version-storage-migration.md` |
| Cross-context access | `29-cross-context-access.md` |
| Error shape | `31-error-model.md`, `36-code-red-logging-rule.md` |
| Tests / CI | `38-testing.md`, `39-ci-gates.md`, `40-acceptance-criteria.md` |

## Allowed data

| Data | Allowed? | Notes |
|---|---:|---|
| Active project id | Yes | Small pointer. |
| First-run / install sentinels | Yes | Small bootstrap state. |
| Last build id | Yes | Cache invalidation sentinel. |
| Floating panel position/minimized state | Yes | Small UI state from step 15. |
| Config override map | Yes, bounded | Must stay below quota guard. |
| Stored projects/scripts/configs | Legacy yes | Preserve current camelCase shapes; migration to other tiers requires compatibility plan. |
| Auto-attach latest decisions | Yes, prunable | Bounded diagnostics cache. |
| Logs / errors / diagnostics rows | No | SQLite source of truth. |
| Script bytes / cache blobs | No | IndexedDB or bundled files. |
| Tokens / secrets / role claims | No | Forbidden. |

## Canonical wrapper shape

New code uses a wrapper equivalent to:

```ts
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface ChromeStorageReadResult<T extends JsonValue> {
  readonly Found: boolean;
  readonly Value: T | null;
}

export type ChromeStorageLocalKey =
  | typeof STORAGE_KEY_ACTIVE_PROJECT
  | typeof STORAGE_KEY_ALL_PROJECTS
  | typeof STORAGE_KEY_ALL_SCRIPTS
  | typeof STORAGE_KEY_ALL_CONFIGS
  | typeof STORAGE_KEY_CONFIG_OVERRIDES
  | typeof STORAGE_KEY_STATE
  | typeof STORAGE_KEY_FIRST_RUN
  | typeof STORAGE_KEY_LEGACY_PRUNED
  | typeof STORAGE_KEY_LAST_BUILD_ID
  | typeof STORAGE_KEY_AUTO_ATTACH_DECISIONS
  | typeof STORAGE_KEY_FLOATING_PANEL_STATE
  | typeof STORAGE_KEY_STORAGE_SCHEMA_VERSION;
```

Rules:

- The wrapper validates the key before every read/write/remove.
- Writes call the quota guard before `chrome.storage.local.set()`.
- Reads distinguish missing key (`Found=false`) from present `null`.
- `chrome.runtime.lastError` or rejected storage calls become typed failures
  with Code Red detail.
- `chrome.storage.onChanged` listeners return teardown functions and are removed
  on component unmount, context teardown, or uninject.

## Non-negotiable shape rule

`chrome.storage.local` object payloads keep their established runtime casing.

```text
StoredProject.schemaVersion  ✅ keep
StoredProject.targetUrls     ✅ keep
StoredProject.createdAt      ✅ keep
StoredProject.SchemaVersion  ❌ forbidden rewrite
StoredProject.TargetUrls     ❌ forbidden rewrite
```

SQLite may use PascalCase tables and columns. Browser-storage JSON does not get
rewritten to match SQLite. This separation prevents breakage across existing
handlers, content bridges, import/export code, and UI consumers.

## Quota policy binding

| Limit | Required behavior |
|---|---|
| Normal per-key value > 8 KiB | Refuse write; route to IndexedDB or SQLite. |
| Total usage ≥50% default quota | Diagnostics warning. |
| Total usage ≥80% default quota | Storage-pressure toast/diagnostic and bounded prune. |
| Total usage ≥100% default quota | Refuse growing writes; user export/clear required. |

Legacy collection keys may exceed 8 KiB only while they remain explicitly
allowlisted. They still participate in total pressure reports.

Prunable keys are limited to disposable derived state, for example:

```text
auto-attach latest decisions
last build id cache sentinel
rebuildable state snapshot
```

Authoritative project/script/config data is never auto-deleted for quota relief.

## Migration boundary

Storage migrations are separate from SQLite migrations.

Rules:

1. Migrations are sequential, idempotent, and fail-fast.
2. Migrations read/write named keys only; no whole-store rewrites.
3. Schema version is written last after all migration writes succeed.
4. Derived IndexedDB caches are cleared, not migrated.
5. Page `localStorage` is not migrated by extension storage migrations.
6. Any migration touching project/script/config collections must prove it does
   not change key casing.

## Error reasons

| Reason | When |
|---|---|
| `UnknownChromeStorageLocalKey` | Caller uses a key outside exported constants. |
| `ChromeStorageLocalReadFailed` | `get()` fails or runtime reports an error. |
| `ChromeStorageLocalWriteFailed` | `set()` fails or runtime reports an error. |
| `ChromeStorageLocalValueTooLarge` | Non-allowlisted value exceeds per-key guard. |
| `ChromeStorageBytesInUseFailed` | `getBytesInUse()` fails. |
| `ChromeStorageLocalPressurePruned` | Disposable keys were pruned for pressure. |
| `ChromeStorageAuthoritativePruneRejected` | Code attempts to prune projects/scripts/configs. |
| `ForbiddenStoragePascalCaseRewrite` | Migration rewrites stored JSON casing. |
| `StorageMigrationFailed` | Registered storage migration throws. |
| `StorageSchemaVersionWriteFailed` | Final schema stamp write fails. |

Every failure includes storage key path, missing operation/item, `Reason`,
`ReasonDetail`, and when available byte counts and quota.

## UI and status obligations

- Step 07 status includes storage pressure, latest quota report, and last storage
  failure reason when available.
- Step 13 Errors panel receives storage Code Red rows through the normal error
  router.
- Step 14 BootFailureBanner shows migration, quota, and schema-stamp failures
  when they block boot.
- Step 15 floating panel may persist small UI state here, but must remove its
  `onChanged` listener during teardown.

## CI gates

The implementing project must enforce:

```text
chrome-local-wrapper-only        new writes use typed wrapper
no-storage-pascalcase-rewrite    no StoredProject/Script/Config casing rewrite
chrome-local-budget              new non-allowlisted values are <= 8 KiB
chrome-local-no-secrets          token/secret/role keys are rejected
chrome-local-no-large-blobs      script/wasm/zip/screenshot bytes rejected
chrome-local-pruner-safe         authoritative keys are never pruned
no-background-localstorage       background code has no localStorage references
```

Guard failures must include exact path, missing requirement, `Reason`, and
`ReasonDetail`.

## Pitfalls

- Using `chrome.storage.local` as a convenient dump for script bytes. That causes
  quota failure and stale injection behavior.
- Rewriting storage JSON to PascalCase while adding SQLite. SQLite casing and
  browser-storage casing are separate contracts.
- Swallowing quota errors and falling back to defaults. That loses user state.
- Auto-deleting authoritative keys to make room. Export or move tiers instead.
- Forgetting teardown for `chrome.storage.onChanged` listeners in popup/options
  or injected panel components.
- Using page `localStorage` because it is synchronous. MV3 background cannot use
  it and content scripts read page-origin storage, not extension storage.

## Acceptance criteria

- [ ] New `chrome.storage.local` writes use a typed wrapper and exported key
      constants.
- [ ] `StoredProject`, `StoredScript`, and `StoredConfig` remain camelCase in
      persisted JSON.
- [ ] PascalCase storage rewrite guard is present in CI and covered by tests.
- [ ] Non-allowlisted writes above 8 KiB are refused with Code Red detail.
- [ ] Quota pressure classifies `ok`, `warn`, `pressure`, and `full` states.
- [ ] Pruner deletes only disposable allowlisted keys and never deletes
      projects, scripts, or configs.
- [ ] Storage migrations are idempotent, sequential, and write schema version
      last.
- [ ] Background code has zero `localStorage` references.
- [ ] `chrome.storage.onChanged` listeners are removed during UI teardown and
      uninject.
- [ ] Status, Errors panel, and BootFailureBanner expose storage failures through
      their existing routes.

## Cross-references

- Step 02 — storage at-a-glance and CSP boundaries.
- Step 07 — status surface for storage pressure.
- Step 13 — error routing for storage failures.
- Step 14 — boot banner for migration/quota/schema failures.
- Step 15 — floating panel small UI state.
- Step 16 — SQLite source of truth for logs/errors/structured data.
- Step 17 — IndexedDB cache lane for large rebuildable data.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../01-prompt-spec/reference/05-runtime-defaults.md). If a value differs, the SOT wins.

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
