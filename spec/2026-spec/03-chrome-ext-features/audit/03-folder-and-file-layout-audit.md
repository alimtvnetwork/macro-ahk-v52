# Audit 03 — `03-folder-and-file-layout.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/03-folder-and-file-layout.md`
- **Auditor focus:** How blindly can an AI/LLM organize a Chrome extension repo from this layout without putting files in the wrong context, breaking imports, or producing an unloadable `dist/` bundle?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score after re-audit: **92 / 100**

## Root cause fixed

This audit was stale. It was written before `03-folder-and-file-layout.md` gained the repo binding, exact required `src/` folders, generated-manifest mode rule, canonical alias table, shared-purity gate, import-boundary gate, and `dist/` reachability audit. The old audit also still marked steps 14–20 as pending even though the canonical spec folder now contains all 20 files.

**Time spent:** ~5 min.

| Dimension | Score | Notes |
|---|---:|---|
| Clarity of contract | 24 / 25 | Canonical tree, repo binding, manifest mode, decision table, cross-context import table, and `dist/` layout are now explicit. |
| Determinism | 23 / 25 | Required folders, optional `src/options`, exact aliases, line-count threshold, and output reachability rules are now machine-checkable. |
| Completeness of acceptance | 18 / 20 | Acceptance names the exact folder, alias, purity, import-boundary, handler-size, and `dist/` checks. |
| Cross-references | 14 / 15 | Later-step references now resolve to existing canonical step files and product-specific namespace rules are stated. |
| Pitfalls | 13 / 15 | Pitfalls cover React in shared, MAIN-world `chrome.*`, alias drift, stale `dist/`, optional options page, and namespace drift. |

## Gap analysis (detailed)

### G1 — `src/` top-level folder count is inconsistent (RESOLVED)

The spec now separates the seven required folders from optional `src/options`, and acceptance repeats the exact required list: `shared`, `background`, `content`, `injected`, `popup`, `storage`, and `platform`.

### G2 — Canonical tree is generic but project memory is product-specific (RESOLVED)

The `Repo binding` section now requires generic examples to be concretized as `RiseupAsiaMacroExt` for this repo while allowing forks to rename only if they preserve the same folder boundaries and contracts.

### G3 — `shared/` purity rule lacks mechanical boundaries (RESOLVED)

The spec now forbids React, DOM, browser APIs, extension APIs, local/session storage, clipboard usage, and storage implementations under `src/shared/**`, with `scripts/audit-shared-purity.mjs` as the static gate.

### G4 — Path alias contract is incomplete (RESOLVED)

The spec now defines the full canonical alias table for `@shared/*`, `@background/*`, `@content/*`, `@injected/*`, `@popup/*`, `@storage/*`, and `@platform/*`, and acceptance requires matching `tsconfig.json` and bundler targets.

### G5 — `dist/` preservation rule risks stale artifacts if not bounded (RESOLVED)

The `Build output (dist/)` section now requires `scripts/audit-dist-reachability.mjs` to verify manifest/HTML references, reject stale entrypoints, and report exact path plus reason detail.

### G6 — `dist/` is shown inside the repo tree but pitfall says not to check it in (RESOLVED)

The spec now explicitly states `dist/` is generated output, source changes must not be made inside it, and it should not be committed unless release policy requires artifacts.

### G7 — Cross-context import table needs explicit allowed communication APIs (RESOLVED)

The cross-context table now maps each forbidden direct import to its approved communication path: typed runtime messages, `tabs.sendMessage`, `scripting.executeScript`, or the validated step-02 `postMessage` bridge.

### G8 — Naming rule for React components conflicts with project memory (RESOLVED)

The repo binding now says to prefer plain TypeScript UI modules and not introduce React solely because generic examples mention `.tsx`.

### G9 — Test co-location rule may conflict with existing test conventions (RESOLVED)

The naming rules now state new tests follow the co-located `__tests__/` convention, while existing tests are not moved unless the owned feature change requires it.

### G10 — File-size split rule is too soft for automation (RESOLVED)

The spec now sets a hard audit threshold: non-test background handlers must not exceed 300 physical lines, with 250 lines only as the preferred split point.

### G11 — Manifest source location may not match generated-manifest workflows (RESOLVED)

The manifest source mode section now defines root-manifest mode and generated-manifest mode, then binds this repo to generated-manifest mode when `scripts/compile-instruction.mjs` or `src/instruction.ts` is present.

## Blocker list for blind AI implementation

1. None for this file after re-audit.

## Recommendation

Keep this spec as the folder-layout contract. The remaining risk is enforcement drift: the named audit scripts must stay aligned with the acceptance list.

## Remaining audit items

1. 05-extension-reload-manual
2. 06-extension-reload-auto-on-file-change
3. 07-status-and-health-panel
4. 08-script-injection-lifecycle
5. 09-injection-idempotency-sentinel
6. 10-reinject-and-uninject
7. 11-error-logging-discipline
8. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 03 — 03-folder-and-file-layout.md` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
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

