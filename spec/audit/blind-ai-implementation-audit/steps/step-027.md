# Step 27 — OPFS 7-day prune

**Time:** ~1 min · **Severity:** High

- **Sources:** `mem://architecture/session-logging-system`.
- **Blind-AI likely output:** LLM would implement OPFS write but skip prune; logs grow unbounded.
- **Actual:** `rg "OPFS|navigator\.storage"` over `src/` returned **0 hits**. Memory claims SQLite + OPFS with 7-day prune is active.
- **Gap:** Either OPFS lives in `standalone-scripts/` only and memory is misleading about scope, or it's missing entirely. Memory drift either way.
- **Recommendation:** Verify OPFS module location; if absent in extension runtime, downgrade memory entry to "SQLite-only" or implement OPFS with a tested prune. Add `opfs-prune.test.ts` with a fake-time fixture.
