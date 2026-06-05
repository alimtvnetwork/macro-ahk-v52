# Audit 13 — Error Routing and Errors Panel

- **Source spec**: `../13-error-routing-and-panel.md`
- **Audit date**: 2026-06-05
- **Audited against**: `mem://architecture/real-time-error-synchronization`,
  `mem://features/log-diagnostics-export`,
  `mem://architecture/logging-data-contract`,
  `mem://architecture/session-logging-system`,
  `mem://architecture/extension-error-management`,
  `mem://standards/verbose-logging-and-failure-diagnostics`,
  `mem://constraints/no-retry-policy`,
  `mem://standards/unknown-usage-policy`,
  audits 07, 11, and 12.

## Score: 77 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 |    20 |
| Determinism (AI can implement)  |     25 |    18 |
| Completeness of acceptance      |     20 |    16 |
| Cross-references                |     15 |    12 |
| Pitfalls coverage               |     15 |    11 |
| **Total**                       |    100 |  **77** |

## Root cause

The spec correctly identifies the user-facing failure mode: structured errors
exist, but without a single background-owned route the UI can show stale counts,
blank panels, or detail rows that do not match the badge. The remaining risk is
not the high-level flow; it is underspecified message typing, storage mutation
ownership, and lifecycle cleanup around MV3 contexts.

## Gap analysis

### G1 — Message response envelopes are missing (Critical)
`MSG_GET_ERROR_SUMMARY`, `MSG_GET_ERROR_ROWS`, `MSG_RESOLVE_ERROR`, and
`MSG_CLEAR_RESOLVED_ERRORS` are listed as strings, but request/response unions
are not defined. Implementers may return raw arrays, throw into `sendResponse`,
or mix success and failure shapes. **Fix:** add typed envelopes:
`{ ok: true, data, buildId } | { ok: false, Reason, ReasonDetail }` for every
handler. Failed summary computation must return `ok:false` and log Code Red
with `path="sqlite://Logs/Errors#get-summary"`.

### G2 — `MSG_RESOLVE_ERROR` and `MSG_CLEAR_RESOLVED_ERRORS` are declared but not handled
The background handler snippet only handles summary and rows. Acceptance requires
resolve/clear actions, so a copy-paste implementation will render buttons that
never work. **Fix:** include both message branches and specify the write order:
validate request → SQLite update/delete/archive → recompute summary → broadcast
`ERROR_COUNT_CHANGED` → return response.

### G3 — Broadcast fan-out can reject before tab sends run
`await chrome.runtime.sendMessage(message).catch(...)` is safe, but
`const tabs = await chrome.tabs.query({})` is not guarded. If the runtime context
is invalidated during auto-reload, broadcast can throw and skip all follow-up
cleanup. **Fix:** wrap each phase independently; classify invalidated runtime as
`Reason="ExtensionContextInvalidated"` and fail-fast without retry.

### G4 — Message listener leaks type unsafety through `request?.kind`
Per no-explicit-unknown rules, handlers need designed request types and a type
guard, not broad optional property checks. **Fix:** define `ErrorRoutingRequest`
union plus `isErrorRoutingRequest(value: JsonValue): value is ErrorRoutingRequest`.
Rejected envelopes return `InvalidErrorRoutingRequest` with `ReasonDetail`.

### G5 — Summary ordering assumes normalized rows are newest-first
`newestErrorIso: normalized[0]?.timestampIso ?? null` only works if
`logStore.getErrorRows()` guarantees descending timestamp order. The spec does
not say that. **Fix:** state SQL must use `ORDER BY TimestampIso DESC, Id DESC`,
and `newestErrorIso` must be computed after normalization from the sorted rows.

### G6 — 24-hour count semantics conflict with resolved filtering
The snippet fetches `includeResolved:false`, then sets `last24hCount` to
`normalized.length`. Contract says last-24h count is displayed in Status panel,
but does not clarify whether resolved rows remain included. **Fix:** define two
fields or one rule. Recommended: `last24hUnresolvedCount` for badges and
`last24hTotalCount` for panel analytics; keep `unresolvedCount` global.

### G7 — Legacy missing-field rendering can violate Code Red mandatory shape
The spec says legacy missing fields render `null` plus reason badge. That is good
for UI, but exports must not emit `null` without the reason, or support reports
become ambiguous. **Fix:** normalized row should include `normalizationWarnings:
string[]`; exports must include warnings beside any synthesized `null`.

### G8 — `mergeCounts(current, message)` is undefined and can regress filters
The hook mutates summary from broadcast counts but rows and filter state may
still be stale. **Fix:** broadcast should set a `dirtyRows=true` flag when counts
change; if the panel is open and visible, it fetches rows once. Do not refetch
while hidden; do not poll faster than 30 seconds.

### G9 — Polling fallback lacks timer ownership constraints
The hook clears the interval in `teardown`, but the spec does not require
`visibilitychange` pause/resume or duplicate-listener prevention across route
remounts. **Fix:** acceptance must assert one active interval per mounted panel,
`pagehide` cleanup, and hidden-tab pause per timer teardown memory.

### G10 — Resolve/delete authorization and source are underspecified
`resolvedBy="user" | "system"` is listed, but there is no route-level rule for
who can call it. In an extension, popup/options are trusted extension contexts;
page MAIN is not. **Fix:** handler must reject resolve/clear requests from page
relay and content-script-originated messages unless explicitly proxied by the
background with `sourceContext="popup" | "options"`.

### G11 — Diagnostics export scope omits BootFailureBanner support reports
The export includes errors and injection events, but boot-critical failures are
also surfaced through `BootFailureBanner`. **Fix:** include the persisted
`marco_last_boot_failure` equivalent, boot timings, WASM probe snapshot, and
filtered benign-warning tally in the diagnostics ZIP when present.

### G12 — Acceptance lacks stale-build and casing regression tests
Prior audits found build-id mismatch and PascalCase/camelCase drift. This spec
mentions both but does not test them. **Fix:** add tests for PascalCase SQLite
rows, camelCase frontend rows, mixed legacy rows, and `buildId` mismatch causing
warning state rather than overwriting current counts.

## Required spec amendments

1. Add complete request/response TypeScript unions for all four message types.
2. Add resolve and clear branches to `bindErrorRoutingHandler()`.
3. Define SQL ordering and count semantics (`unresolved`, `last24hTotal`,
   `last24hUnresolved`).
4. Require `normalizationWarnings[]` for legacy rows and diagnostics export.
5. Add sender-origin rules: only trusted extension UI can resolve/clear rows.
6. Include boot-failure persisted diagnostics in the ZIP export contract.

## Time spent

~3 minutes: read source spec, checked prior audits and project memories, traced
the route from logger write → count broadcast → panel state → export.

## Post-audit status

The remaining files named by this audit were later created or aligned under the
canonical step-01 slugs:

1. 14-boot-failure-banner
2. 15-floating-in-page-panel
3. 16-storage-sqlite-pointer
4. 17-storage-indexeddb-pointer
5. 18-storage-chrome-local-pointer
6. 19-testing-matrix
7. 20-acceptance-criteria

## Acceptance

- [ ] The implementation satisfies the `Audit 13 — Error Routing and Errors Panel` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
