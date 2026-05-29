# Issue 122 — Generalize `/credit-balance` to pro_1 (and all paid plans)

> **Status**: Spec Ready · awaiting implementation approval
> **Created**: 2026-05-29 (Asia/Kuala_Lumpur)
> **Author**: Macro Controller
> **Supersedes**: ambiguity log `.lovable/question-and-ambiguity/122-pro1-total-calculation.md`
> **Related**:
> - `spec/22-app-issues/110-macro-controller-pro-zero-credit-balance.md` (pro_0 prior art)
> - `spec/22-app-issues/114-pro-zero-credit-balance-calculation.md` (pro_0 calculator)
> - `mem://features/macro-controller/pro-zero-credit-balance`

---

## 1. Problem

For `plan = pro_1` workspaces (e.g. **P0058 R Mar26 D3**), the macro-controller
panel currently derives Total / Available / Used from the
`/user/workspaces` summary fields (`billing_period_credits_limit`,
`daily_credits_limit`, `total_credits_used_in_billing_period`). These fields
**do not** reflect rollover credits, expiring grants, or partial-day proration.

Lovable's own sidebar shows **"Credits 102.3 left"** for P0058 — a number
that does not appear anywhere in `/user/workspaces`. The authoritative
source is the per-workspace endpoint:

```
GET https://api.lovable.dev/workspaces/{workspaceId}/credit-balance
```

Sample response (P0058, captured 2026-05-29):

```json
{
  "$schema": "https://api.lovable.dev/GetWorkspaceCreditBalanceOutputBody.json",
  "total_remaining": 102.3,
  "total_granted": 305,
  "daily_remaining": 0,
  "daily_limit": 5,
  "total_billing_period_used": 6.2,
  "expiring_grants": [
    { "grant_type": "rollover", "applicability": "build_time", "credits": 98.8, "expires_at": "2026-06-10T08:00:00Z" },
    { "grant_type": "rollover", "applicability": "build_time", "credits":  3.5, "expires_at": "2026-07-10T08:00:00Z" }
  ],
  "grant_type_balances": [
    { "grant_type": "daily",    "granted":   5, "remaining":   0 },
    { "grant_type": "rollover", "granted": 300, "remaining": 102.3 }
  ]
}
```

We already consume this endpoint for `plan = pro_0` (Issue 110). This spec
**generalizes** that consumption to `pro_1` and any other paid plan that
returns a usable response.

---

## 2. Goals / Non-goals

### Goals

1. After every successful `/user/workspaces` parse, fan out one
   `/credit-balance` request per non-FREE workspace whose plan is in the
   **PAID_PLANS** set (`pro_0`, `pro_1`, `lite`, `ktlo`).
2. Overwrite `WorkspaceCredit.totalCredits`, `available`, `totalCreditsUsed`,
   `rollover`, `rolloverLimit`, `dailyFree`, `dailyLimit` with values
   computed by a **pure** calculator from the `/credit-balance` JSON.
3. Cache the `/credit-balance` JSON per workspace ID with a short TTL
   (default **60 s**, configurable via `creditBalanceTtlMs` setting) to
   avoid hammering the endpoint on every loop cycle.
4. Ship Vitest unit tests for the calculator with at least the P0058
   fixture and three synthetic edge-case fixtures (zero balance, only
   daily grants, expired-rollover only).
5. Re-aggregate panel totals + re-render the workspace list after each
   enrichment pass completes.

### Non-goals

- Reverse-engineering Lovable's display-rounding rule (we emit raw
  numbers; the renderer formats them).
- Falling back to the legacy `/user/workspaces` math when
  `/credit-balance` fails — **fail-fast** per `mem://constraints/no-retry-policy`.
  A failed enrichment leaves the legacy values in place and logs CODE-RED.
- Touching the `pro_0`-specific code path. We re-use its calculator
  module by extension, not rewrite.

---

## 3. API contract

| Field | Method | URL |
|---|---|---|
| **fetch** | `GET` | `https://api.lovable.dev/workspaces/{wsId}/credit-balance` |
| **auth** | `Authorization: Bearer {token}` from unified `getBearerToken()` |
| **headers** | `accept: */*`, `content-type: application/json`, `credentials: include` |

### Response — typed view

```ts
interface CreditBalanceResponse {
  $schema?: string;
  total_remaining: number;       // authoritative AvailableCredits
  total_granted: number;          // authoritative Total
  daily_remaining: number;
  daily_limit: number;
  total_billing_period_used: number; // authoritative TotalUsed (period-scoped)
  expiring_grants: ExpiringGrant[];
  grant_type_balances: GrantTypeBalance[];
}

interface ExpiringGrant {
  grant_type: 'rollover' | 'daily' | 'billing' | 'topup' | 'bonus';
  applicability: 'build_time' | string;
  credits: number;
  expires_at: string; // ISO 8601
}

interface GrantTypeBalance {
  grant_type: 'rollover' | 'daily' | 'billing' | 'topup' | 'bonus';
  granted: number;
  remaining: number;
}
```

### HTTP errors

