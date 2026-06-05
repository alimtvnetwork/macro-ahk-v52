# 19 — Testing Matrix

## Why this step exists

The folder now defines twenty MV3 extension contracts that touch manifest
packaging, reloads, injected MAIN-world scripts, DOM sentinels, teardown,
diagnostics, SQLite, IndexedDB, `chrome.storage.local`, and UI surfaces. A
single happy-path unit test cannot prove those contracts. The repeated failure
class is a spec or implementation claiming “done” while an indexed file is
missing, a retry loop slips in, a stale injected panel survives uninject, or a
Code Red row lacks the mandatory diagnostic fields. This step defines the test
matrix and static audits that make each step verifiable.

## Contract

1. **Tests ship with features.** Every implemented step from 02–18 has at least
   one unit, regression, component, E2E, manual Chrome, or static-audit test.
2. **Static audits are tests.** Spec index checks, retry-policy scans, storage
   tier scans, no-remote-code scans, and Code Red field scans count as required
   tests when the risk is structural.
3. **Manual Chrome E2E is allowed and required where browsers matter.** MV3
   service-worker suspend, extension reload, MAIN/ISOLATED injection, and
   packaged asset loading must be verified in a real Chromium profile.
4. **No hidden retries in tests.** Tests must assert fail-fast behavior for
   reload, boot, cache, storage, and message routes. No test should pass only
   because an unauthorized retry eventually succeeded.
5. **Diagnostics are asserted, not snapshots-only.** Tests check exact fields:
   `Path`, `Missing`, `Reason`, `ReasonDetail`, `SelectorAttempts`, and
   `VariableContext` where applicable.
6. **Timer teardown is testable.** Any feature with intervals, timeouts,
   observers, message listeners, storage listeners, or pointer listeners must
   have a teardown assertion.
7. **Source-of-truth boundaries are tested.** UI/content code must not import
   SQLite/DB managers; IndexedDB remains cache-only; `chrome.storage.local`
   remains small JSON only.
8. **Index completeness is a gate.** Steps 01–20 must exist with the exact
   filenames listed by step 01 and `README.md`.

## Required test categories

| Category | Purpose | Required for |
|---|---|---|
| Unit | Pure helpers, validators, classifiers, mappers. | Build id, URL guards, log normalization, boot cause, tier selection. |
| Regression | Locks a previously fixed bug. | Retry bans, storage casing, new-tab guard, stale cache, bind safety. |
| Component | UI state and rendering with mocked routes. | Popup status, Errors panel, BootFailureBanner, floating panel. |
| Hook / lifecycle | Timers, listeners, pagehide, hidden-tab behavior. | Error summary hook, panel drag, banner copy timers. |
| Static audit | File/index/import/pattern rules. | Spec index, no remote code, no background localStorage, no CI filter. |
| Manual Chrome E2E | Real MV3 browser behavior. | Extension reload, packaged wasm, service-worker restart, MAIN injection. |

## Step-by-step coverage matrix

| Step | Minimum required coverage |
|---:|---|
| 01 | Static: `audit-spec-index` validates every indexed file, slug, order, and canonical identifier. |
| 02 | Static + manifest fixture: MV3 only, no remote CSP, WASM CSP conditional, permissions minimal. |
| 03 | Static: canonical folder layout, no implementation files in forbidden/read-only folders, build output shape. |
| 04 | Unit/static: manifest version, constants version, UI version, build id, and scripts remain synchronized. |
| 05 | Unit/component/manual: reload action typed result, status update, user-triggered only, no Code Red false positive. |
| 06 | Unit/manual: dev watcher gated to development, file-change reload sequence, no production hot-loop. |
| 07 | Component/hook: status panel renders health, build, reload, injection, storage, and error summary states. |
| 08 | Unit/manual: tab eligibility, new-tab guard, MAIN/ISOLATED staging, host-access failures. |
| 09 | Unit: tri-state sentinel probe, build mismatch, in-flight mutex, script-id overflow hash/count path. |
| 10 | Unit/manual: re-inject force path, teardown order, failed teardown blocks sentinel clearing. |
| 11 | Unit/regression: Code Red payload shape, sensitive masking, verbose logging truncation gate. |
| 12 | Static/unit: namespace cap, `System.*` reservation, no bare error `log()`, typed logger payload. |
| 13 | Unit/hook/component/export: error route envelopes, origin gate, counts, polling teardown, diagnostics ZIP rows. |
| 14 | Unit/component/storage/manual: persisted boot failure, cause classifier, preview-safe banner, report format. |
| 15 | Component/lifecycle/manual: one panel host, drag clamp, minimize persistence, listener/timer teardown. |
| 16 | Static/unit/manual: sql.js bundled asset, loader memoization, no CDN, background-only SQLite. |
| 17 | Unit/static: IndexedDB wrapper-only, cache build/version guards, stub rejection, invalidation triggers. |
| 18 | Unit/static/component: typed wrapper, quota classes, pruner safety, no PascalCase storage rewrite. |
| 19 | Static: this matrix is covered by `audit-feature-test-matrix` or equivalent review checklist. |
| 20 | Static/manual close-out: aggregate acceptance checklist is complete before release. |

