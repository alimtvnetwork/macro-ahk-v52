# Step 83 — Question-and-ambiguity convention

**Timestamp:** 2026-06-02
**Core rule:** No-Questions Mode (active, 40-task window from 2026-04-26)

## Reasoning
Instead of `ask_questions`, ambiguities log to `.lovable/question-and-ambiguity/xx-name.md` with options + pros/cons + recommendation.

## Findings
- ✅ 10 ambiguity files present (01–08 plus 01/02 duplicate-prefix entries).
- 🟡 **Med**: duplicate `01-` and `02-` prefixes (credit-totals-and-macro-ux vs. import-export-screen-shape; db-diagrams vs. hover-highlighter). Violates `mem://workflow/file-naming-convention` (numeric uniqueness).
- 🟢 **Low**: no `README.md` in the folder despite Core rule saying "append a bullet to `.lovable/question-and-ambiguity/README.md`".

## Recommendation
Create `.lovable/question-and-ambiguity/README.md` index + renumber to unique prefixes.
