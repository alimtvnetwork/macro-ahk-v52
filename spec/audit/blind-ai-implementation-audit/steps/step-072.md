# Step 72 — Theme variable architecture (HSL semantic tokens)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Spec:** `07-design-system/02-theme-variable-architecture.md`

## Reasoning
Lovable's design-system prompt mandates HSL semantic tokens; raw hex/Tailwind colors break theming.

## Findings
- ✅ `src/index.css` uses `--background`, `--foreground`, etc.; consumers use `hsl(var(--token))`.
- 🟡 **Med**: 52 raw hex/hsl literals across `src/index.css` — most are token definitions (OK) but no audit distinguishes definitions vs. component-level violations.
- 🟢 **Low**: no automated grep for hex/RGB in `src/**/*.tsx`.

## Recommendation
Add `scripts/check-no-raw-colors-in-components.mjs` excluding `src/index.css` and `tailwind.config.ts`.
