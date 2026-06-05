# 01 — Purpose and Scope

> **Status:** Normative meta/index. This file ships no executable code; the
> implementation obligations live in steps 02–20. This file is itself
> non-implementable — no test obligation applies to it (see G5 below) — but
> its **Acceptance (meta)** block MUST be enforced by the audit script
> `scripts/audit-spec-index.mjs` (see step `19-testing-matrix.md`).

## Purpose

Define a vendor-neutral contract for the *runtime UX features* every
production-grade Manifest V3 (MV3) Chromium extension MUST ship. The folder is
written so an implementing AI/LLM can build any feature inside any extension
without needing access to a specific product's source.

Each step file answers, for one feature: **what problem it solves**, **the
minimum contract**, **a generic reference implementation**, **common
pitfalls**, and a **machine-checkable acceptance checklist**.

## Audience

- An LLM agent (Lovable, Claude, GPT, Gemini, etc.) tasked with adding any of
  the listed features to a Chromium extension.
- A human reviewer auditing whether an extension meets the baseline.

The reader is assumed to know JavaScript/TypeScript, the MV3 manifest shape,
and how to load an unpacked extension. A minimum MV3 manifest skeleton lives
in `02-manifest-v3-foundations.md` §"Minimum manifest skeleton" — link from
here is normative.

## Authoritative step index (20 features)

The folder ships exactly 20 numbered specs. An LLM told "implement step NN"
MUST resolve the file by this table; do not infer from the bullets below or
from `README.md` alone.

| Step | File                                          | Feature                                                          |
|-----:|-----------------------------------------------|------------------------------------------------------------------|
|  01  | `01-purpose-and-scope.md`                     | This index + ground rules (non-implementable).                   |
|  02  | `02-manifest-v3-foundations.md`               | MV3 manifest, SW lifecycle, MAIN/ISOLATED world model, CSP.      |
|  03  | `03-folder-and-file-layout.md`                | Canonical `src/` tree, module boundaries, build output layout.   |
|  04  | `04-version-display-and-build-stamp.md`       | Version + build-id surfaced in UI; manifest↔constants sync.      |
|  05  | `05-extension-reload-manual.md`               | "Reload" button in popup / dev panel.                            |
|  06  | `06-extension-reload-auto-on-file-change.md`  | Dev-mode auto-reload on file change.                             |
|  07  | `07-status-and-health-panel.md`               | Status panel: build, last error, last reload, injection counts.  |
|  08  | `08-script-injection-lifecycle.md`            | 7-stage MAIN/ISOLATED injection lifecycle.                       |
|  09  | `09-injection-idempotency-sentinel.md`        | DOM sentinel attribute; idempotent re-entry.                     |
|  10  | `10-reinject-and-uninject.md`                 | Forced re-inject + clean uninject with teardown callbacks.       |
|  11  | `11-error-logging-discipline.md`              | Code Red rule, SelectorAttempts, VariableContext.                |
|  12  | `12-namespace-logger-contract.md`             | `RiseupAsiaMacroExt.Logger` namespace, payload schema.           |
|  13  | `13-error-routing-and-panel.md`               | `ERROR_COUNT_CHANGED` broadcast, options-page error panel.       |
|  14  | `14-boot-failure-banner.md`                   | `BootFailureBanner` for fatal SW errors.                         |
|  15  | `15-floating-in-page-panel.md`                | Minimize / restore / drag, persisted position.                   |
|  16  | `16-storage-sqlite-pointer.md`                | Pointer to authoritative SQLite (sql.js) spec.                   |
|  17  | `17-storage-indexeddb-pointer.md`             | Pointer to authoritative IndexedDB cache spec.                   |
|  18  | `18-storage-chrome-local-pointer.md`          | Pointer to authoritative `chrome.storage.local` spec.            |
|  19  | `19-testing-matrix.md`                        | Unit / component / manual Chrome E2E coverage matrix.            |
|  20  | `20-acceptance-criteria.md`                   | Aggregate acceptance gate for the entire folder.                 |

## Canonical identifiers (bind vocabulary to symbols)

Every term in §Vocabulary maps to exactly one canonical identifier. An LLM
MUST NOT invent alternate names.

