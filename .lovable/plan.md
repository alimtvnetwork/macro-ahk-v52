# Plan — Fix empty credit display for new free / Lite / Cancelled accounts after Refresh Credit

**Created:** 2026-06-06
**Type:** Bugfix — Credit Monitoring / UI rendering
**Trigger:** New free accounts (and other inline-empty workspaces — Lite/Ktlo, Cancelled) show an empty credit area / blank progress bar in the macro-controller even after clicking 💰 Refresh. Toast says "credits refreshed" but the bar never paints.

## Root Cause Analysis (RCA)

The Credits button calls `fetchLoopCreditsWithDetect(false)` against `/user/workspaces` and updates `loopCreditState`. For **new free / Lite / Cancelled** workspaces the inline response has **no** `*_limit` fields and an empty `grant_type_balances` array — so `parseApiResponse()` writes a row with `available=0`, `totalCredits=0`, `limit=0`.

Per `mem://features/macro-controller/credit-balance-update` (v3.50.0) these workspaces are supposed to be backfilled by an on-demand call to `/workspaces/{id}/credit-balance`, with `resolveCreditSummary(ws)` becoming the single source of truth for any UI number. The bug is one (or more) of the following — RCA must confirm which:

1. **Trigger gap:** the credit-totals/progress-bar renderer reads `ws.available / ws.totalCredits` directly (legacy path) instead of going through `resolveCreditSummary(ws)`, so the on-demand fetch never fires for these rows and the bar stays at `0/0`.
2. **Render gap:** progress-bar partial (`templates/_partials/credit-bar.html`) early-exits / collapses to width:0 when `total === 0`, so even after the resolver returns a real number the bar isn't repainted because the renderer was never re-invoked after the async resolve completes.
3. **`hasInlineCredits()` false-positive:** new free workspaces sometimes return `daily_credits_limit: 0` AND a single zero-row `grant_type_balances` entry — current check (`limit > 0 OR grant_type_balances has rows`) classifies that as `InlineHit` and short-circuits the fetch.
4. **Resolver-not-subscribed:** UI doesn't re-render on the `CreditFetchResult` resolution event, so the value is in cache but never pushed to DOM until the next manual refresh (which then short-circuits via cache TTL → empty again).
5. **Refresh button** only calls `fetchLoopCreditsWithDetect()` (inline list) and never the resolver, so the per-workspace `/credit-balance` follow-up is skipped entirely for the focused row.

Most likely combo: **#1 + #4** — the renderer was never migrated to the resolver contract, and the Refresh path doesn't await the resolver fan-out.

## 10 Steps

