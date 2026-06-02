# Step 41 — `spec/31-macro-recorder` coverage

**Time:** ~3 min · **Severity:** Low

- **Sources:** 21 files in `spec/31-macro-recorder/` (00–19 + 97/99 + llm-guide.md).
- **Blind-AI likely output:** Spec is exhaustive (glossary, phases, data-model, ERD, per-project DB, xpath engine, drop-zone, field-ref wrapper, persistence/replay, viz, inline JS, e2e contract, capture-bridge, step-chain, group library, hover, conditional, URL/tabs/waits/conditions, llm-guide). A low-grade LLM can bootstrap most subsystems.
- **Actual:** All scaffolding present; dedicated `llm-guide.md` is a major plus — it's the only spec folder with an explicit AI-onboarding doc.
- **Gap:** No `98-changelog.md` — drift over 19 numbered docs is hard to track.
- **Recommendation:** Add `98-changelog.md` skeleton; require version bumps to update it.
