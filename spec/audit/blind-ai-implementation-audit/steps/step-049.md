# Step 49 — Hover highlighter behavior

**Time:** ~1 min · **Severity:** Low

- **Sources:** `hover-highlighter.ts`, spec `17-hover-highlighter-and-data-controllers.md`.
- **Blind-AI likely output:** LLM may leave highlight on scroll/blur. Memory's "Timer & observer teardown" rule applies.
- **Actual:** Module exists; no `hover-highlighter.test.ts` visible in sampled list.
- **Gap:** **Missing test file** — violates `mem://preferences/test-with-features`.
- **Recommendation:** Add `hover-highlighter.test.ts` covering: highlight on enter, clear on leave/scroll/pagehide, no leaked observers after teardown.
