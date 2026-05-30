---
name: pro-one-credit-totals
description: Issue 120 — pro_1 (and other non-pro_0 paid plans) Credit Totals use billing-period fields only
type: feature
---

## pro_1 / non-pro_0 Credit Totals Calculation (Issue 120, v3.32.0)

### Authority rule
For every workspace whose `plan` is NOT `pro_0` and whose `tier` is NOT `FREE`,
`aggregateCreditTotals()` in `standalone-scripts/macro-controller/src/credit-totals.ts`
reads ONLY the workspace **billing-period** fields. The legacy "sum of five pools"
total (`granted + daily + billing + topup + rollover`) is forbidden for the
Credit Totals modal — it double-counts daily free + bonus + topup credits and
inflates the user's monthly plan grant.

### Mapping table

| `CreditTotals` field | Source (non-pro_0, non-FREE) | Source (pro_0, enriched) |
|----------------------|------------------------------|--------------------------|
| `used`               | sum of `ws.used` (`billing_period_credits_used`) | sum of `ws.totalCreditsUsed` (`total_billing_period_used`) |
| `remaining`          | sum of `ws.billingAvailable` (limit − used) | sum of `ws.available` (`total_remaining`) |
| `granted`            | sum of `ws.limit` (`billing_period_credits_limit`) | sum of `ws.totalCredits` (`total_granted`) |
| `freeDailyRemaining` | MAX of `ws.dailyFree` (per-account, sampled even on FREE rows) | same |

### Plan branch
- `plan === 'pro_0'` → use enriched fields (pro-zero-enrichment overwrites them).
- `plan === 'free'` OR `tier === 'FREE'` → excluded from billing sums entirely.
- everything else (`pro_1`, `pro_3`, `lite`, `ktlo`, …) → billing-period fields only.

### Spec references
- `spec/21-app/03-data-and-api/api-response/04-plan.md` line 40 — "Credits summary
  text: Derived from `daily_credits_used / daily_credits_limit` and
  `billing_period_credits_used / billing_period_credits_limit`."
- `spec/21-app/02-features/macro-controller/credit-system.md` — pool definitions
  (the five-pool sum is still valid for the per-row Credit Bar; the Credit
  Totals modal uses billing-period only).
- Related: `mem://features/macro-controller/pro-zero-credit-balance`,
  `mem://features/macro-controller/credit-totals-exclude-free`.

### Test coverage
`standalone-scripts/macro-controller/src/__tests__/credit-totals.test.ts` —
11 tests including the explicit Issue 120 regression
("pro_1 Total equals billing_period_credits_limit ONLY"). All 83 credit-totals
suite tests green at v3.32.0.
