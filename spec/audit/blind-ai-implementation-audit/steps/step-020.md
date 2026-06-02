# Step 20 — Webhook fail-fast (single-attempt)

**Time:** ~2 min · **Severity:** Low

- **Sources:** `mem://constraints/webhook-fail-fast.md`, `src/background/recorder/step-library/result-webhook.ts`, `__tests__/webhook-fixtures.ts`, `mem://features/webhook-result-schema-version`.
- **Blind-AI likely output:** LLM defaults to retry-queue pattern. Memory bans it.
- **Actual:** Dedicated module + fixtures exist; schema version v2 documented with migration helper.
- **Gap:** No assertive test "result-webhook does NOT retry on 5xx". Implementation correctness inferred from memory not test.
- **Recommendation:** Add `result-webhook.fail-fast.test.ts` that stubs a 500 response and asserts exactly one outbound fetch + no queue write.
