# Step 14 — Failure-log mandatory shape

**Time:** ~3 min · **Severity:** Med

- **Sources:** `mem://standards/verbose-logging-and-failure-diagnostics`, `src/background/recorder/failure-logger.ts`, `js-step-diagnostics.ts`, `selector-comparison.ts`.
- **Blind-AI likely output:** LLM would invent ad-hoc failure objects. Memory mandates `Reason`, `ReasonDetail`, `SelectorAttempts[]`, `VariableContext[]`.
- **Actual:** Implementation files exist and are tested (`__tests__/selector-comparison.test.ts`, `__tests__/js-step-diagnostics.test.ts`). Spec presence confirmed.
- **Gap:** No schema validator (e.g. Zod) at the boundary — a new failure site could omit `SelectorAttempts` and tests wouldn't catch it.
- **Recommendation:** Add a `FailureReportSchema` Zod object + a runtime assert helper used by every emitter; unit-test the schema rejects missing fields.
