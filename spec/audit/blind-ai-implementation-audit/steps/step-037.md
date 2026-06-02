# Step 37 — Post-move credit sync (v3.40.0)

**Time:** ~2 min · **Severity:** High

- **Sources:** `mem://features/macro-controller/post-move-credit-sync`, `ws-move.ts`, `loop-move-gate.ts`, `__tests__/ws-move-post-refresh.test.ts`.
- **Blind-AI likely output:** LLM would fire-and-forget `fetchAsync`. Memory mandates `await fetchAndPersist(target,force)` THEN `fetchAsync()`.
- **Actual:** Dedicated test `ws-move-post-refresh.test.ts` present — strong guard.
- **Gap:** Memory also says "Copy JSON wraps pro_0 AND pro_1 with /credit-balance" — that wrapper not directly verified in sampled tests.
- **Recommendation:** Add `copy-json-wraps-credit-balance.test.ts` ensuring the exported JSON for both pro_0 and pro_1 contains a top-level `/credit-balance` envelope.
