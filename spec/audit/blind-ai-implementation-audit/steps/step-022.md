# Step 22 — `spec/05-split-db-architecture` status

**Time:** ~2 min · **Severity:** Med

- **Sources:** `spec/05-split-db-architecture/` (fundamentals, features, issues, two acceptance criteria — legacy + current).
- **Blind-AI likely output:** Coexistence of `96-acceptance-criteria-legacy.md` AND `97-acceptance-criteria.md` is confusing — LLM may follow legacy.
- **Actual:** Both files present. No banner in legacy file warning "superseded".
- **Gap:** Ambiguity in authoritative criteria.
- **Recommendation:** Add a top-of-file "SUPERSEDED — see 97" banner to every `96-*-legacy.md` file across spec; add lint check that any file matching `*-legacy.md` contains the superseded banner.
