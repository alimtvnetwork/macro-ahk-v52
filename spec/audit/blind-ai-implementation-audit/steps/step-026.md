# Step 26 — IndexedDB JsonCopy/HtmlCopy dual cache

**Time:** ~2 min · **Severity:** Low

- **Sources:** `mem://features/prompt-management`, `standalone-scripts/macro-controller/src/ui/prompt-cache.ts`, `prompt-loader.ts`, `prompt-io.ts`, `prompt-dropdown.ts`, `types/prompt-cache-keys.ts`.
- **Blind-AI likely output:** LLM defaults to single-cache. Memory mandates dual.
- **Actual:** Dedicated `prompt-cache.ts` + `prompt-cache-keys.ts` types — clean separation.
- **Gap:** No test asserting JsonCopy and HtmlCopy stay in lockstep after writes.
- **Recommendation:** Add `prompt-cache.dual.test.ts` covering: write → both keys present; delete → both removed.
