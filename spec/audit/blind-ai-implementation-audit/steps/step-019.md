# Step 19 — No-retry policy enforcement

**Time:** ~2 min · **Severity:** High

- **Sources:** Core memory "No-Retry Policy", `mem://constraints/no-retry-policy`, `src/shared/http-fail-fast.ts`.
- **Blind-AI likely output:** Default LLM instinct is to add exponential backoff. Policy bans it.
- **Actual:** `http-fail-fast.ts` exists. Grep for `backoff|retry|exponential` returned 5 files including `xpath-capture-coalescer`, `chrome-adapter`, `wasm-integrity`, `preview-adapter`. Some are likely legitimate fail-fast wrappers; some may be silent violations.
- **Gap:** No ESLint rule banning `setTimeout(... , 2 ** n * base)` patterns or recursive self-calls inside catch.
- **Recommendation:** Add a custom ESLint rule `no-retry/no-exponential-backoff` that flags `Math.pow(2, ...)`, `<<` in delay computations, and recursive `catch → fn(...)` patterns; add a deny-list test against the 5 grep hits.
