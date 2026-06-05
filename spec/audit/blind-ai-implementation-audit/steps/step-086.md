# Step 86 — Documentation standards (readme.md / CHANGELOG / CONTRIBUTING)

**Timestamp:** 2026-06-02
**Memory:** `mem://workflow/documentation-standards` + `mem://workflow/root-readme-authoring-order`

## Reasoning
Authoring order (Title → badges → hero → Install Windows-first → About) is precise. Easy to violate.

## Findings
- ✅ Order documented in memory.
- 🟡 **Med**: no test asserting README structure (badges before hero, PowerShell before Bash, etc.).
- 🟢 **Low**: `check-changelog-entry.mjs` enforces changelog presence — good.

## Recommendation
`scripts/check-readme-structure.mjs` validating section order.
