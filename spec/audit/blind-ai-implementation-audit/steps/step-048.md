# Step 48 — Dropzone overlay UX

**Time:** ~1 min · **Severity:** Low

- **Sources:** `dropzone-overlay.ts`, `__tests__/dropzone-overlay.test.ts`, spec `07-data-source-drop-zone.md`.
- **Blind-AI likely output:** LLM would build with React DnD. Memory says React rejected — must be vanilla DOM.
- **Actual:** Module + test present in non-React recorder tree. Compliant.
- **Gap:** No visual regression test (screenshot) — overlay positioning is critical for UX but unguarded.
- **Recommendation:** Add a Playwright visual test capturing overlay over a fixture grid at viewport edges.
