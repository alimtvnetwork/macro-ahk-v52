# 20 — Acceptance Criteria

## Why this step exists

The folder is complete only when an implementing AI can prove every promised
runtime feature, storage boundary, diagnostic shape, teardown rule, and CI guard
exists. Without an aggregate gate, earlier steps can pass individually while the
system still fails as a product: missing spec files, stale README names, skipped
tests, duplicate injection, storage casing rewrites, or invisible boot failures.
This step is the final go/no-go checklist for the whole Chrome extension feature
spec.

## Required evidence

- All files `01-purpose-and-scope.md` through `20-acceptance-criteria.md` exist.
- `README.md` and step 01 list the same 20 slugs in the same order.
- Each implementable step has a completed acceptance checklist.
- Test evidence from step 19 exists for unit/component/regression/static/manual
  categories as applicable.
- Manual Chrome E2E evidence exists for MV3-only behavior.
- Static audits are wired into validation and fail on known-bad fixtures.
- No read-only folders are modified.
- No Supabase, retry-loop, CI-notification, background `localStorage`, or
  forbidden storage PascalCase migration is introduced.

## Go/no-go rule

The implementation is accepted only when every section A–L below is complete.
Any unchecked item in security, diagnostics, storage durability, injection
idempotency, teardown, or CI is a **no-go**.

## Final acceptance checklist

### A. Spec index and documentation integrity

- [ ] Steps 01–20 exist with exact filenames from step 01.
- [ ] `README.md` matches step 01 for every slug and order.
- [ ] No file referenced as authoritative is missing unless explicitly labelled
      `(pending)` or `(future)`.
- [ ] Each implementable step has Contract, Pitfalls, Acceptance, and Tests or
      test-equivalent obligations.
- [ ] Pointer steps 16–18 link to existing sibling storage files.

### B. Manifest, packaging, and build identity

- [ ] Manifest uses MV3 only.
- [ ] Version is unified across manifest, constants, UI, and scripts.
- [ ] Build id is generated, surfaced in popup/options/status/floating panel,
      and included in diagnostics.
- [ ] CSP has no remote script source, `unsafe-inline`, or general `unsafe-eval`.
- [ ] `wasm-unsafe-eval` appears only when sql.js is bundled.
- [ ] Packaged assets include required scripts and, if enabled,
      `assets/sql-wasm.wasm`.

### C. Runtime status and reload UX

- [ ] Manual reload is user-triggered, typed, visible in status, and not logged
      as unresolved Code Red by default.
- [ ] Auto reload is development-gated and cannot run in production.
- [ ] Status panel shows version/build, last reload, injection state, storage
      health, and error counts without blank states.
- [ ] Status failures include `Reason` and `ReasonDetail`.

### D. Injection lifecycle and idempotency

- [ ] New-tab / blank URLs are rejected through `isNewTabOrBlankUrl()`.
- [ ] Injection follows idle → eligibility → script resolution → MAIN/ISOLATED
      staging → ready → injected status.
- [ ] Sentinel probe returns `true`, `false`, or `build-mismatch`.
- [ ] Concurrent injection requests collapse through an in-flight mutex.
- [ ] Build mismatch uses uninject then force inject; it never double-injects.
- [ ] Script-id sentinel overflow uses hash/count rather than unbounded attrs.

### E. Re-inject, uninject, and teardown

- [ ] Force injection is allowed only from audited user/debug call sites.
- [ ] Uninject broadcasts before-uninject, runs teardown callbacks, removes
      runtime/panel/styles, clears sentinel, broadcasts after-uninject, then
      tears down relay last.
- [ ] Teardown failures return `TeardownCallbackFailed` and block sentinel clear.
- [ ] Runtime `Extension context invalidated` during uninject is terminal and not
      retried.
- [ ] Timers, observers, listeners, pointer captures, and storage listeners have
      paired teardown and `pagehide` cleanup where applicable.

### F. Error logging, routing, and diagnostics

- [ ] Every hard failure logs via the namespace logger, not bare `log()`.
- [ ] Code Red payloads include exact `Path`, `Missing`, `Reason`, and
      `ReasonDetail`.
- [ ] Selector failures include full `SelectorAttempts[]`.
- [ ] Variable/data failures include full `VariableContext[]`.
- [ ] Verbose logging gate controls full HTML/text; default logs remain
      truncated.
- [ ] Sensitive diagnostic values are masked deterministically.
- [ ] Error routing owns insert/resolve/clear, recomputes counts, and broadcasts
      `ERROR_COUNT_CHANGED` after DB commit.
- [ ] Errors panel normalizes PascalCase/camelCase/legacy rows and preserves
      `normalizationWarnings` in exports.

### G. Boot failure and UI surfaces

- [ ] Boot failure capture freezes click trail, persists failure, then rethrows.
- [ ] Failure survives service-worker restart and clears only after successful
      boot.
- [ ] BootFailureBanner renders without crashing in preview/no-storage modes.
- [ ] Support reports include correlation, cause, Code Red fields, context,
      WASM probe, stack, frozen trail, and benign warning tally.
- [ ] Floating panel mounts once per tab/frame, persists only small UI state,
      clamps drag position, and tears down completely on uninject.
- [ ] UI surfaces use dark-only semantic tokens and do not add light mode.

