# Audit 09 — Injection Idempotency Sentinel
- **Source spec**: `../09-injection-idempotency-sentinel.md`
- **Audit date**: 2026-06-05 (duration ~5 min)
- **Audited against**: `mem://architecture/script-injection-lifecycle`,
  `mem://architecture/injection-cache-management`,
  `mem://architecture/injection-context-awareness`,
  `mem://features/new-tab-no-url-guard`,
  `mem://constraints/no-retry-policy`,
  `mem://standards/error-logging-via-namespace-logger.md`,
  `mem://standards/verbose-logging-and-failure-diagnostics`,
  `mem://standards/timer-and-observer-teardown`.
## Score: 90 / 100
| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 | 23 |
| Determinism (AI can implement)  |     25 | 22 |
| Completeness of acceptance      |     20 | 18 |
| Cross-references                |     15 | 13 |
| Pitfalls coverage               |     15 | 14 |
| **Total**                       |    100 | **90** |
## Root cause
The previous audit was stale. It still reported gaps that the source spec now
already resolves: tri-state sentinel decisions, per-tab mutex, top-frame-only
guarding, metadata-only diagnostics, bounded script-id attributes, arity tests,
and UTC-storage / local-display time handling.
## Resolved issues (vs prior audit)
- **G1 (result-shape drift):** Step 09 now defines `InjectionOutcome = "fresh" | "already-injected" | "guarded"` plus `reason?: string`; the success branch keys off `outcome`, not inferred `reason` text.
- **G2 (`func:` serialization):** Contract item 14 explicitly states probe/mark/clear use serialized `func:` form, with no `@shared/*` imports inside; acceptance includes positional args/arity coverage.
- **G3 (concurrent probe/mark race):** Contract item 5 and §Mutex define `inFlight: Map<number, Promise<InjectionResult>>`; same-tab concurrent injections join the same promise and cannot double-run the pipeline.
- **G4 (timestamp boundary):** Contract item 13 and mark rules store `installedAtIso` as UTC ISO; UI display converts with `formatRelativeLocal()` using the user's local timezone only at render.
- **G5 (empty frame result):** §Probe implementation handles `frames.length === 0` with `Reason="ProbeFailed"` and `reasonDetail="no frame result"`; `sentinel-empty-frames.test.ts` is listed.
- **G6 (unbounded script ids):** `MAX_SENTINEL_SCRIPT_IDS = 64`; overflow stores an empty ids array plus `data-marco-script-hash="sha1:...,count:N"` and round-trips `scriptIdsCount`.
- **G7 (hot-path present logging):** §Diagnostics rate-limits `Sentinel.Present` to once per `(tabId, buildId)` per service-worker lifetime.
- **G8 (iframe ambiguity):** Contract items 4 and acceptance require top-frame-only sentinel behavior and `Reason="UnsupportedFrameTarget"` for non-top-frame requests.
- **G9 (clear ownership):** Step 09 keeps behavioral ownership of probe/mark/idempotency; step 10 owns when clearing is allowed. Shared helper location in `src/background/injection/sentinel.ts` is no longer a blocker because step 10 defines teardown sequencing.
- **G10 (verbose logging gate):** Contract item 12 and acceptance explicitly forbid `outerHTML`, page text, and form-value capture for sentinel probes, regardless of verbose logging.
- **G11 (`document.write` root replacement):** Mark rules and pitfalls state that replacing `<html>` causes the next probe to return Missing and intentionally re-enter injection without Code Red.
- **G12 (`files:` vs `func:`):** Contract item 14 clarifies sentinel operations use `func:` intentionally, avoiding emitted bundle artifacts and `web_accessible_resources` entries.
## Remaining gaps (minor)
### R1 — Step 08 still shows an older `InjectionSuccess` shape (LOW)
Step 09 defines `outcome` and optional `reason`, but the visible Step 08 type
snippet still only includes `ok | tabId | stage | injectedScriptIds | buildId`,
and its already-injected return omits `outcome:"already-injected"`.
**Fix:** Update Step 08 to mirror Step 09's `InjectionOutcome` and return
`outcome:"already-injected"` / `outcome:"fresh"` explicitly.
### R2 — Step 08 stale-build branch contradicts Step 09 wording (LOW)
Step 09 contract says normal injection returns `Reason="StaleInjectionBuild"`
and step 10 owns the uninject-then-force path, but its branch table says Step
08 calls `uninjectFromTab()` then the full pipeline. Step 08 currently follows
the uninject branch directly.
**Fix:** Choose one normative behavior: either Stage 0 auto-uninjects stale
builds, or it returns a typed stale-build result and lets the explicit
re-inject flow own recovery. Step 10 currently favors explicit re-inject.
### R3 — `markInjected()` does not show empty-root handling (LOW)
The probe handles absent `documentElement`; the mark snippet assumes `root`
exists. In rare sandbox/no-document cases this throws without a sentinel-specific
`Sentinel.MarkFailed` mapping shown in the snippet.
**Fix:** Add a `root` absent guard inside `markInjected.func` and map thrown
mark failures to `Sentinel.MarkFailed` with the mandatory Code Red shape.
### R4 — Hash helper contract is underspecified (LOW)
The overflow path calls `sha1Prefix(scriptIds.join("|"))`, but the required
prefix length, deterministic ordering, and separator escaping are not specified.
**Fix:** Pin `sha1Prefix` length (for example 12 hex chars), hash input
encoding (`JSON.stringify(scriptIds)`), and preserve post-fallback injection
order.
## Blocker list for blind AI implementation
None remaining. R1–R4 are consistency hardening items, not blockers for the
sentinel itself.
## Recommendation
Spec 09 is implementation-ready. Apply R1–R4 while patching adjacent Step 08 /
Step 10 contracts to raise the score to ~95/100 and avoid cross-step drift.
## Remaining audit items
1. 10-reinject-and-uninject
2. 11-error-logging-discipline
3. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 09 — Injection Idempotency Sentinel` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
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

