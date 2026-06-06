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

## Pending tasks scanned from `.lovable/`

No open `## Pending` / `## TODO` sections found in `.lovable/plan.md`, `.lovable/plans/*`, `.lovable/pending-issues/*` that aren't already tracked in their own files. Nothing to append.

## Guidelines applied

- `.lovable/coding-guidelines.md` — present, will follow during execution.
- `spec/coding-guidelines/` — not present, skipped silently.
- Memory: `mem://features/macro-controller/credit-balance-update`, `mem://features/macro-controller/credit-refresh-behavior`, `mem://constraints/no-retry-policy` (no exponential backoff in step 4 fan-out — single-flight + single auth retry only).
