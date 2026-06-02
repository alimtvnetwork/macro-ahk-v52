# Step 35 — `pro_0` credit balance rule (v3.11.1)

**Time:** ~3 min · **Severity:** Med

- **Sources:** `mem://features/macro-controller/pro-zero-credit-balance`, `pro-zero/` folder (`pro-zero-credit-balance-client.ts`, `pro-zero-credit-calculator.ts`, `credit-balance-response-parser.ts`, `grant-type-balance-typed.ts`).
- **Blind-AI likely output:** LLM might derive Available from workspace `*_limit`. Memory bans it for `pro_0`.
- **Actual:** Dedicated `pro-zero/` subdir with typed grant-balance models — strong structure.
- **Gap:** No explicit "must NOT use workspace `*_limit`" negative test. Future refactor could silently regress.
- **Recommendation:** Add `pro-zero-credit-calculator.no-workspace-limit.test.ts`: feed payload with workspace `*_limit` set to nonsense and assert calculator ignores it (uses only `total_granted` / `total_remaining` / `total_billing_period_used`).
