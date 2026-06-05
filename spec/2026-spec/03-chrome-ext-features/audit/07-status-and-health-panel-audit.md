# Audit 07 — Status and Health Panel

- **Source spec**: `../07-status-and-health-panel.md`
- **Audit date**: 2026-06-05 (duration ~5 min)
- **Audited against**: `mem://standards/timer-and-observer-teardown`,
  `mem://constraints/no-retry-policy`,
  `mem://standards/error-logging-via-namespace-logger.md`,
  `mem://features/new-tab-no-url-guard`,
  `mem://preferences/dark-only-theme`,
  `mem://architecture/injection-cache-management`,
  `mem://architecture/data-storage-layers`.

## Score: 91 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 | 23 |
| Determinism (AI can implement)  |     25 | 23 |
| Completeness of acceptance      |     20 | 18 |
| Cross-references                |     15 | 13 |
| Pitfalls coverage               |     15 | 14 |
| **Total**                       |    100 | **91** |

## Resolved issues (vs prior audit)

- **G1 (placeholder initial state):** `INITIAL_SNAPSHOT` constant defined in `types.ts` with explicit `worker/tab/errors/heartbeatIso` fields; `heartbeatIso = new Date(0).toISOString()` renders as `"never"`.
- **G2 (Rules of Hooks):** Split into `<PreviewPanel/>` and `<LivePanel/>` sibling components; top-level `StatusPanel` only branches on `isExtensionPopup()` — no hook called before the branch.
- **G3 (missing primitives):** `Row`, `Pill`, `RelativeTime`, `VersionBadge` listed in the **Internal components** table with props; `tone()` + `toneClass()` defined with full tone-class map.
- **G4 (`buildId` provenance):** Probe handler intentionally omits `buildId`; hook always overrides with `BUILD_ID` from `@shared/constants`; documented as a defense against stale SW replies.
- **G5 (timer leak):** Hook uses `AbortController` + `setTimeout` + `try { … } finally { clearTimeout(t); }`.
- **G6 (dedup scope):** "Session = one SW lifetime" pinned; `dedupSet()` stored on `globalThis.__statusProbeDedup`, reinitialized on cold SW start.
- **G7 (dark-only):** `CLASS` map uses semantic tokens (`bg-success/15 text-success`, `bg-destructive/15 text-destructive`); acceptance includes lint rule `no-raw-palette-colors`.
- **G8 (routing):** `HashRouter` pinned; `useOpenErrorsPanel()` exported from `src/popup/routes.ts`; no raw `href="#/..."` anchors.
- **G9 (`countErrorsSince` source):** Reads `error_events` from session SQLite (step 16); on failure returns 0 + one `ErrorStoreUnavailable` Code Red per SW lifetime via `writeCodeRedOnce`.
- **G10 (heartbeat thresholds):** `heartbeatTone()` defined — >10 s `warning`, >30 s `danger` and forces `HeartbeatStale` Code Red.
- **G11 (perf budget):** Acceptance now includes `StatusPanel.perf.test.tsx` (first paint <50 ms, snapshot <300 ms).
- **G12 (stale-SW pitfall):** "Trusting `reply.buildId`" listed in Pitfalls and asserted in `useStatusSnapshot.buildId.test.ts`.

## Remaining gaps (minor)

### R1 — `sendRuntimeMessageSafe` `{ signal }` option not in step 03's adapter contract (LOW)

The hook passes `{ signal: ctrl.signal }` to `sendRuntimeMessageSafe`. Step 03 owns that signature. If the adapter ignores `signal`, the timeout becomes advisory only (state still updates to `worker.error` because of the `AbortError` reject, but the in-flight `sendMessage` is not actually cancelled).

**Fix:** Add a note: "Step 03 MUST accept `{ signal? }` and short-circuit on abort." Add adapter test.

### R2 — `chrome.runtime.lastError` not surfaced by reply shape (LOW)

`reply.reason` is read but `SendMessageResult` shape (owned by step 03) is not pinned here. Risk: a blind implementer may forget to populate `reason` on the timeout/abort path.

**Fix:** One-line cross-ref pinning `{ ok, reason?, data? }` shape, matching audit 05 R2.

### R3 — Sticky footer + 5–6 rows can overflow the popup's 600 px max-height (LOW)

No `max-height` or `overflow-y` on the `<section>`. Long error tooltips can push the footer offscreen.

**Fix:** Add `max-h-[560px] overflow-y-auto` on the panel, keep `<footer>` `sticky bottom-0`.

### R4 — Heartbeat tone re-evaluation runs only on probe tick (LOW)

`heartbeatTone()` is computed inside `tick()`. Between ticks (2 s), a stale heartbeat will not retint until the next probe arrives. Acceptable, but tests should assert tinting based on the rendered `<RelativeTime/>` clock, not the snapshot field.

**Fix:** Move the tone forcing into a `useEffect` keyed on `Date.now() / 1000` or compute live inside `<RelativeTime/>`.

## Blocker list for blind AI implementation

None remaining. R1–R4 are polish, not blockers.

## Recommendation

Spec is implementation-ready. Apply R1–R4 in a follow-up patch to reach ~95/100.

## Remaining audit items

1. 09-injection-idempotency-sentinel
2. 10-reinject-and-uninject
3. 11-error-logging-discipline
4. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 07 — Status and Health Panel` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
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

- Implementations MUST honor every numeric default declared in [runtime defaults](../../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

