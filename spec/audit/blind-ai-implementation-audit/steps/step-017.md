# Step 17 — Form snapshot capture

**Time:** ~2 min · **Severity:** Med

- **Sources:** `mem://features/form-snapshot-capture`, recorder code under `src/background/recorder/`.
- **Blind-AI likely output:** LLM may capture values always-on (PII risk). Memory requires verbose-gated values, always-on field names+types, sensitive masking.
- **Actual:** Memory entry asserts implementation; no direct test file named `form-snapshot.test.ts` in earlier sample.
- **Gap:** Test coverage for the "field names+types always, values gated" contract was not verified in the grep above — may rely solely on integration paths.
- **Recommendation:** Add a focused unit test `form-snapshot.test.ts` covering: (a) verbose OFF redacts values, keeps names/types; (b) sensitive field names always masked regardless of toggle.