| Status | Treatment |
|---|---|
| **200** | Parse, validate (numbers finite, arrays present), enrich. |
| **401 / 403** | Token-refresh once via `getBearerToken({ forceRefresh: true })`; retry once. Second failure → CODE-RED, leave legacy values, **no further retry**. |
| **404** | Workspace deleted/migrated. CODE-RED with `wsId`, mark `ws.creditBalanceMissing = true`, leave legacy values. |
| **429 / 5xx** | Fail-fast. CODE-RED, leave legacy values. **No exponential backoff** (per memory). |
| **network error** | Fail-fast. CODE-RED with reason. |

---

## 4. Module layout

New / reused files under `standalone-scripts/macro-controller/src/credit-balance/`:

```
credit-balance/
  credit-balance-types.ts            (Response, GrantTypeBalance, ExpiringGrant)
  credit-balance-fetcher.ts          (httpRequest wrapper, 401-refresh-once)
  credit-balance-cache.ts            (in-memory Map<wsId, { json, fetchedAt }>)
  credit-balance-calculator.ts       (pure: response → MacroCreditSummary)
  credit-balance-enrichment.ts       (per-ws orchestrator; mirrors pro-zero-enrichment.ts)
  __tests__/credit-balance-calculator.test.ts
  __tests__/credit-balance-enrichment.test.ts
  __tests__/credit-balance-fetcher.test.ts
```

The existing `pro-zero/` directory **continues to own** the `pro_0` raw-string
mapping; the new module reuses its `MacroCreditSummary` type for symmetry.

### Plan eligibility

```ts
const PAID_PLAN_LITERALS: ReadonlySet<string> =
  new Set(['pro_0', 'pro_1', 'lite', 'ktlo']);

export function isPaidPlanForCreditBalance(plan: string): boolean {
  return PAID_PLAN_LITERALS.has((plan || '').toLowerCase().trim());
}
```

`pro_0` keeps its dedicated branch (raw-string isolation per Issue 110 §4.1);
the new branch handles **the remaining paid plans**.

### Calculator (pure)

```ts
export function calculateCreditSummary(
  res: CreditBalanceResponse,
  nowMs: number = Date.now(),
): MacroCreditSummary {
  const billingRem  = sumGrantRemaining(res, 'billing');
  const topupRem    = sumGrantRemaining(res, 'topup');
  const bonusRem    = sumGrantRemaining(res, 'bonus');
  const rolloverRem = sumGrantRemaining(res, 'rollover');

  return {
    Total:               round1(res.total_granted),
    AvailableCredits:    round1(res.total_remaining),
    TotalUsed:           round1(res.total_billing_period_used),
    Source:              MacroCreditSource.CREDIT_BALANCE,
    DailyRemaining:      round1(res.daily_remaining),
    DailyLimit:          round1(res.daily_limit),
    BillingRemaining:    round1(billingRem),
    TopupRemaining:      round1(topupRem),
    BonusRemaining:      round1(bonusRem),
    RolloverRemaining:   round1(rolloverRem),
    ExpiringSoonCredits: sumExpiringWithin(res, nowMs, 14),
    LedgerEnabled:       true,
  };
}
```

`round1()` rounds to **one decimal place** so the panel can render
`102.3` faithfully (current code rounds to integer — that's an
acceptable lossy display, but the stored number is `102.3`).

---

## 5. Enrichment flow

```
parseLoopApiResponse(json)
  └─ perWs = workspaces.map(parseWorkspaceItem)
  └─ applyLifecycleOverrides(perWs)
  └─ aggregateCreditTotals(perWs)
  └─ matchCurrentWorkspace(perWs)
  └─ buildWsByIdIndex(perWs)
  └─ schedule(applyCreditBalanceEnrichment)   ← NEW (async, non-blocking)

applyCreditBalanceEnrichment()
  └─ for each ws where isPaidPlanForCreditBalance(ws.plan) && plan !== 'pro_0':
       └─ cached = cache.get(ws.id, ttl=60s)
       └─ json   = cached ?? await fetchCreditBalance(ws.id)
       └─ summary = calculateCreditSummary(json)
       └─ applySummaryToRow(ws, summary, json)
  └─ if any row mutated:
       └─ applyLifecycleOverrides(perWs)
       └─ aggregateCreditTotals(perWs)
       └─ matchCurrentWorkspace(perWs)
       └─ trigger UI repaint via existing channel
```

Concurrency: process workspaces **sequentially** (per `no-retry-policy`
sister rule — bounded fan-out only). Total HTTP cost per cycle:
≤ N paid workspaces, ≤ 1 request each, gated by 60 s TTL.

---

## 6. WorkspaceCredit row mutation

Identical to `pro-zero/pro-zero-enrichment.ts → applySummaryToRow`:

