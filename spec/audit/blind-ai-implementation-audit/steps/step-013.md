# Step 13 — Namespace `Logger.error()` rule vs `console.error`

**Time:** ~1 min · **Severity:** Critical

- **Sources:** Core memory rule "Namespace Logging: Use `RiseupAsiaMacroExt.Logger.error()`, never bare `log()` for errors"; grep over `src/`.
- **Blind-AI likely output:** Without enforcement, LLM emits `console.error`. Memory says namespace logger is mandatory.
- **Actual:** `rg -c "console.error" src/` → **24 files**. `rg -c "RiseupAsiaMacroExt.Logger.error" src/` → **0 files**. The rule has effectively zero compliance in the React side.
- **Gap:** Critical drift. The namespace Logger may only exist in MAIN-world content scripts (per `mem://architecture/injection-context-awareness`), but the memory rule does not state that exception. Either the rule is too broad, or 24 files are wrong.
- **Recommendation:** Clarify scope of the namespace-logger rule (MAIN-world only? Or universal?). Then add `no-console` ESLint rule with the documented allowlist; mark React/options-page exceptions explicitly.
