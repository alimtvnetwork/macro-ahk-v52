# Step 45 — Step-wait test coverage

**Time:** ~1 min · **Severity:** Low

- **Sources:** `step-library/step-wait.ts`, `step-library/__tests__/step-wait.test.ts` (already touched in id-denylist refactor).
- **Blind-AI likely output:** LLM would use a fixed sleep. Real implementation must honor URL/tab/appearance/wait conditions per spec doc 19.
- **Actual:** Test file exists.
- **Gap:** Spec doc 19 lists 4 wait kinds — without reading the test, coverage per kind unverified.
- **Recommendation:** Ensure `step-wait.test.ts` has one `describe` block per wait kind (URL match, tab created, element appearance, condition true).