```ts
ws.totalCredits     = summary.Total;
ws.available        = summary.AvailableCredits;
ws.totalCreditsUsed = summary.TotalUsed;
ws.billingAvailable = summary.BillingRemaining;
ws.rollover         = summary.RolloverRemaining;
ws.rolloverLimit    = summary.RolloverRemaining;           // no `granted` for rollover in response — use remaining
ws.dailyFree        = summary.DailyRemaining;
ws.dailyLimit       = summary.DailyLimit;
ws.creditBalanceJson = JSON.stringify(json, null, 2);       // for Copy-JSON
ws.creditBalanceSource = 'credit-balance';                  // disambiguate from legacy
```

For P0058 the row will become:
- ⚡ **102.3 / 305** (matches Lovable sidebar exactly)
- 🔄 Rollover **102.3 / 300**
- 📅 Free **0 / 5**
- 💰 Monthly **0 / 0** (no billing grant for pro_1 — rollover-only plan)

---

## 7. Caching

In-memory only (`Map<wsId, { json, fetchedAt }>`); **not** localStorage
(per Core: tokens-only in localStorage, but credit data is privacy-sensitive
and short-lived — keep in-process).

- **TTL**: `creditBalanceTtlMs` setting, default **60 000 ms**.
- **Bust** on: manual Check click, Force-Refresh button, panel reopen.
- **Eviction**: LRU at 50 entries (matches typical user's ws count).

---

## 8. Tests

### Calculator (pure)

| Test | Fixture | Expected |
|---|---|---|
| `calc-pro1-p0058` | P0058 response above | Total=305, Available=102.3, TotalUsed=6.2, RolloverRem=102.3 |
| `calc-zero-balance` | total_remaining=0, total_granted=0 | All zeros, no NaN |
| `calc-daily-only` | only `daily` in grant_type_balances | RolloverRem=0, DailyRem from response |
| `calc-expiring-7-day` | rollover expiring in 7d, 21d | ExpiringSoonCredits = first only (within 14d window) |

### Fetcher

| Test | Mock | Expected |
|---|---|---|
| `fetcher-200-ok` | mock httpRequest → 200 + JSON | resolves with parsed object |
| `fetcher-401-refresh-once` | mock 401 → refresh → 200 | resolves, 2 fetch calls |
| `fetcher-401-twice` | mock 401 → refresh → 401 | rejects with CreditBalanceFetchError, no third call |
| `fetcher-5xx-no-retry` | mock 503 | rejects immediately, no retry |

### Enrichment

| Test | Setup | Expected |
|---|---|---|
| `enrich-pro1-mutates-row` | one pro_1 ws, mock fetch returns P0058 JSON | ws.available === 102.3, ws.totalCredits === 305 |
| `enrich-free-skipped` | plan='free' | fetcher never called |
| `enrich-pro0-skipped-here` | plan='pro_0' | fetcher never called (pro-zero branch owns it) |
| `enrich-cache-hit-skips-fetch` | two consecutive calls within TTL | one network call total |
| `enrich-fetch-fail-leaves-legacy` | mock 503 | ws.available unchanged from legacy parse |

All tests live under `__tests__/` and follow existing Vitest conventions.

---

## 9. Telemetry / logging

Per `mem://standards/error-logging-via-namespace-logger.md`:

- **success**: `Logger.info('[CreditBalance] enriched ws=' + wsId + ' avail=' + summary.AvailableCredits + '/' + summary.Total)`
- **HTTP error**: `Logger.error('[CreditBalance][CODE RED] wsId=' + wsId + ' status=' + httpStatus + ' path=standalone-scripts/macro-controller/src/credit-balance/credit-balance-fetcher.ts reason=' + reason)`
- **cache hit**: `Logger.debug('[CreditBalance] cache HIT ws=' + wsId + ' age=' + ageMs + 'ms')`

No swallowed errors.

---

## 10. Open questions

None blocking. Decisions captured:

- Q: Sequential vs parallel fan-out? → **Sequential** (memory: no unauthorized concurrency).
- Q: Persist cache to localStorage? → **No** (in-memory only).
- Q: Override pro_0? → **No** (pro_0 keeps its dedicated branch).
- Q: Round to integers or 1 decimal? → **1 decimal** in calculator, renderer decides display.

---

## 11. Acceptance criteria

- [ ] P0058 row in panel shows `⚡102.3 / 305` after one Check cycle.
- [ ] Hover card on P0058 shows rollover **102.3 / 300** and daily **0 / 5**.
- [ ] CSV export for P0058 includes the enriched values (not legacy).
- [ ] Vitest suite green; ≥ 10 new test cases.
- [ ] `bunx tsc --noEmit` exit 0; `npx eslint standalone-scripts --max-warnings=0` exit 0.
- [ ] One full Check cycle for a 10-workspace account: ≤ 10 `/credit-balance` requests (TTL gate verified in network panel).
- [ ] CODE-RED log lines visible when `/credit-balance` returns 404 or 5xx; row falls back to legacy values cleanly.

---

## 12. Rollout

1. Land calculator + tests (no behaviour change yet).
2. Land fetcher + cache + tests.
3. Land enrichment wiring (off by default behind `enableCreditBalanceEnrichment` setting, default **true**).
4. Bump version (MINOR), changelog, README.
5. Manual smoke test against P0058 + a `lite` workspace + a `pro_0` (regression check).

End of spec.
