# 57 — pro_1 Credit Totals: which formula?

**Context:** User reported the Credit Totals modal was showing wrong numbers for
`pro_1` accounts and asked to fall back to the historical spec ("total number
of credits and then the billing period"). Two specs co-exist:

1. `spec/21-app/02-features/macro-controller/credit-system.md` — Total = sum of
   all five pools (`granted + daily + billing + topup + rollover`). Used for
   the per-row Credit Bar.
2. `spec/21-app/03-data-and-api/api-response/04-plan.md` line 40 — "Credits
   summary text: Derived from `daily_credits_used / daily_credits_limit` and
   `billing_period_credits_used / billing_period_credits_limit`."

## Options

### A — Billing-period fields ONLY (chosen)
`Total = billing_period_credits_limit`, `Used = billing_period_credits_used`,
`Remaining = limit − used`. Daily free reported in its own card (already is).

- ✅ Pros: matches spec #2 verbatim, matches what lovable.dev's own UI shows,
  removes the inflated 365-credit display the user complained about, simplest
  mental model.
- ❌ Cons: rollover + topup + bonus no longer counted toward "Remaining"
  (rollover/topup are separately summed elsewhere, but a power-user with large
  topup could feel under-counted).

### B — Sum of all five pools (legacy)
Keep the existing `granted + daily + billing + topup + rollover` formula.

- ✅ Pros: matches spec #1, no migration.
- ❌ Cons: this IS the bug the user is reporting. Daily and granted are
  double-counted across workspaces; topup is non-recurring.

### C — Billing + topup + rollover (hybrid)
Sum only the "real spendable" pools, excluding daily and granted.

- ✅ Pros: nominally more accurate for power users.
- ❌ Cons: contradicts both specs; no source of truth; risks recurring drift.

## Recommendation
**Option A.** It matches the explicit spec the user pointed to and matches the
website's own UI. Per-row Credit Bar continues to use the legacy five-pool
formula (it visualises composition, not a total). `pro_0` continues to use the
authoritative `/credit-balance` enriched fields. FREE tier remains excluded.

Implemented in v3.32.0 — see `mem://features/macro-controller/pro-one-credit-totals`.
