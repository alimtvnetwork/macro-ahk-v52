# Step 16 — JS-step diagnostics (`buildJsStepFailureReport`)

**Time:** ~2 min · **Severity:** Low

- **Sources:** `src/background/recorder/js-step-diagnostics.ts` + `__tests__/js-step-diagnostics.test.ts`, `mem://features/js-step-diagnostics`.
- **Blind-AI likely output:** LLM would log `{ error: e.message }` only. Memory mandates `Reason='JsThrew'`, Vars+Row+JsLog, sensitive masking, verbose-gated truncation.
- **Actual:** Helper exists with dedicated tests; memory entry matches v3.x behavior.
- **Gap:** Sensitive-masking patterns are inline — risk of false negatives if new sensitive field names appear (e.g. `bearer`, `apiKey`).
- **Recommendation:** Extract the sensitive-key list to a shared constant (`SENSITIVE_FIELD_PATTERNS`) shared by form-snapshot + JS-step diagnostics; add a test ensuring both consume the same constant.
