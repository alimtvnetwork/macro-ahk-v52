# Runbooks — Top-15 Reason Codes

Status: Normative · v1.0.0 · 2026-06-02

Operator-facing recovery steps. One section per code. Cross-ref:
quickref → observability/14-error-taxonomy-quickref.md
full registry → observability/12-failure-reason-codes.md

---

## F_SELECTOR_MISS
**Symptom:** Step failed; SelectorAttempts[] shows all strategies exhausted.
**Diagnose:** Open audit JSON → `SelectorAttempts[]`. Check `matchCount=0` per strategy.
**Fix:** Add `data-*` attribute (ui/selector-standards) or update macro selector.
**Verify:** Re-run; expect `R_RETRY_OK`.

## F_VAR_UNRESOLVED
**Symptom:** Required variable null; `VariableContext[]` shows `source=null`.
**Diagnose:** Trace waterfall (variables/11) — which tier failed?
**Fix:** Provide default in `variables/14-builtin-context-reference.md` or supply via data source row.
**Verify:** Re-run with verbose ON to see resolved value.

## F_JS_THREW
**Symptom:** JsInline step (StepKindId 4) raised.
**Diagnose:** Inspect `JsLog` in failure report (mem://features/js-step-diagnostics).
**Fix:** Wrap risky code in try/catch; return structured error.
**Verify:** Unit test in testing/10 covers the path.

## F_SCHEMA_INVALID
**Symptom:** Macro JSON rejected at load.
**Diagnose:** Run `node scripts/spec/lint-cross-refs.mjs` then validate against json/10.
**Fix:** Add missing required fields; coerce types.

## F_BUSY
**Symptom:** Second run queued; first still running.
**Fix:** Wait or Stop existing run (Ctrl+Alt+.). No retry policy applies.

## F_NAV_INTERRUPT
**Symptom:** Tab navigated mid-run.
**Fix:** Re-run after navigation settles; consider guarding macro start with URL match.

## F_WATCHDOG
**Symptom:** Loop/time budget exceeded (guards/12).
**Fix:** Reduce loop count or split macro. Adjust `LOOP_MAX` only with security sign-off.

## F_FORBIDDEN
**Symptom:** Guard matrix violation (guards/10).
**Fix:** Use an allowed API. Do NOT widen the matrix without threat-model review (security/10).

## R_RETRY_OK
**Symptom:** Selector resolved on retry. Informational only.

## R_VAR_DEFAULT
**Symptom:** Default substituted. Confirm intent in variables/14.

## R_SCORE_LOW
**Symptom:** Parsed score below threshold (engine/12).
**Fix:** Tune threshold or improve scoring prompt.

## W_PERF_BUDGET
**Symptom:** Soft budget exceeded (performance/10).
**Fix:** Profile via `MACRO_PERF_DUMP`; optimise hot path.

## W_DEPRECATION
**Symptom:** Deprecated field/StepKind used.
**Fix:** Migrate per macros/MIGRATION.md; will hard-fail at next MAJOR.

## W_TRUNCATED
**Symptom:** HTML/text truncated to 120/240 chars in non-verbose mode.
**Fix:** Toggle verbose for project if full payload needed (mem://features/verbose-logging-toggle).

## W_MASKED
**Symptom:** Sensitive value masked (variables/13). Expected behavior.
