# Audit 02 — `02-manifest-v3-foundations.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/02-manifest-v3-foundations.md`
- **Auditor focus:** How blindly can an AI/LLM implement the Manifest V3 baseline without inventing permissions, breaking MV3 lifecycle rules, or drifting from later specs?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score after re-audit: **92 / 100**

## Root cause fixed

This audit was stale. It still described step 16/18 links as pending/mismatched
even though the canonical files are now `16-storage-sqlite-pointer.md` and
`18-storage-chrome-local-pointer.md`, and it still listed steps 14–20 as
pending. The current `02-manifest-v3-foundations.md` has already absorbed the
recommended MV3 permission, bridge, CSP, service-worker, and test contracts.

**Time spent:** ~5 min.

| Dimension | Score | Notes |
|---|---:|---|
| Clarity of contract | 24 / 25 | Strong MV3 baseline with explicit manifest, permission, injection, bridge, CSP, and SW lifecycle rules. |
| Determinism | 23 / 25 | Minimal manifest, optional permission table, exact README permission block, target URL guard, and bridge envelope are now concrete. |
| Completeness of acceptance | 18 / 20 | Acceptance and tests name the required audit scripts, checks, globs, and manual boot-smoke assertions. |
| Cross-references | 14 / 15 | Internal storage links now use canonical step files; sibling storage pointers are precise. |
| Pitfalls | 13 / 15 | Pitfalls cover broad permissions, ESM module type, auth/localStorage, SW globals, MAIN/ISOLATED misuse, and runtime errors. |

## Gap analysis (detailed)

### G1 — Minimum manifest skeleton conflicts with minimum-permission rule (RESOLVED)
The manifest skeleton now uses only `storage` as the required baseline. Optional
permissions and host permissions moved into a separate table, and broad host
permissions are explicitly forbidden as defaults.

### G2 — README permission justification has no required format (RESOLVED)
The spec now defines the exact `## Extension permissions` table and requires
every declared permission/host pattern to appear exactly once.

### G3 — Internal step links point to files that do not exist yet (RESOLVED)
The contract now references the canonical files
`18-storage-chrome-local-pointer.md` and `16-storage-sqlite-pointer.md`; both
exist in the folder.

### G4 — Cross-reference to the storage sibling is too broad (RESOLVED)
The storage section now points to the specific sibling files for SQLite, WASM,
IndexedDB, `chrome.storage.local`, and `localStorage`.

### G5 — `localStorage` guidance is internally too permissive (RESOLVED)
The rule now restricts `localStorage` to disposable, non-auth,
non-cross-context visual UI flags and explicitly forbids tokens, workspace IDs,
project data, scripts, logs, auth state, and required reload state.

### G6 — MAIN/ISOLATED world model lacks the canonical relay contract (RESOLVED)
The spec now defines `BridgeEnvelope` with `source`, `kind`, `buildId`, `nonce`,
and `payload`, plus receiver validation rules for `event.source`,
`event.origin`, source prefix, and `buildId`.

### G7 — Service-worker lifecycle rules are correct but not mechanically enforceable (RESOLVED)
Acceptance now forbids SW module-scope `window`, `document`, and
`localStorage`; tests require `scripts/audit-sw-toplevel.mjs` for top-level
listener placement.

### G8 — `chrome.scripting.executeScript` rule needs exact target validation (RESOLVED)
The contract now requires `isNewTabOrBlankUrl()` before injection and enumerates
the exact blank/new-tab URLs to refuse with `Reason="UnsupportedTargetUrl"`.

### G9 — CSP section needs a manifest-level canonical value (RESOLVED)
The spec now gives the exact WASM-only CSP override and forbids unsafe/remote
script sources. It also states pure-JS extensions must not add the override.

### G10 — Build output grep checks are underspecified (RESOLVED)
Tests now name `scripts/audit-mv3-output.mjs`, the scan glob, failing tokens,
fixture exemption, and failure-message format.

### G11 — Manifest lint acceptance lacks schema details (RESOLVED)
Tests now name `scripts/audit-manifest.mjs` and list exact required/forbidden
manifest fields, permission allowlist, and README table linkage.

### G12 — Boot smoke test is too vague for automation (RESOLVED)
The manual Chrome E2E boot smoke now has concrete assertions for extension ID,
popup open, manifest version, service-worker console, and runtime errors.

## Blocker list for blind AI implementation

1. None for this file after re-audit.

## Recommendation

Keep this spec as the MV3 foundation. The remaining work is no longer in this
file; it is to clean the older audit files that still describe completed specs
as pending.

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

- [ ] The implementation satisfies the `Audit 02 — 02-manifest-v3-foundations.md` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
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

