# Step 50 — Replay failure → failure-log shape compliance

**Time:** ~2 min · **Severity:** Med

- **Sources:** `failure-logger.ts`, `instruction-failure-adapters.ts`, `step-library/replay-bridge.ts`, tests `failure-logger.test.ts`, `failure-logger-verbose.test.ts`, `failure-logger-form-snapshot.test.ts`, `failure-report-fixtures.test.ts`.
- **Blind-AI likely output:** LLM emits ad-hoc shapes per step type. Memory mandates uniform `Reason`, `ReasonDetail`, `SelectorAttempts`, `VariableContext`.
- **Actual:** Adapter pattern (`instruction-failure-adapters.ts`) suggests centralized normalization; fixtures test exists.
- **Gap:** S14's recommended Zod schema is still missing — `failure-report-fixtures.test.ts` likely checks specific fixtures, not the schema invariant universally.
- **Recommendation:** Per S14, add `FailureReportSchema` Zod object; have all adapters output through it; convert fixture test to schema-property test (every fixture passes schema parse).
