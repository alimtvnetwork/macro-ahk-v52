# 05 — Handoff: where the next AI should start reading

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T120

**Reading order for any AI model picking up this spec cold:**

1. `00-overview.md` — purpose, Q1–Q8 placeholders, non-goals.
2. `01-plan-tasks-1-20.md` — 120-task index and completion ledger.
3. `01-glossary/` — vocabulary + banlist.
4. `02-data-model/` + `03-prompt-source-format/` — what a Prompt **is** on disk and in memory.
5. `04-loader-contract/` → `05-ui-contract/` → `06-injection-contract/` + `07-editor-adapters/` — the read/paste happy path.
6. `08-save-create-edit/` — author flows.
7. `09-next-overview/` → `10-queue-model/` → `11-queue-lifecycle/` → `12-delay-engine/` — automation core.
8. `13-failure-handling/` — failure taxonomy + mandatory log shape.
9. `14-plan-mode/` — plan profile delta.
10. `15-settings/` + `16-observability/` — configuration & diagnostics.
11. `17-onboarding/` + `18-test-plan/` — bring-up + QA gates.
12. `19-reference-snippets/` — copy-pastable TS pseudo-code.
13. `20-adoption-checklist/` — pre-flight, wire-up order, go-live, worked example, this handoff.

**Invariants the next model must not break**
- No `chrome.*`, `MacroController`, `RiseupAsia*`, or `Supabase` references.
- No retry-with-exponential-backoff anywhere; fail-fast only.
- Failure logs always carry `Reason` + `ReasonDetail` + `SelectorAttempts[]` + `VariableContext[]`.
- `readme.txt` is never auto-stamped with time/clock/git values.
- Verbose logging defaults OFF; full prompt bodies only when ON.

**If you need to extend the spec**, add a new top-level folder with a `NNN-` prefix continuing the numbering, and append a row to `01-plan-tasks-1-20.md`'s tracking table.
