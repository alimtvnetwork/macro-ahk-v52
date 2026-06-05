# Audit 04 — `04-version-display-and-build-stamp.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/04-version-display-and-build-stamp.md`
- **Auditor focus:** How blindly can an AI/LLM implement unified versioning, build stamping, visible build IDs, diagnostics integration, and log correlation without timestamp policy violations or drift between generated files?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score after re-audit: **93 / 100**

## Root cause fixed

This audit was stale. It was written before `04-version-display-and-build-stamp.md` added the hard `readme.txt` timestamp boundary, dedicated generated version module, deterministic `BUILD_ID` suffix precedence, environment-stable build-time mode, Code-Red-formatted build errors, canonical runtime Code Red payload shape, diagnostics filename sanitization, surface-scoped reload behavior, and complete test list. The old audit also still marked steps 14–20 as pending even though the canonical spec folder now contains all 20 files.

**Time spent:** ~6 min.

| Dimension | Score | Notes |
|---|---:|---|
| Clarity of contract | 24 / 25 | Version ownership, generated output, UI surfaces, diagnostics, Code Red integration, copy behavior, and reload scope are clear. |
| Determinism | 24 / 25 | SHA precedence, `nogit` release failure, build-time inputs, README timestamp ban, and generator ownership are now deterministic. |
| Completeness of acceptance | 19 / 20 | Acceptance covers version sync, generated-file protection, timestamp boundary, UI copy behavior, Code Red payloads, diagnostics, and reload scope. |
| Cross-references | 14 / 15 | Step 05, 11, and 12 dependencies are explicit and no longer rely on memory-only rules. |
| Pitfalls | 12 / 15 | Pitfalls cover constants overwrite, README timestamps, runtime manifest reads, package rewrites, `nogit`, hover-only display, clipboard failure, and filename safety. |

## Gap analysis (detailed)

### G1 — `BUILD_TIME_ISO` conflicts with strict `readme.txt` timestamp prohibition if copied blindly (RESOLVED)

The spec now has a hard boundary: build timestamps and diagnostics timestamps are allowed only in generated source metadata or diagnostics artifacts, and must never be written to or proposed for `readme.txt` automation.

### G2 — `constants.ts` generation may overwrite existing shared constants (RESOLVED)

The generator now writes only `src/shared/generated/version.ts` and explicitly must not overwrite `src/shared/constants.ts` or non-version constants.

### G3 — Single source of truth conflicts with package-version verification wording (RESOLVED)

The contract now states `manifest.json#version` is canonical, `package.json#version` is a manually maintained mirror, and the prebuild verifier fails without silently rewriting `package.json`.

### G4 — `BUILD_ID = version + short git sha` lacks deterministic no-git/dirty-tree rules (RESOLVED)

The spec now defines suffix precedence: `BUILD_SHA`, then `git rev-parse`, then release descriptor / `.gitmap`, then `nogit` only for local development. Release packaging must fail on `nogit`.

### G5 — `BUILD_TIME_ISO` makes generated snapshots nondeterministic (RESOLVED)

The spec now uses environment-stable generated module mode: `SOURCE_DATE_EPOCH`, then `BUILD_TIME_ISO`, then local `new Date().toISOString()` only when stable inputs are absent.

### G6 — Reference generator uses bare `console.error` instead of namespace logger context (RESOLVED)

The spec now separates build-script diagnostics from runtime namespace logging and requires `formatCodeRedBuildError`-style build errors with `Path`, `Missing`, `Reason`, and `ReasonDetail`.

### G7 — Code Red example lacks mandatory diagnostic arrays (RESOLVED)

The runtime Code Red example now includes canonical build field plus `Path`, `Missing`, `Reason`, `ReasonDetail`, `SelectorAttempts`, and `VariableContext`.

### G8 — Visible UI surfaces include optional surfaces without fallback wording (RESOLVED)

The spec now scopes surfaces correctly: popup is mandatory now; options page and in-page panel become mandatory only once those surfaces exist for their own steps.

### G9 — Clipboard behavior lacks failure handling (RESOLVED)

The copy contract now requires user-gesture clipboard usage, a safe fallback or `data-copy-state="failed"`, and no crash / no Code Red for clipboard denial.

### G10 — `BUILD_ID` in filenames needs sanitization rules (RESOLVED)

Diagnostics filename construction now defines `fileSafeBuildId` and `fileSafeIso` transformations while keeping raw values inside root `manifest.txt`.

### G11 — Reload stamp refresh promise is too strong (RESOLVED)

Reload behavior is now surface-scoped: popup/options refresh on next render, background logs refresh after worker restart, and existing in-page panels refresh only after message/reinject/page reload.

### G12 — Tests do not include production drift checks (RESOLVED)

The test list now includes stamp fixtures, version sync, constants preservation, release SHA failure/precedence, build-time stability, `readme.txt` timestamp boundary, popup/component copy behavior, logger payload validation, and diagnostics export checks.

## Blocker list for blind AI implementation

1. None for this file after re-audit.

## Recommendation

Keep this spec as the unified version/build-stamp contract. The remaining risk is only implementation drift if the named version, logger, diagnostics, and README-boundary tests are not kept current.

## Remaining audit items

1. 05-extension-reload-manual
2. 06-extension-reload-auto-on-file-change
3. 07-status-and-health-panel
4. 08-script-injection-lifecycle
5. 09-injection-idempotency-sentinel
6. 10-reinject-and-uninject
7. 11-error-logging-discipline
8. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 04 — 04-version-display-and-build-stamp.md` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

