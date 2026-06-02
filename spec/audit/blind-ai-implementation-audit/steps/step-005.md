# Step 5 — `.lovable/memory/what-to-read.md` discoverability

**Time:** ~1 min · **Severity:** Med

- **Sources:** `mem://index.md`, `.lovable/memory/what-to-read.md`.
- **Blind-AI likely output:** A low-grade LLM only sees `mem://index.md` in core context. If `what-to-read` is not linked there, it's invisible until requested.
- **Actual:** `mem://index.md` does NOT list `what-to-read` in the Memories section.
- **Gap:** Discoverability hole — the onboarding map is unreachable from the always-loaded index.
- **Recommendation:** Add `- [Onboarding map](mem://what-to-read) — Where to start for any new session` to the index Core section.
