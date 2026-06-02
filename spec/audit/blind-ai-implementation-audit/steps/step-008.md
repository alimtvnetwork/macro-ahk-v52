# Step 8 — `spec/02-coding-guidelines` vs `.lovable/coding-guidelines.md`

**Time:** ~3 min · **Severity:** High

- **Sources:** `spec/02-coding-guidelines/consolidated-review-guide.md` (723 lines) and condensed (212 lines); `.lovable/coding-guidelines.md` (150 lines).
- **Blind-AI likely output:** LLM reading `.lovable/coding-guidelines.md` will get ~20% of the rules in spec. Most CQ rules (CQ14 braces, CQ15 newlines, no-unknown, etc.) live in spec.
- **Actual:** 150-line subset vs 723-line master — heavy drift. The Lovable copy lacks the full No-Explicit-Unknown matrix, defensive-access patterns, and constant-naming details.
- **Gap:** Critical. A blind AI driven by Lovable context only will produce code that fails ESLint and review.
- **Recommendation:** Either auto-generate `.lovable/coding-guidelines.md` from the spec condensed file, or replace it with a one-line pointer to `spec/02-coding-guidelines/consolidated-review-guide-condensed.md`.
