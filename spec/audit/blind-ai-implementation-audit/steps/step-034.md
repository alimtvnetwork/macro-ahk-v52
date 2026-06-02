# Step 34 — Credit monitoring retry-once-on-refresh

**Time:** ~2 min · **Severity:** Low

- **Sources:** `mem://architecture/credit-monitoring-system`, diagram `credit-monitoring-flow.mmd`, `credit-balance/fetcher.ts`, `batch-refresh.ts`.
- **Blind-AI likely output:** LLM would loop on 401. Memory mandates exactly one retry after token refresh.
- **Actual:** Modular split (`fetcher`, `pro-one-enrichment`, `batch-refresh`) suggests deliberate design.
- **Gap:** Need a test ensuring "second 401 = surface error, no third attempt". Not visible in sampled file list under that exact name.
- **Recommendation:** Add `fetcher.retry-once.test.ts`: stub two consecutive 401s and assert exactly 2 fetches + thrown error, no third.
