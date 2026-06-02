# Step 71 — Dark-only theme enforcement

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Core rule:** Dark Theme Enforced
**Files:** `src/components/theme/ThemeProvider.tsx`, `src/index.css`

## Reasoning
A blind LLM that adds a light variant or theme toggle violates a Core rule.

## Findings
- ✅ `ThemeProvider` is dark-only: `type Theme = "dark"`, actively strips `light` class on every mount.
- ✅ CSS sentinel `#marco-css-sentinel` validates injection.
- 🟡 **Med**: no lint rule rejecting `prefers-color-scheme: light`, `useTheme` toggles, or `class="light"` in JSX.
- 🟢 **Low**: `index.css` has only dark `:root` tokens — no `.light` block (good).

## Recommendation
Add a CI grep: `rg -n "prefers-color-scheme:\s*light|className=.light." src/` must return 0.