## Required static audits

```text
scripts/audit-spec-index.mjs
  Verifies steps 01..20 exist, README and step 01 agree, no missing slugs.

scripts/audit-retry-policy.mjs
  Rejects unauthorized recursive retry, exponential backoff, retry queues, and hidden loops.

scripts/audit-error-swallow.mjs
  Rejects swallowed catch blocks and missing namespace logger usage.

scripts/audit-logger-compliance.mjs
  Verifies Code Red error payloads include exact path, missing item, Reason, ReasonDetail.

scripts/audit-namespaces.mjs
  Verifies namespace format, top-level cap, and System.* reservation.

scripts/audit-force-inject-callers.mjs
  Allows force injection only from approved user/debug routes.

scripts/check-no-background-localstorage.mjs
  Rejects localStorage in MV3 background code.

scripts/check-no-storage-pascalcase-rewrite.mjs
  Rejects StoredProject/StoredScript/StoredConfig casing rewrites.

scripts/check-sqlite-remote-fetch.mjs
  Rejects CDN or remote sql.js / sql-wasm loading.

scripts/__tests__/ci-workflow-trigger-policy.test.mjs
  Verifies .github/workflows/ci.yml uses unfiltered on: push:.
```

Every audit failure prints:

```text
Path: <exact file or runtime path>
Missing: <exact required item>
Reason: <short code>
ReasonDetail: <why this violates the contract>
```

## Manual Chrome E2E checklist

Manual Chrome E2E must be recorded for close-out of browser-dependent steps:

1. Load unpacked extension from the packaged build.
2. Confirm manifest is MV3 and extension pages show the same version/build id.
3. Open a normal web page and confirm injection reaches MAIN-world ready state.
4. Open a new-tab / blank URL and confirm injector refuses to run.
5. Trigger manual reload from UI and confirm status reflects the reload.
6. In dev mode, trigger file-change reload and confirm production builds do not run the watcher.
7. Re-inject and uninject; confirm sentinel, panel host, listeners, and styles are removed in the documented order.
8. Force stale build id and confirm the tri-state sentinel path uses uninject then force inject.
9. Force a boot failure and confirm the banner persists across service-worker restart.
10. Force an error row and confirm Errors panel count, row detail, resolve, clear, and diagnostics export.
11. Confirm sql-wasm loads from `chrome-extension://.../assets/sql-wasm.wasm`, not a CDN.
12. Confirm IndexedDB cache invalidates on build-id change and never serves stub bytes.
13. Confirm `chrome.storage.local` quota pressure displays the expected warning/modal without deleting authoritative data.

## Test naming conventions

- Unit: `*.test.ts`
- Component: `*.test.tsx`
- Regression: `src/test/regression/<bug-or-rule>.test.ts`
- Static guard tests: `scripts/__tests__/*.test.mjs`
- Manual Chrome record: `.lovable/manual-e2e/<date>-chrome-extension-features.md`

Manual records must list browser, extension version, build id, tested steps, and
pass/fail evidence. They must not include secrets or auth tokens.

## Pitfalls

- Counting a mocked unit test as proof of packaged MV3 behavior. Packaged asset
  loading, service-worker restart, and MAIN-world injection need Chrome E2E.
- Using snapshots that hide missing Code Red fields. Assert fields directly.
- Adding a feature but only testing the success path. Test the failure mode this
  feature exists to prevent.
- Adding static audits that auto-fix files. Audits must fail fast and report.
- Reintroducing CI push filters. Push must remain unfiltered.
- Adding CI notifications. They are forbidden.

## Acceptance

- [ ] Every step 01–20 is covered by the matrix above.
- [ ] `audit-spec-index` proves every indexed file exists and slugs match.
- [ ] Static audits cover retry policy, Code Red shape, namespace governance,
      force-inject callers, storage tier boundaries, and CI push trigger policy.
- [ ] Tests assert both success and failure paths for steps 02–18.
- [ ] Lifecycle tests verify timers/listeners/observers are torn down.
- [ ] Manual Chrome E2E record exists for MV3-only behavior.
- [ ] No CI build notifications are added.
- [ ] All guard scripts fail fast with `Path`, `Missing`, `Reason`, and
      `ReasonDetail`.

## Cross-references

- Step 01 — index completeness and canonical identifiers.
- Step 10 — teardown order and force-inject audit.
- Step 11 — Code Red fields, verbose logging gate, sensitive masking.
- Step 13 — Errors panel route and diagnostics export tests.
- Step 14 — boot failure persistence tests.
- Steps 16–18 — storage tests and CI gates from sibling storage spec.
- Step 20 — aggregate go/no-go checklist.

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

## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
