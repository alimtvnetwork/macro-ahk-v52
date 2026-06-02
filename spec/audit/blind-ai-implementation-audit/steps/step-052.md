# Step 52 — Three-world model (MAIN / ISOLATED / BG)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Spec:** `04-architecture/02-three-world-model.md`
**Memory:** `mem://architecture/injection-context-awareness` (SDK only in MAIN)

## Reasoning
A blind LLM that misplaces code between worlds will produce a silent failure (e.g. `chrome.*` in MAIN, or `RiseupAsiaMacroExt` in ISOLATED). The constraint is well-known and the SDK is gated.

## Findings
- ✅ Spec articulates world boundaries; memory reiterates SDK availability.
- 🟡 **Med**: no lint/codemod that flags `chrome.` usage inside files under `src/content/` MAIN world, or `RiseupAsiaMacroExt` inside ISOLATED helpers. A blind LLM will violate this silently.
- 🟢 **Low**: no per-file header comment convention declaring world (e.g. `// @world main`).

## Recommendation
Add `eslint-plugin-boundaries` or a custom rule that maps directory → world and forbids cross-world APIs.
