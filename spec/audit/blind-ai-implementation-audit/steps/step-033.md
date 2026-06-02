# Step 33 — Token retrieval waterfall (zero-network)

**Time:** ~2 min · **Severity:** Low

- **Sources:** `mem://auth/token-retrieval-strategy`, `auth-resolve.ts`, `auth-bridge.ts`, diagram `auth-bridge-waterfall.mmd`.
- **Blind-AI likely output:** LLM would call a network endpoint immediately. Memory mandates local-first waterfall.
- **Actual:** Dedicated diagram + resolver + bridge files exist; structure matches memory.
- **Gap:** No assertion test that the waterfall is "zero-network" until exhausted — i.e. no `fetch()` calls happen during `localStorage`/`session-bridge` lookup phases.
- **Recommendation:** Add `auth-resolve.zero-network.test.ts` mocking `fetch` and asserting it's not invoked when localStorage path returns a token.
