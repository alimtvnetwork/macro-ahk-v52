# 05 — Handoff: where the next AI should start reading

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T120

**Reading order for any AI model picking up this spec cold:**

1. `00-overview.md` — purpose, Q1–Q8 placeholders, non-goals.
2. `01-plan-tasks-1-20.md` — 120-task index and completion ledger.
3. `10-glossary/` — vocabulary + banlist.
4. `20-data-model/` + `30-prompt-source-format/` — what a Prompt **is** on disk and in memory.
5. `40-loader-contract/` → `50-ui-contract/` → `60-injection-contract/` + `70-editor-adapters/` — the read/paste happy path.
6. `80-save-create-edit/` — author flows.
7. `90-next-overview/` → `100-queue-model/` → `110-queue-lifecycle/` → `120-delay-engine/` — automation core.
8. `130-failure-handling/` — failure taxonomy + mandatory log shape.
9. `140-plan-mode/` — plan profile delta.
10. `150-settings/` + `160-observability/` — configuration & diagnostics.
11. `170-onboarding/` + `180-test-plan/` — bring-up + QA gates.
12. `190-reference-snippets/` — copy-pastable TS pseudo-code.
13. `200-adoption-checklist/` — pre-flight, wire-up order, go-live, worked example, this handoff.

**Invariants the next model must not break**
- No `chrome.*`, `MacroController`, `RiseupAsia*`, or `Supabase` references.
- No retry-with-exponential-backoff anywhere; fail-fast only.
- Failure logs always carry `Reason` + `ReasonDetail` + `SelectorAttempts[]` + `VariableContext[]`.
- `readme.txt` is never auto-stamped with time/clock/git values.
- Verbose logging defaults OFF; full prompt bodies only when ON.

**If you need to extend the spec**, add a new top-level folder with a `NNN-` prefix continuing the numbering, and append a row to `01-plan-tasks-1-20.md`'s tracking table.
