# Step 42 — Recorder keyboard shortcuts (Ctrl+Alt+P / ; / .)

**Time:** ~1 min · **Severity:** Low

- **Sources:** `mem://features/recorder-keyboard-shortcuts`, `recorder-toolbar.ts`, `recorder-store.ts`, `step-library/hotkey-executor.ts`, `__tests__/recorder-toolbar.test.ts`, `hotkey-executor.edge-cases.test.ts`.
- **Blind-AI likely output:** LLM may swallow shortcuts in editable fields. Memory mandates ignore in editables; only active during session.
- **Actual:** Edge-case test present (`hotkey-executor.edge-cases.test.ts`) plus toolbar test. Healthy coverage.
- **Gap:** No explicit test "shortcut ignored in `<input>`/`<textarea>`/`contenteditable`". Edge-case test naming doesn't guarantee it covers that case.
- **Recommendation:** Add named test `hotkey-ignored-in-editable.test.ts` for each shortcut + each editable surface.
