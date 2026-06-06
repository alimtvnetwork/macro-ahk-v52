---
name: credit-balance-update
description: v3.50.0 — Ktlo/Free/Cancelled workspaces fetch /workspaces/{id}/credit-balance on demand; PascalCase enums; AbortController timeout; dual-layer cache; single-flight; resolver feeds tooltip, CSV, refill-priority
type: feature
---

## Credit Balance Update (v3.50.0)

**Why:** Lite (`ktlo`), Free, and Cancelled workspaces return no inline credit
fields in `/user/workspaces`, so the panel painted `0/0`. We now call
`/workspaces/{id}/credit-balance` only when inline data is absent.

**Spec:** `spec/21-app/01-chrome-extension/credit-balance-update/` (20 files).
**Plan:** `plan.md` → "Credit Balance Update — 60-Step Plan".

### Hard rules

- **Enums only:** `Plan`, `GrantType`, `CreditFetchOutcome` are PascalCase const
  enums. Wire-value mappers (`plan-mapper.ts`, `grant-type-mapper.ts`) log
  CODE-RED via `Logger.error()` on unknown values.
- **No fetch when inline:** `hasInlineCredits()` short-circuits — if
  `limit > 0` OR `grant_type_balances` has rows, return `InlineHit`. Network
  call MUST NOT fire. Enforced by
  `__tests__/credit-balance-network-count.test.ts`.
- **Timeout:** `AbortController` only; paired `clearTimeout` in `finally`.
  Slider range 500–15000ms, default 3000, persisted as
  `SettingsOverrides.creditFetchDelayMs`, clamped in `sanitize()`.
- **Single-flight:** `Map<WorkspaceId, Promise<CreditFetchResult>>` in
  `credit-fetch-controller.ts`. Concurrent calls join the same promise.
- **Cache:** dual-layer — in-memory + IndexedDB store
  `entries_v2_ktlo_free_cancelled`, 10-min TTL for success / `timeoutMs`
  for failures.
- **Auth:** single retry on `AuthError` using
  `fetchWorkspaceCreditBalance({ forceTokenRefresh: true })`. Always via
  `getBearerToken()` — no direct localStorage reads.
- **Resolver is the single source of truth** for UI numbers. Anything
  rendering `available` or `total` for a row MUST call
  `resolveCreditSummary(ws)`:
  - `ws-hover-card.ts` Credits section (shows `Source` row when ≠ Inline)
  - `ui/credit-totals-modal.ts` CSV (`Daily,DailyLimit,Source` columns)
  - `workspace-refill-priority.ts` (`resolvedAvailable(ws)`)

### Hydration

`startup.ts` calls `loadSettingsOverrides()`, then:

```ts
setCreditFetchTimeoutMs(overrides.creditFetchDelayMs ?? 3000);
subscribeCreditFetchSettings();   // hot-reload on SAVE_SETTINGS
```

### Failure-log schema

`Logger.error('CreditBalanceUpdate.fetch', …)` MUST include:
`Reason` (`Timeout` | `HttpError` | `AuthError` | `ParseError` | `Skipped`),
`ReasonDetail`, `WorkspaceId`, `BearerPrefix` (sanitized first 8 chars only),
`ElapsedMs`, `SourceUrl`. See `credit-balance-logger.ts`.

### Tests

- `__tests__/plan-mapper.test.ts`
- `__tests__/grant-type-mapper.test.ts`
- `__tests__/credit-balance-parser.test.ts`
- `__tests__/credit-balance-fetcher.test.ts`
- `__tests__/credit-balance-cache.test.ts`
- `__tests__/credit-fetch-controller.test.ts`
- `__tests__/credit-balance-network-count.test.ts` (zero-fetch + single-flight)
- `__tests__/hover-card-credits-section.test.ts` (resolver → tooltip)
- `__tests__/settings-credit-fetch-delay.test.ts` (clamp + hot-reload)
- `__tests__/credit-totals-csv.test.ts` (new columns)
- E2E scaffolds (`fixme` pending fixtures):
  `tests/e2e/e2e-credit-balance-ktlo.spec.ts`,
  `e2e-credit-balance-timeout.spec.ts`,
  `e2e-credit-balance-no-fetch-when-inline.spec.ts`.

### v3.56.0 addendum — Pending state + fan-out + resolver-only reads

**RCA 2026-06-06:** Even after the row repaint fix, new Free / Lite / Cancelled / pro_0 workspaces still showed empty bars after clicking 💰 Credits, because (a) the resolver had no "enrichment-in-flight" state, (b) the 💰 button only refreshed pro_1 in batch, and (c) hover card / CSV / totals still read raw `ws.available` / `ws.totalCreditsUsed`.

**New hard rules (all enforced by tests):**

- **Pending state in resolver:** `resolveCreditSummary(ws)` returns `source: 'Pending'` + `renderDash: true` when `shouldFetchCreditBalanceForPlan(plan)` is true AND `hasInlineCredits(ws)` is false. Renderer shows `— fetching…` skeleton, not `0/0`. Test: `__tests__/credit-summary-resolver-pending.test.ts`.

- **💰 button fan-out:** `executeCreditFetch` in `ui/panel-controls.ts` MUST run `Promise.all([proOneRefresh, enrichmentFanOut])` where `enrichmentFanOut` sequentially `await requestCredits(w)` for every workspace where `shouldFetchCreditBalanceForPlan(plan) && !hasInlineCredits(w)`. Loading state cleared only after both settle. Failures logged with scope `CreditBalanceUpdate.fanOut` + CODE-RED `Path/Missing/Reason` + `WorkspaceId=…`. Test: `__tests__/credit-button-fanout.test.ts`.

- **Resolver-only reads:** `ws-hover-card.ts` Credits row, `log-csv-export.ts` Total/Available/Used columns + `Available > 0` filter, and `credit-totals.ts::isMissingCreditData` MUST go through `resolveCreditSummary(ws)`. `renderDash: true` ⇒ CSV emits `""`, totals exclude row from sums and count it in `missingCount`. Never read raw `ws.available` / `ws.totalCreditsUsed` / `ws.totalCredits` directly for UI/export/totals.

- **Per-row repaint after enrichment:** every `.then()` inside `schedulePostParseEnrichment` (credit-fetch.ts) that calls `mc().updateUI()` MUST also call `repaintWorkspaceRowsAfterEnrichment(scope)` which funnels through `populateLoopWorkspaceDropdown()`. Three known scopes: `'pro_0'`, `'pro_1'`, `'ktlo/free/cancelled'`. Test: `__tests__/enrichment-repaints-list.test.ts`.

- **All-zero grant rows force fetch:** `hasInlineCredits(ws)` returns false when `grant_type_balances` contains only zero-remaining/zero-granted entries (new-free fixtures), so the controller still issues `/credit-balance`.
