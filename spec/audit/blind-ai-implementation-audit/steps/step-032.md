# Step 32 — Token readiness gate (10s budget)

**Time:** ~2 min · **Severity:** Med

- **Sources:** `mem://auth/token-readiness-gate`, `src/hooks/use-token-watchdog.ts`.
- **Blind-AI likely output:** LLM picks arbitrary timeout. Memory mandates unified 10s + sync fast pre-seed.
- **Actual:** `use-token-watchdog.ts` exists and references `getBearerToken`. Need to verify constant `10_000` and pre-seed sync path.
- **Gap:** The 10s budget is a magic number; not yet centralized as a named constant per `mem://architecture/config-defaults-extraction`.
- **Recommendation:** Extract `TOKEN_READINESS_BUDGET_MS = 10_000` to a shared constants module; add test `token-watchdog.budget.test.ts` that fake-times out at 10001ms and asserts the error code.
