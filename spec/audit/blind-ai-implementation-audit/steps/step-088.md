# Step 88 — Skipped folders policy

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Core rule:** Read-only `skipped/` and `.release/`

## Reasoning
Blind LLM will happily edit any path. Hard rule needed.

## Findings
- ✅ Memory + Core rule documented.
- 🔴 **High**: no `.gitattributes` or pre-commit hook enforcing read-only. Rule is **prose-only** — blind LLM will violate.

## Recommendation
Add `scripts/check-no-edits-to-skipped.mjs` invoked in CI comparing `git diff` against `skipped/` + `.release/`.
