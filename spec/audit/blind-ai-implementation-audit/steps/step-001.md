# Step 1 — `spec/00-overview.md` bootstrap completeness

**Time:** ~2 min review · **Severity:** Low

- **Sources:** `spec/00-overview.md`, `spec/01-spec-authoring-guide/00-overview.md`.
- **Blind-AI likely output:** Would read the master index, identify the 01–20 vs 21+ numbering, and start scaffolding folders correctly. Confidence is High and Ambiguity None, so a low-grade LLM gets a clean entry point.
- **Actual:** Index is current (v3.2.0, 2026-04-22), lists all folder ranges with status.
- **Gap:** No explicit "start here for AI" pointer to `.lovable/what-to-read.md`. A blind AI may miss the runtime memory layer entirely and only read `spec/`.
- **Recommendation:** Add one line near the top: "AI agents: also read `.lovable/what-to-read.md` and `mem://index.md`."