### H. SQLite storage boundary

- [ ] SQLite is background-only; UI/content/page code imports no DB managers.
- [ ] sql.js loader uses `chrome.runtime.getURL("assets/sql-wasm.wasm")` and
      memoizes initialization.
- [ ] No CDN or remote wasm fallback exists.
- [ ] SQLite identifiers are PascalCase and normalized centrally before UI use.
- [ ] No raw `undefined` reaches sql.js bind APIs.
- [ ] Persistence waterfall is OPFS → `chrome.storage.local` → memory-only mode,
      and memory-only mode is visible in status/boot diagnostics.

### I. IndexedDB cache boundary

- [ ] IndexedDB stores only allowed derived/cache payloads.
- [ ] Direct `indexedDB.open()` appears only in the wrapper.
- [ ] Injection cache entries include extension version and build id.
- [ ] Version/build mismatch and stub values are treated as cache misses and are
      never executed.
- [ ] Install/update, build-id change, manual clear, mutation invalidation, and
      quota pruning are covered.
- [ ] Cache invalidation never rewrites source-of-truth project/script/config
      data.

### J. `chrome.storage.local` boundary

- [ ] New writes use typed wrappers and exported key constants.
- [ ] Existing `StoredProject`, `StoredScript`, and `StoredConfig` payloads remain
      camelCase in persisted JSON.
- [ ] PascalCase storage rewrite guard is present and covered by tests.
- [ ] Non-allowlisted values above the per-key budget are refused.
- [ ] Quota pressure prunes only disposable allowlisted keys and never deletes
      projects, scripts, or configs.
- [ ] Storage migrations are idempotent, sequential, fail-fast, and write schema
      version last.
- [ ] Background code has zero `localStorage` references.

### K. Tests, audits, and CI

- [ ] Step 19 matrix has evidence for every implemented feature step.
- [ ] Static audits cover index, retry policy, logger compliance, namespace
      governance, force-inject callers, storage tier rules, and CI trigger.
- [ ] CI workflow uses bare `on: push:` with no branch/path filters.
- [ ] CI emits no build notifications.
- [ ] Tests cover both success path and primary failure mode.
- [ ] Manual Chrome E2E checklist is recorded for MV3-only behavior.
- [ ] Guard scripts emit `Path`, `Missing`, `Reason`, and `ReasonDetail` on
      failure.

### L. Prohibited patterns

- [ ] No Supabase SDK, auth, token, import, or storage key exists.
- [ ] No unauthorized retry queue, recursive retry, or exponential backoff exists.
- [ ] No remote extension code, remote wasm, or remote script fallback exists.
- [ ] No CI notification workflow/action is added.
- [ ] No forbidden read-only folder is modified.
- [ ] No `readme.txt` timestamp/clock/git-update automation is proposed or added.
- [ ] No new P Store work is listed or recommended.

## Final failure model

| No-go area | Required reason |
|---|---|
| Missing indexed spec file | `SpecIndexIncomplete` |
| README / step 01 slug drift | `SpecIndexSlugMismatch` |
| Missing test for implemented feature | `MissingFeatureTest` |
| MV3 packaging or CSP gap | `ManifestAcceptanceFailed` |
| Version/build mismatch | `VersionSyncAcceptanceFailed` |
| Injection duplicate / stale sentinel gap | `InjectionIdempotencyAcceptanceFailed` |
| Teardown gap | `TeardownAcceptanceFailed` |
| Code Red diagnostic gap | `ErrorDiagnosticsAcceptanceFailed` |
| Boot failure invisibility | `BootFailureAcceptanceFailed` |
| SQLite source-boundary gap | `SqliteBoundaryAcceptanceFailed` |
| IndexedDB cache-boundary gap | `IndexedDbBoundaryAcceptanceFailed` |
| `chrome.storage.local` casing/quota gap | `ChromeStorageLocalAcceptanceFailed` |
| CI trigger/filter gap | `CiGateAcceptanceFailed` |
| Prohibited pattern found | `ForbiddenPatternAcceptanceFailed` |

Acceptance failures must be logged or reported with exact path, missing item,
reason, and reason detail before the work is considered incomplete.

## Close-out procedure

1. Run static spec/index audits.
2. Run unit, regression, component, hook, and guard tests relevant to changed
   steps.
3. Complete manual Chrome E2E for MV3-only behavior.
4. Export or record diagnostics evidence for error/boot/storage surfaces.
5. Review prohibited patterns against project memory.
6. Mark the implementation accepted only when every checklist item above passes.

## Acceptance

- [ ] Sections A–L are fully checked.
- [ ] Any unchecked item has a tracked blocker with exact path, missing item,
      `Reason`, and `ReasonDetail`.
- [ ] No no-go area remains open.
- [ ] The remaining-items list for this 20-step feature folder is empty.

## Cross-references

- Step 01 — authoritative index and meta acceptance.
- Step 11 — Code Red diagnostics.
- Step 13 — error routing and diagnostics export.
- Step 14 — boot failure banner.
- Step 19 — test matrix and static audits.
- Sibling storage step 40 — storage-specific acceptance baseline.
- Owner memory — [Verbose logging diagnostics](mem://standards/verbose-logging-and-failure-diagnostics).

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