| Term              | Canonical identifier                                                   | Defined in                                  |
|-------------------|------------------------------------------------------------------------|---------------------------------------------|
| Namespace         | `RiseupAsiaMacroExt` (global, MAIN world)                              | step 08 §"Bootstrap"                        |
| Build id          | `RiseupAsiaMacroExt.BUILD_ID: string` from `src/shared/build-id.ts`    | step 04                                     |
| Sentinel          | DOM attr `data-riseupasia-macro-ext-injected="<buildId>"` on `<html>`  | step 09                                     |
| Script ids attr   | DOM attr `data-riseupasia-macro-ext-script-ids="<csv>"` on `<html>`    | step 09 (cap 64; see audit G6)              |
| Code Red event    | `logCodeRedFailure(payload: CodeRedLogPayload)`                        | step 11 §"Helper"                           |
| Namespace logger  | `RiseupAsiaMacroExt.Logger.{debug,info,warn,error}`                    | step 12                                     |
| Error broadcast   | `chrome.runtime.sendMessage({ type: "ERROR_COUNT_CHANGED", count })`   | step 13                                     |
| Boot banner       | DOM id `#riseupasia-macro-ext-boot-failure-banner`                     | step 14                                     |
| New-tab guard     | `isNewTabOrBlankUrl(url)` from `src/shared/url-utils.ts`               | step 08                                     |
| Verbose flag      | `Project.VerboseLogging: boolean` (chrome.storage.local)               | step 11                                     |

Forks MAY rename `RiseupAsiaMacroExt` but MUST keep the contract (same attr
shape, same payload schema, same broadcast name with their own prefix).

## In scope

The 20 step files above. Each step ships an isolated contract — implement one
without reading the others, except where a step explicitly links forward.

## Out of scope (non-goals)

- Chrome Web Store publishing flow — see sibling
  `../02-ci-cd-spec-for-chrome-extensions/` **(future; mark `(pending)` until
  the folder exists)**.
- Server-side APIs the extension may call.
- Product branding, copy, colors, iconography.
- Cross-browser parity for non-Chromium engines (Firefox / Safari).
- Storage internals — see sibling
  `../03-db-and-sqlite-integration-with-chrome-extension/` (exists). Steps
  16–18 in this folder are thin pointers into that folder.

## Vocabulary

Each term below MUST resolve to its canonical identifier (table above).

- **MV3** — Manifest V3, the only manifest version this spec targets.
- **Service Worker (SW)** — the MV3 background script. Ephemeral; no DOM, no
  `window`, no `localStorage`.
- **MAIN world / ISOLATED world** — the two JS execution contexts inside a
  tab. Content scripts default to ISOLATED; page-reachable SDK objects must
  run in MAIN.
- **Sentinel** — a DOM attribute proving an irreversible setup step already
  happened. Canonical: `data-riseupasia-macro-ext-injected="<buildId>"`.
- **Code Red error** — any failure whose log MUST include the *exact path*,
  the *missing item*, and the *reason*. Emitted via `logCodeRedFailure`.
- **Build id** — short hash + version string surfaced in UI so users can
  correlate a bug report to a build. Constant: `RiseupAsiaMacroExt.BUILD_ID`.

## Guiding principles

1. **No remote code.** Everything ships in the package. MV3 enforces this via
   the default CSP `script-src 'self'; object-src 'self';` — see step 02
   §"CSP defaults that bite". A manifest override that adds `'unsafe-eval'`
   or any `http(s):` source is forbidden.
2. **Idempotent by default.** Every injection / setup step MUST be safe to
   run twice; use the sentinel (step 09).
3. **Fail loud, fail typed.** Never swallow errors. Always log via the
   namespace logger (step 12) with the Code Red shape (step 11). Enforced
   statically by `scripts/audit-error-swallow.mjs` (see step 11 §"Tests").
4. **No retries without permission.** Sequential fail-fast; recursive
   exponential backoff is forbidden unless explicitly specified by the step.
   Enforced by `scripts/audit-retry-policy.mjs` (see step 19) and the
   project-wide ban on retry queues.
5. **Tests ship with features.** Each step ends with a test obligation; a
   feature without a matching unit / component / manual Chrome E2E test is
   incomplete (see step 19).

## How an LLM should consume this folder

1. Read this file for the step index and canonical identifiers.
2. Pick the step number matching the feature you were asked to implement.
3. Treat the **Contract** section as the API; treat the **Acceptance** section
   as the test plan.
4. If a step says "see `…/03-db-…/NN-….md`", open that file before coding.
5. If a referenced sibling folder is labelled `(pending)` or `(future)`,
   STOP and surface the gap — do not invent the missing content.

## Acceptance (meta)

Audit script `scripts/audit-spec-index.mjs` MUST verify:

- [ ] Every step `01..20` file exists in this folder with the slug shown in
      the index table above.
- [ ] `README.md` lists all 20 with the same slug and order.
- [ ] No step references a sibling folder that does not exist without the
      `(pending)` or `(future)` label.
- [ ] Every canonical identifier in the table above is defined in exactly one
      step file (no duplicate definitions; no orphans).
- [ ] Every term in §Vocabulary appears in the canonical-identifier table.

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
- See [folder index](README.md) for sibling specs and cross-references.

## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
