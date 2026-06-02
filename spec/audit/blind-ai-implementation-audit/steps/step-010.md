# Step 10 — Folder-numbering convention discoverability

**Time:** ~1 min · **Severity:** Low

- **Sources:** `spec/00-overview.md` (numbering table), `mem://architecture/spec-organization`, `mem://workflow/file-naming-convention`.
- **Blind-AI likely output:** A low-grade LLM that lands in `spec/` first will see the table. One that lands in `src/` or `.lovable/` first will not, and may invent ad-hoc numbers.
- **Actual:** Rule is recorded in three places (spec overview, two memory entries) but not surfaced in `mem://index.md` Core, only in linked memory files.
- **Gap:** Always-loaded context does NOT contain the numbering rule. New files in foundations vs app risk landing in wrong range.
- **Recommendation:** Add a one-line Core rule to `mem://index.md`: "Spec & workflow numbering: 01–20 = foundations, 21+ = app, 99 = archive."
