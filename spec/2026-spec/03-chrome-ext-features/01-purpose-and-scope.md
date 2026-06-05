# 01 — Purpose and Scope

## Purpose

Define a generic, vendor-neutral contract for the *runtime UX features* every
production-grade Manifest V3 (MV3) Chromium extension should ship. The spec is
written so an implementing AI/LLM can build the feature inside any extension
without needing access to a specific product's source.

The spec answers, for each feature: **what problem it solves**, **the minimum
contract**, **a generic reference implementation**, **common pitfalls**, and a
**short acceptance checklist**.

## Audience

- An LLM agent (Lovable, Claude, GPT, Gemini, etc.) tasked with adding any of
  the listed features to a Chromium extension.
- A human reviewer auditing whether an extension meets the baseline.

The reader is assumed to know JavaScript/TypeScript, the MV3 manifest shape,
and how to load an unpacked extension. No product-specific knowledge is
assumed.

## In scope (the 20 features)

1. Extension reload — manual button + auto-on-file-change (dev mode).
2. Reload status / health panel with build id and last error.
3. Version display contract (manifest ↔ constants ↔ UI all in sync).
4. Script injection lifecycle, idempotency sentinel, re-inject, uninject.
5. Error logging discipline — Code Red rule, namespace logger, error routing,
   boot-failure banner, error count broadcast.
6. Floating in-page panel — minimize / restore / drag-and-drop, persisted
   position.
7. Storage integration pointers — SQLite (sql.js), IndexedDB cache,
   `chrome.storage.local` — when to use each (full spec lives in the sibling
   `03-db-and-sqlite-integration-with-chrome-extension/` folder).
8. Testing matrix and acceptance criteria.

## Out of scope (non-goals)

- Chrome Web Store publishing flow (handled by `02-ci-cd-spec-for-chrome-extensions/`).
- Product branding, copy, colors, iconography.
- Server-side APIs the extension may call.
- Cross-browser parity for non-Chromium engines (Firefox / Safari).

## Vocabulary

- **MV3** — Manifest V3, the only manifest version this spec targets.
- **Service Worker (SW)** — the MV3 background script. Ephemeral; no DOM, no
  `window`, no `localStorage`.
- **MAIN world / ISOLATED world** — the two JS execution contexts inside a tab.
  Content scripts default to ISOLATED; page-reachable SDK objects must run in
  MAIN.
- **Sentinel** — a DOM attribute or globally-stamped marker proving an
  irreversible setup step already happened (e.g. injection).
- **Code Red error** — any failure whose log must include the *exact path*, the
  *missing item*, and the *reason* (see `11-error-logging-discipline.md`).
- **Build id** — short hash + version string surfaced in UI so users and
  developers can correlate a bug report to a build.

## Guiding principles

1. **No remote code.** Everything ships in the package; nothing fetched from a
   CDN at runtime (MV3 rejects it anyway).
2. **Idempotent by default.** Every injection / setup step must be safe to run
   twice; use a sentinel.
3. **Fail loud, fail typed.** Never swallow errors. Always log via the
   namespace logger with the Code Red shape.
4. **No retries without permission.** Sequential fail-fast; recursive
   exponential backoff is forbidden unless explicitly specified.
5. **Tests ship with features.** Each step ends with a test obligation; a
   feature without a matching unit / component / manual E2E is incomplete.

## How an LLM should consume this folder

1. Read `README.md` for the index.
2. Read this file (`01-purpose-and-scope.md`) for ground rules.
3. Pick the step number matching the feature you've been asked to implement.
4. Treat the **Contract** section as the API; treat the **Acceptance** section
   as the test plan.
5. If a step says "see `…/03-db-…/NN-….md`", open that file before coding.
