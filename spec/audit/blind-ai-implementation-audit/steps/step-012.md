# Step 12 — CODE RED file-path error logging compliance

**Time:** ~2 min · **Severity:** High

- **Sources:** `mem://constraints/file-path-error-logging-code-red.md`, error sites in `src/`.
- **Blind-AI likely output:** Without a lint rule, an LLM emits generic `throw new Error('not found')`. Memory rule requires exact path + missing item + reason.
- **Actual:** 24 files contain `console.error`; spot-checks (e.g. `wasm-integrity.ts`, `prompt-injector.ts`) show many short-form errors without the mandatory triple.
- **Gap:** Rule is unenforced. No ESLint rule, no test, no codemod. Blind AI will reproduce non-compliant errors at the same rate as existing code.
- **Recommendation:** Add an ESLint custom rule `code-red/path-error-shape` that flags `throw new Error(...)` strings inside FS/network/storage modules missing `path:`, `missing:`, `reason:` substrings; add a vitest covering the helper.
