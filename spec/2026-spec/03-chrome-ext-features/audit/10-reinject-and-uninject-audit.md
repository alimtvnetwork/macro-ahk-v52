# Audit 10 — Re-inject and Uninject

- **Source spec**: `../10-reinject-and-uninject.md`
- **Audit date**: 2026-06-05 (duration ~6 min)
- **Audited against**: `mem://architecture/script-injection-lifecycle`,
  `mem://standards/timer-and-observer-teardown`,
  `mem://architecture/message-relay-system`,
  `mem://features/new-tab-no-url-guard`,
  `mem://constraints/no-retry-policy`,
  `mem://architecture/dynamic-script-loading`,
  `mem://architecture/extension-error-management`,
  `mem://standards/verbose-logging-and-failure-diagnostics`,
  `mem://standards/unknown-usage-policy`.

## Score: 88 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 | 22 |
| Determinism (AI can implement)  |     25 | 21 |
| Completeness of acceptance      |     20 | 18 |
| Cross-references                |     15 | 13 |
| Pitfalls coverage               |     15 | 14 |
| **Total**                       |    100 | **88** |

## Root cause

The previous audit was stale. It still treated the step as missing the teardown
contract, callback-failure escalation, ack ordering, relay-last ordering,
force-inject precondition, stale-build UI behavior, outcome discriminators,
static force-callsite audit, verbose-gated diagnostics, context-invalidation
handling, and idempotency tests. The current source spec now resolves those
items, but it still has a few cross-step and type-level drifts that would trip
a blind implementation.

## Resolved issues (vs prior audit)

- **G1 (`executeTeardown` contract):** §`executeTeardown` now pins `TeardownDomain`, `TeardownExecResult`, MAIN-world `chrome.scripting.executeScript`, and `RiseupAsiaMacroExt.Runtime.runTeardown(domain)` behavior.
- **G2 (per-callback failures):** §Teardown failure escalation requires any `failed[]` entry to return `ok:false`, `Reason="TeardownCallbackFailed"`, and failed ids in `reasonDetail`, blocking sentinel clear and re-inject.
- **G3 (`EVT_BEFORE_UNINJECT` race):** §Broadcast ack rule waits up to 500 ms for `EVT_BEFORE_UNINJECT_ACK`; timeout is a warn diagnostic and proceeds without retry or Code Red.
- **G4 (`EVT_AFTER_UNINJECT` after relay teardown):** Step ordering keeps relay teardown last, and acceptance requires `EVT_AFTER_UNINJECT` via direct MAIN-world `executeScript`, not `chrome.tabs.sendMessage`.
- **G5 (`force:true` bypass):** §Force-inject precondition requires the injector to re-probe after mutex acquisition and return `ForceInjectPreconditionFailed` without executing scripts if the sentinel remains.
- **G6 (stale-build trigger):** UI behavior maps matching build to `Re-inject` / `Uninject`, stale build to `Re-inject` only, and `Inject` on stale to `UseReinjectForStaleBuild`.
- **G7 (`removedScriptIds: []` ambiguity):** `UninjectOutcome = "already-clean" | "cleaned"` lets UI distinguish no-op cleanup from a real removal.
- **G8 (teardown SDK surface):** Step 10 restates that `registerTeardown` / `runTeardown` are owned by Step 08 MAIN-world runtime and every timer/listener/observer must register teardown.
- **G9 (auto-injector force ban):** `scripts/audit-force-inject-callers.mjs` is specified and acceptance requires only allowlisted `force:true` callsites.
- **G10 (verbose-gated teardown diagnostics):** Contract item 13 and acceptance cap `reasonDetail` at 240 chars unless verbose logging is ON, with full stack in `error_events.detail_full`.
- **G11 (context invalidation):** Contract item 12 and tests map `Extension context invalidated` to terminal `ExtensionContextInvalidated`, no retry, no Code Red.
- **G12 (double-uninject idempotency):** `uninjector-idempotent.test.ts` is listed; second call returns `ok:true`, `outcome:"already-clean"`.

## Remaining gaps

### R1 — `style-teardown` vs `styles-teardown` type drift (HIGH)

`TeardownStep` defines `"style-teardown"`, but the loop uses domain `"styles"`
and derives `step = `${d}-teardown``, producing `"styles-teardown"`. This
will either fail strict typing or force an unsafe cast that hides the mismatch.

**Fix:** Rename the union member to `"styles-teardown"` or change
`TeardownDomain` to singular `"style"`; prefer `"styles-teardown"` because the
domain is already `"styles"` throughout the spec.

### R2 — Stale-build ownership still conflicts with Step 08 / Step 09 (MEDIUM)

Step 10 says stale build is resolved only by explicit re-inject and normal
`Inject` must return `UseReinjectForStaleBuild`. Step 08's current Stage 0
snippet still auto-calls `uninjectFromTab()` on `"build-mismatch"`.

**Fix:** Align Step 08 with Step 10: a non-force injection seeing
`"build-mismatch"` should return a typed user-error result, while
`reinjectIntoTab()` owns uninject-then-force.

### R3 — UI force allowlist contradicts the single-background-entry contract (MEDIUM)

The audit script allowlist includes `StatusPanel.tsx` and `DebugPanel.tsx`, but
Contract item 1 says popup/options/content must not perform teardown or force
injection directly. Allowlisting UI files for literal `force:true` invites a
second injection entry path.

**Fix:** Restrict literal `force:true` to `src/background/injection/reinjector.ts`.
UI should send `MSG_REINJECT_TAB`; the background reinjector alone adds force.

### R4 — `executeTeardown` snippet uses explicit `unknown` (LOW)

The inline MAIN-world type uses `runTeardown?: (x: string) => unknown`, which
conflicts with the project rule forbidding explicit `unknown` outside
`CaughtError` patterns.

**Fix:** Introduce a local serializable teardown-return type for the injected
function and avoid `unknown` in the snippet.

### R5 — `clearInjectionSentinel()` assumes `documentElement` exists (LOW)

The clear helper directly calls `root.removeAttribute(...)`. Probe handles
absent roots, but clear does not show an absent-root path or mapped
`sentinel-clear` failure detail.

**Fix:** Add an absent-root guard in the serialized function and map it to a
typed `sentinel-clear` failure with Code Red shape.

## Blocker list for blind AI implementation

R1 is the only near-blocker because it creates a concrete type/string mismatch.
R2–R5 are consistency hardening items.

## Recommendation

Spec 10 is mostly implementation-ready. Fix R1 immediately, then align the
stale-build and force-callsite ownership with Steps 08 / 09 before coding the
runtime.

## Remaining audit items

1. 11-error-logging-discipline
2. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 10 — Re-inject and Uninject` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
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
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

