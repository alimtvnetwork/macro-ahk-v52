# Step 74 — Selector standards (data-* attributes)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://ui/selector-standards`

## Reasoning
CSS-class selectors are fragile under refactor. Recorder + replay rely on stable `data-*` hooks.

## Findings
- ✅ Memory documents the rule.
- 🟡 **Med**: no lint rule rejecting `querySelector('.some-class')` inside recorder/replay code.
- 🟢 **Low**: no migration audit of legacy `.class` selectors in `content-scripts/`.

## Recommendation
`scripts/audit-selector-strategy.mjs` listing every `querySelector('.…')` in recorder/replay paths.
