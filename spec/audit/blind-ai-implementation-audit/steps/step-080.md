# Step 80 — Design system spec coverage (07-design-system/*)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Spec:** `spec/07-design-system/` (14 files: 00–13 + 97/99)

## Reasoning
14 spec files is a strong baseline. Question is whether code references them.

## Findings
- ✅ Spec covers principles, theme vars, typography, spacing, borders, motion, code blocks, header, button, sidebar, sections, page rules, WP migration.
- ✅ `97-acceptance-criteria.md` + `99-consistency-report.md` present.
- 🟡 **Med**: no per-component link back to spec (e.g. Button.tsx should comment `// see spec/07-design-system/09-button-system.md`).
- 🟢 **Low**: WP migration doc (13) may be stale — extension is not WP.

## Recommendation
Add a top-of-file spec breadcrumb to canonical components.

---

## Batch 8 summary (steps 71–80)
- ✅ **Strong**: S71 (dark-only enforced in ThemeProvider), S73 (CSS sentinel — well-documented), S80 (14 design-system spec files).
- 🟡 **Med** S72 (no raw-color audit), S74 (no selector-strategy lint), S75 (no naming-prefix lint), S76 (no React-in-content-scripts boundary lint), S77 (Lovable default conflicts with no-external-animation rule), S79 (no badge-state snapshot test).
- 🟢 **Low** S78, S80.
- 🔴 **Notable conflict** S77 — Lovable's design prompt recommends `framer-motion`; project memory bans it. A blind LLM following Lovable defaults will install it. **High** priority to add preinstall block.
