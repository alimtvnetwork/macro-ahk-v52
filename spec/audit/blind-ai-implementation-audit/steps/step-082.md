# Step 82 — Suggestions convention

**Timestamp:** 2026-06-02
**Memory:** `mem://workflow/suggestions-convention`
**Files:** `.lovable/memory/suggestions/01-suggestions-tracker.md`, `.lovable/suggestions.md`

## Reasoning
"Single file tracking" is the rule, but two locations exist.

## Findings
- 🟡 **Med**: `.lovable/suggestions.md` + `.lovable/memory/suggestions/01-suggestions-tracker.md` + standalone dated suggestion file all coexist. Risk of drift.
- 🟢 **Low**: dated file (`20260424-1900-suggestion-installer-…`) violates "single file" convention.

## Recommendation
Fold standalone dated suggestion into `01-suggestions-tracker.md`; delete the dated file.
