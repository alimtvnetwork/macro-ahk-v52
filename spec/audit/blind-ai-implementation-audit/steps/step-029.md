# Step 29 — Namespace database creation (max 25, `System.*` reserved)

**Time:** ~2 min · **Severity:** Low

- **Sources:** `mem://features/namespace-database-creation`, `src/background/db-manager.ts`.
- **Blind-AI likely output:** LLM may allow unlimited namespaces or use `System.*` for user data.
- **Actual:** `db-manager.ts` exists. Without reading the file in this step, enforcement is unverified.
- **Gap:** Need to confirm the max=25 and `System.*` reserved-prefix checks are guarded by tests; not yet sampled.
- **Recommendation:** Ensure two unit tests in `db-manager.test.ts`: (a) creating a 26th namespace throws with the specified error code; (b) `System.user` rejected with reserved-prefix code.
