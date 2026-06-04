# 61 — Credit Totals E2E content-script harness scope

**Logged:** 2026-06-04 (KL) — No-Questions Mode active.
**Trigger:** `next 1` resolving the `fixme` in
`tests/e2e/e2e-credit-totals-modal.spec.ts`.

## Ambiguity

The macro-controller panel is content-script-injected into
`lovable.dev/projects/*` via the dynamic 7-stage injection lifecycle
(`mem://architecture/script-injection-lifecycle`). Playwright launches
a persistent extension context, but Chromium under Playwright cannot
authenticate against real `lovable.dev`, and the auto-injector refuses
to mount on `about:blank`/new-tab URLs
(`mem://features/new-tab-no-url-guard`).

Three plausible harness shapes:

| Option | What it does | Pros | Cons | Recommendation |
|---|---|---|---|---|
| A — local fake-lovable HTML served from `tests/e2e/fixtures/lovable-shell.html` + `addScriptTag(macro-controller.iife.js)` with chrome-API mocks | Side-steps auth; bundle runs in a real page | Most accurate to production DOM | Requires mocking `chrome.runtime`/`storage`/`tabs`/SQLite OPFS shim | **Yes — preferred** |
| B — JSDOM unit-style harness invoking `panel-builder.ts` directly | Fast, no Chromium needed | Already covered by existing component tests | Defeats the point of E2E (no real DnD, no real drag events) | No |
| C — Real `lovable.dev` with stored auth cookie | True end-to-end | Brittle, account-bound, CI-hostile | Violates fail-fast/no-retry policy on network flakes | No |

## Why deferred this turn

Option A is a multi-file scaffold (HTML shell + chrome-API mock module
+ SQLite/OPFS shim + addInitScript glue + bundle copy step in
`playwright.config.ts`). That exceeds a single `next` slot. Logged
here so the next `next` opens with a known scope instead of
re-deriving it.

## Decision

Proceed with **Option A** next turn. This turn's `next 1` shipped the
small-scoped item: persisted the `plan-task-ux-20-step` memory entry
so the closed-out UX contract survives future context resets.
