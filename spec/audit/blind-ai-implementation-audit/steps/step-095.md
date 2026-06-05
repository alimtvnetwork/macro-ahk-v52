# Step 95 — Cross-cutting: 17-consolidated-guidelines vs. `.lovable/coding-guidelines.md`

**Timestamp:** 2026-06-02
**Recurring from:** S5, S90

## Findings
- 🔴 **High** (recurring): `.lovable/coding-guidelines.md` is the agent-facing distillation but covers ~20% of `spec/17-consolidated-guidelines/`. Blind LLM reads only the short file and misses 80% of rules.
- 🟡 **Med**: no automated diff alerting when spec adds a rule absent from `.lovable/coding-guidelines.md`.

## Recommendation
`scripts/check-coding-guidelines-coverage.mjs` extracting rule IDs from `spec/17-consolidated-guidelines/` and asserting each is referenced in `.lovable/coding-guidelines.md`.
