# 03 — Chrome Extension Features (Generic Spec)

A generic, vendor-neutral specification for Manifest V3 Chrome extensions. Any
AI/LLM should be able to read these files top-to-bottom and implement the
described features inside *any* Chromium extension (Chrome / Edge / Brave /
Arc / Opera), without coupling to a specific product.

## How to read

Files are sequenced `01-…`, `02-…`, etc. Read in order. Each step is
self-contained: problem → contract → reference implementation → pitfalls →
acceptance.

## Index (20 steps)

1. `01-purpose-and-scope.md` — what this spec covers, who it is for, and the non-goals.
2. `02-manifest-v3-foundations.md` — MV3 baseline, service worker, MAIN/ISOLATED worlds.
3. `03-folder-and-file-layout.md` — canonical extension source tree.
4. `04-version-display-and-build-stamp.md` — version contract across manifest / constants / UI.
5. `05-extension-reload-manual.md` — user-clickable "Reload Extension" action.
6. `06-extension-reload-auto-on-file-change.md` — dev-mode file watcher + auto reload.
7. `07-status-and-health-panel.md` — reload status, build id, last-error surface.
8. `08-script-injection-lifecycle.md` — 7-stage injection (idle → ready → injected).
9. `09-injection-idempotency-sentinel.md` — `data-marco-injected` style guard, never double-inject.
10. `10-reinject-and-uninject.md` — force re-inject and clean uninject flows.
11. `11-error-logging-discipline.md` — Code-Red error contract (path + missing item + reason).
12. `12-namespace-logger-contract.md` — `Logger.error()` namespace pattern, no bare `console.log`.
13. `13-error-routing-and-panel.md` — error counts, ERROR_COUNT_CHANGED broadcast, errors panel.
14. `14-boot-failure-banner.md` — visible top-level banner when bootstrap fails.
15. `15-floating-in-page-panel.md` — minimize / restore / drag-drop / position persistence.
16. `16-storage-sqlite-pointer.md` — sql.js bundling, per-namespace DB pattern (see `../03-db-and-sqlite-integration-with-chrome-extension/`).
17. `17-storage-indexeddb-pointer.md` — injection cache, invalidation on build-id change.
18. `18-storage-chrome-local-pointer.md` — when to use `chrome.storage.local` vs SQLite vs IDB.
19. `19-testing-matrix.md` — unit, component, manual Chrome E2E coverage requirements.
20. `20-acceptance-criteria.md` — pass/fail checklist for an implementing AI.

## Cross-references

- `../02-ci-cd-spec-for-chrome-extensions/` — packaging, release, distribution.
- `../03-db-and-sqlite-integration-with-chrome-extension/` — full storage spec.

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
- See [folder index](../readme.md) for sibling specs and cross-references.

## Acceptance

- [ ] Every sibling `*.md` listed below this index also declares its own `## Acceptance` block (verified by `scripts/audit/check-acceptance.mjs`).
- [ ] All relative links in this file resolve (verified by `scripts/audit/check-dangling-links.mjs`).
- [ ] No operational numeric constant is hardcoded here without binding to `reference/05-runtime-defaults.md` (verified by `scripts/audit/check-must-constants.mjs --strict`).
- [ ] Composite audit score for this folder is `100 / 100` (verified by `scripts/audit/audit-scan.py`).