1. **Reproduce & confirm RCA** — open macro-controller as a brand-new free account (no Pro, no top-ups), click 💰. Capture: console log of `loopCreditState.perWorkspace[currentWs]`, network tab for `/user/workspaces` AND any `/workspaces/{id}/credit-balance` call. Note whether the per-workspace endpoint fires at all.
2. **Audit call sites of raw credit fields** — `rg -n 'available|totalCredits|dailyLimit' standalone-scripts/macro-controller/src --type ts` and tag every site that renders a number/bar. Compare against the resolver-mandated list in `mem://features/macro-controller/credit-balance-update` (hover card, CSV, refill-priority). Any other site rendering UI numbers without `resolveCreditSummary(ws)` is a bug.
3. **Fix #1 (renderer → resolver)** — migrate the progress-bar renderer (the loop row + any "current workspace highlight") to call `resolveCreditSummary(ws)` and use its `available/total/source`. Keep the bar visible (skeleton/`…`) while `source === 'Pending'`.
4. **Fix #4 (refresh fan-out)** — in the 💰 click handler, after `fetchLoopCreditsWithDetect()` resolves, iterate `perWorkspace`, and for every row where `hasInlineCredits(ws) === false` call `creditFetchController.resolve(ws.id)` (single-flight, cached). Await `Promise.allSettled` then trigger a single re-render. Do NOT await sequentially per row — fan out in parallel; honour the existing AbortController timeout.
5. **Audit `hasInlineCredits()` for the zero-row case (#3)** — add a test fixture: `daily_credits_limit: 0, billing_period_credits_limit: 0, grant_type_balances: [{ available: 0, total: 0, grant_type: 'free' }]`. Expected: `InlineHit=false` (forces fetch). Tighten the check if it returns true today.
6. **Render skeleton for pending state** — in `credit-bar.html` / its TS caller, when resolver returns `source === 'Pending'` paint a striped/animated placeholder bar; when `source === 'Failed'` paint a red 1-px bar with a tooltip "Credit fetch failed — click 💰 to retry". Never collapse to invisible.
7. **Subscribe to resolver completion** — wire a tiny event (`CreditResolved(workspaceId)`) emitted by `credit-fetch-controller` on success/failure; the controller UI subscribes and re-renders only the affected row. Avoids full re-paint and races.
8. **Tests** —
   (a) unit: `credit-balance-network-count.test.ts` extended — new-free fixture MUST trigger exactly one `/credit-balance` call;
   (b) unit: resolver-pending render produces skeleton DOM, resolver-success replaces it;
   (c) component test: clicking 💰 on a new-free workspace ends with a non-zero `<progress>` value within the timeout budget;
   (d) regression: Pro workspace with inline credits still does ZERO `/credit-balance` calls.
9. **Failure logging** — ensure every code path added in steps 4 + 7 funnels errors through `Logger.error('CreditBalanceUpdate.fetch', …)` with the mandatory schema (`Reason`, `ReasonDetail`, `WorkspaceId`, `BearerPrefix`, `ElapsedMs`, `SourceUrl`). No swallowed catches.
10. **Version bump + memory sync** — bump `manifest.json` + `constants.ts` (per unified-versioning policy), update `mem://features/macro-controller/credit-balance-update` "Resolver is the single source of truth" bullet to add the progress-bar renderer to the enforced list, and append a row to plan close-out section. Run full audit (`node scripts/audit/check-must-memory-refs.mjs`, smoke-rescore, quarantine, tooltip-dict-gate) before declaring done.

## Progress log

- **v3.82.0 — 2026-06-21:** Fixed the confirmed legacy-direct reader root cause for Plan Steps 3/8/10 and the deeper daily-only aggregate-zero root cause. Migrated workspace-list credit filters/sorts/max-total scaling, Credit Totals modal table cells/filters/sorts, top summary-bar aggregates, focused-workspace status bar, and hover-card daily value to `resolveCreditSummary(ws)`. Added resolver-backed regression tests, daily-only `/credit-balance` overlay tests, and mapped `pro_3` as a known inline-only plan. Verification: targeted Vitest suite `8 passed / 101 tests passed`; `node scripts/check-version-sync.mjs` → `✅ All versions in sync: 3.82.0`.
- **v3.83.0 — 2026-06-21 (Step 6):** Replaced the invisible em-dash placeholder in `ws-list-renderer.ts` with a real skeleton/error bar. Pending → animated `marco-skeleton` shimmer bar (160×8px), Timeout/Missing → thin red 2px bar; both preserve the slot so the row never reflows when the resolver completes. Tooltips updated to point users at the 💰 Credits button for refresh/retry. Version files synced (`✅ All versions in sync: 3.83.0`).
- **v3.84.0 — 2026-06-21 (Step 7):** Added `onCreditResolved` pub-sub to `credit-fetch-controller` (emit after cache write + in-flight cleanup, per-listener try/catch logs via `CreditBalanceUpdate.controller`). `ws-list-renderer.ts` subscribes with a 120ms debounce that invalidates the dropdown hash and calls `populateLoopWorkspaceDropdown()`, eliminating RCA #4 (value in cache but never pushed to DOM until next manual refresh). Verification: `bunx vitest run` on credit-fetch-controller / credit-button-fanout / credit-summary-resolver-pending → 3 files, 23 tests passed. Versions synced at 3.84.0.

## Pending tasks scanned from `.lovable/`

No open `## Pending` / `## TODO` sections found in `.lovable/plan.md`, `.lovable/plans/*`, `.lovable/pending-issues/*` that aren't already tracked in their own files. Nothing to append.

## Guidelines applied

- `.lovable/coding-guidelines.md` — present, will follow during execution.
- `spec/coding-guidelines/` — not present, skipped silently.
- Memory: `mem://features/macro-controller/credit-balance-update`, `mem://features/macro-controller/credit-refresh-behavior`, `mem://constraints/no-retry-policy` (no exponential backoff in step 4 fan-out — single-flight + single auth retry only).

- **v3.85.0 — 2026-06-21 (Step 8a/8d):** Added `credit-new-free-network-count.test.ts` — locks the two highest-value invariants from Plan 01: (a) new-free workspace with zero `limit` + all-zero `grant_type_balances` row issues exactly ONE `/credit-balance` call (RCA #1/#3 lock), (b) Pro_1 with inline `limit>0` issues ZERO `/credit-balance` calls (Skipped outcome via `shouldFetchCreditBalanceForPlan`). Verification: `bunx vitest run credit-new-free-network-count.test.ts` → 2/2 pass. Versions synced at 3.85.0.

- **v3.86.0 — 2026-06-21 (Step 8b):** Extracted `buildCreditPlaceholderBarHtml(isPending, dashTooltip)` from `ws-list-renderer.ts` and added `credit-placeholder-bar.test.ts` (3 tests). Locks: Pending → `.marco-skeleton` shimmer (160×8px, no background), Timeout/Missing → 2px red warning bar with `opacity:0.85`, both at `min-width:160px` so resolver completion never reflows the row. Verification: 3/3 pass; versions synced at 3.86.0.

- **v3.87.0 — 2026-06-21 (Step 8c):** Added `credit-refresh-component.test.ts` to prove the real 💰 button path: new-free row starts as `.marco-skeleton`, click triggers `/credit-balance` exactly once, `CreditResolved` repaints the dropdown, and the row ends with `role="progressbar" aria-valuenow="25"` plus `⚡25/50`. Minimal runtime change: `renderCreditBar()` now emits semantic progressbar ARIA without altering visuals. Verification: new component regression 1/1 pass; targeted credit suite 12/12 pass; versions synced at 3.87.0.

- **v3.88.0 — 2026-06-21 (Step 9):** Locked the `Logger.error('CreditBalanceUpdate.fetch', …)` schema. Renamed `CreditFailureLogPayload.Path` → `SourceUrl` in `credit-balance-types.ts` + `credit-balance-fetcher.ts` so every failure log carries the mandated keys (`Reason`, `ReasonDetail`, `WorkspaceId`, `BearerPrefix`, `ElapsedMs`, `SourceUrl`, plus `Plan`/`Status`/`BodyPreview`/`TimeoutMs`). Added `credit-fetch-failure-schema.test.ts` (5 tests) covering MissingToken / AuthError-401 / Http5xx / NetworkError and rejecting the legacy `Path` key. Verification: `bunx vitest run …schema.test.ts …fetcher.test.ts` → 2 files, 9 tests pass; `✅ All versions in sync: 3.88.0`.

- **v3.89.0 — 2026-06-21 (Step 10 — Plan 01 CLOSED):** Synced `mem://features/macro-controller/credit-balance-update` to v3.88.0+ schema (9 Reason codes, `SourceUrl` not `Path`, 12-char BearerPrefix redaction, `credit-fetch-failure-schema.test.ts` as enforcer). Audits green: `check-must-memory-refs` OK, `check-quarantine` OK, `check-score-floor` 100/100. Full credit regression suite: 6 files / 21 tests passed. `✅ All versions in sync: 3.89.0`. **Plan 01 complete — all 10 steps shipped.**

- **v3.90.0 — 2026-06-21 (Post-Plan-01 lock):** Added `refill-priority-credit-resolved.test.ts` — proves `sortByRefillPriority` consumes fresh resolver data the moment a `/credit-balance` cache write lands. Ktlo workspace (inline available=0) ranks behind Pro (50); after cache write of 500 credits the order flips on the next sort. Locks the wiring claim made in v3.84.0 + Plan 01 Step 7. Verification: 1/1 pass; `✅ All versions in sync: 3.90.0`.

- **v3.91.0 — 2026-06-21 (Plan inventory sweep):** Archived 4 shipped plans into `.lovable/plans/completed/` with explicit `STATUS: ✅ COMPLETED` headers — `02-http-fail-fast-10-step.md` (v3.5.2), `03-v3-10-0-refill-priority-and-github-open.md` (v3.10.0), `04-credit-totals-and-macro-ux-20-step.md` (2026-05-25 close), `05-prompt-spec-2026-renumber-100.md` (2026-06-03 EXECUTED). Pending backlog narrowed from 7 → 3. `✅ All versions in sync: 3.91.0`.

- **v3.92.0 — 2026-06-21 (Plan inventory correction):** Archived the two remaining completed prompt-macro plans into `.lovable/plans/completed/` with explicit `STATUS: ✅ COMPLETED` headers — `06-prompt-macros-50-step.md` (100/100 tasks complete) and `07-spec-prompt-macros-audit-100.md` (audit complete, score 100/100). Added a current-cursor header to the only active plan, `projects-modal-15-step-improvement.md`: Task 1 is the Projects Modal overview/spec. Before signal: `ls .lovable/plans/` showed 3 apparent pending files; after signal: only 1 active plan remains. `✅ All versions in sync: 3.92.0`.

- **v3.93.0 — 2026-06-21 (Projects Modal cursor advance):** Discovered Tasks 1 & 2 of `projects-modal-15-step-improvement.md` were already shipped — spec at `standalone-scripts/macro-controller/spec/projects-modal/00-overview.md` (105 lines) and Q52 `projects.get` 405 root-cause + fix at `src/ui/projects-modal.ts:728-735`. Advanced cursor to Task 3 (CSV project-name fallback chain). `✅ All versions in sync: 3.93.0`.
