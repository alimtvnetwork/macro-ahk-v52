# Step 6 — `.lovable/overview.md` vs `spec/00-overview.md` drift

**Time:** ~2 min · **Severity:** Low

- **Sources:** `.lovable/overview.md`, `spec/00-overview.md`.
- **Blind-AI likely output:** LLM would pick whichever it reads first; risk of contradictory bootstrapping.
- **Actual:** Both exist; serve different audiences (Lovable agent workflow vs spec governance). Not strict duplicates but overlapping scope on folder layout.
- **Gap:** No cross-link from `.lovable/overview.md` to `spec/00-overview.md`. A blind AI may pick one and never see the other.
- **Recommendation:** Add reciprocal "See also" link at the top of each.
