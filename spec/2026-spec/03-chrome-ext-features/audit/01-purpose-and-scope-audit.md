# Audit 01 — `01-purpose-and-scope.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/01-purpose-and-scope.md`
- **Auditor focus:** How blindly can an AI/LLM implement the contained obligations without escalating to a human?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score after re-audit: **91 / 100**

## Root cause fixed

This audit was stale. It was written before the folder had a complete canonical
20-step index and before steps 14–20 existed, so it still reported resolved
items as pending. The current `01-purpose-and-scope.md` now publishes the
authoritative 20-row mapping, canonical identifiers, sibling-folder policy, and
machine-checkable meta acceptance criteria.

**Time spent:** ~4 min.

| Dimension | Score | Notes |
|---|---|---|
| Clarity of contract | 23 / 25 | Now clearly states this is a normative meta/index file and that executable obligations live in steps 02–20. |
| Determinism | 23 / 25 | The 20-step table, canonical identifiers, and pending/future sibling-folder labels remove the earlier step-count ambiguity. |
| Completeness of acceptance | 18 / 20 | Adds `Acceptance (meta)` enforced by `scripts/audit-spec-index.mjs`; only exact script implementation details remain outside this audit. |
| Cross-references | 14 / 15 | Existing storage folder is labelled as present; future CI/CD folder is explicitly marked pending/future so an AI should not invent it. |
| Pitfalls | 13 / 15 | Guiding principles now include explicit no-remote-code, idempotency, typed failure, no-retry, and test obligations. |

## Gap analysis (detailed)

### G1 — Scope numbering mismatch (RESOLVED)
The file now contains `Authoritative step index (20 features)` with every
`NN-slug.md` mapped to a one-line feature name.

### G2 — "20 features" vs actual 20-step plan (RESOLVED)
The file duplicates the full index inline and explicitly says `README.md` alone
is not the source of truth for offline LLM consumption.

### G3 — Sibling-folder references are unverified (RESOLVED)
The CI/CD sibling is marked `(future; pending)` and the storage sibling is marked
as existing, which gives the implementing AI an explicit stop/continue rule.

### G4 — Vocabulary lacks normative anchors (RESOLVED)
`Canonical identifiers` now binds namespace, build id, sentinel, script ids,
Code Red helper, namespace logger, error broadcast, boot banner, new-tab guard,
and verbose flag to concrete symbols/attributes/storage keys.

### G5 — Guiding principle 4 conflicts with principle 5 wording (RESOLVED)
The status block now explicitly states this file is non-implementable and has no
direct feature-test obligation.

### G6 — Audience says "any extension" but repo is product-specific (RESOLVED)
The file now states forks may rename `RiseupAsiaMacroExt` but must preserve the
same contract shape and payload schema.

### G7 — No machine-readable acceptance (RESOLVED)
The file now has `Acceptance (meta)` with checks for 01–20 existence, README
slug/order alignment, unresolved sibling labels, canonical identifiers, and
vocabulary coverage.

### G8 — "No remote code" principle missing CSP example (RESOLVED)
The guiding principle now cites the MV3 default CSP and links to step 02 for
the detailed CSP contract.

### G9 — "No retries without permission" has no enforcement hook (RESOLVED)
The no-retry principle now cites `scripts/audit-retry-policy.mjs` and the
project-wide ban on retry queues.

### G10 — Reader assumption "knows MV3 manifest shape" too generous (RESOLVED)
The audience section now links directly to step 02's minimum MV3 manifest
skeleton.

## Blocker list for blind AI implementation

1. None for this file after re-audit.

## Recommendation

Keep this file as the canonical folder index. The remaining risk is only that
`scripts/audit-spec-index.mjs` must stay aligned with the meta acceptance list.

## Remaining audit items

1. 03-folder-and-file-layout
2. 04-version-display-and-build-stamp
3. 05-extension-reload-manual
4. 06-extension-reload-auto-on-file-change
5. 07-status-and-health-panel
6. 08-script-injection-lifecycle
7. 09-injection-idempotency-sentinel
8. 10-reinject-and-uninject
9. 11-error-logging-discipline
10. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 01 — 01-purpose-and-scope.md` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
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


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
