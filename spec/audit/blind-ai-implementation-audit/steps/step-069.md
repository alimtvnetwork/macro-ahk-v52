# Step 69 — Failure log schema validator

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Files:** `scripts/check-failure-log-schema.mjs` + test
**Memory:** Core rule "Failure logs (mandatory shape)"

## Reasoning
The mandatory failure-log shape (Reason + ReasonDetail + SelectorAttempts[] + VariableContext[]) is the single most important contract for debugging blind-LLM-built features.

## Findings
- ✅ Static check exists with a unit test (`check-failure-log-schema.test.mjs`).
- ✅ Cross-validated against `mem://standards/verbose-logging-and-failure-diagnostics`.
- 🟡 **Med**: validator inspects fixtures, not runtime DB rows — drift possible if a writer ships a non-conforming shape and no test exercises that code path. Reinforces S14/S50 (no central Zod schema).

## Recommendation
Promote schema to a runtime Zod parser at every `Logger.failure()` write-site; remove static fixture-only check.
