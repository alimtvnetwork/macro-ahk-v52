# Step 36 — Credit Totals exclude FREE tier (v3.31.0)

**Time:** ~1 min · **Severity:** Low

- **Sources:** `mem://features/macro-controller/credit-totals-exclude-free`, `credit-totals.ts`, `__tests__/credit-totals.test.ts`, `issue-123-credit-totals-pro*.test.ts`.
- **Blind-AI likely output:** LLM would naively sum all tiers. Memory mandates FREE excluded from Used/Remaining/Total.
- **Actual:** Three `issue-123-credit-totals-*` tests + `credit-totals.test.ts` — strong coverage.
- **Gap:** No explicit test named for "FREE excluded" — coverage assumed inside `issue-123` tests.
- **Recommendation:** Add a one-line test `aggregateCreditTotals.excludes-free.test.ts` with a FREE-tier-only fixture asserting all three totals = 0.
