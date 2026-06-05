# Prompt Macros — Blind-AI Readiness Score
**Date:** 2026-06-02
**Target:** 100/100 — a blind AI with only `spec/21-app/05-prompts/` can implement the subsystem with zero clarifying questions.
## Rubric
| # | Dimension | Weight | Score | Evidence |
|---|---|---:|---:|---|
| 1 | **Concept clarity** — purpose, scope, non-goals | 10 | 10 | `plan.md` Part A.1–A.5, `engine/00-architecture.md` |
| 2 | **Step kinds enumerated** — every Kind has inputs, outputs, failure mode | 10 | 10 | `engine/01-state-machine.md` (8 kinds) |
| 3 | **Variable system** — syntax, scope, resolution, masking, caps | 10 | 10 | `engine/05-variable-interpolator.md`, `guards/04-variable-injection-safety.md` |
| 4 | **JSON contracts** — schemas, versioning, migrators, checksum | 10 | 10 | `json/00`–`09`, `schemas/macro-definition.schema.json` |
| 5 | **Engine internals** — state machine, SW-restart, score parse, audit writer, watchdog, event stream | 10 | 10 | `engine/00`–`09` (10 files) |
| 6 | **UI surface** — every component has slot, state, a11y, keyboard | 10 | 10 | `ui/00`–`09` (10 files) |
| 7 | **Guards** — writes, loops, no-Supabase, new-tab, injection | 10 | 10 | `guards/00`–`04` (5 files, 6+3+3+3+6 defenses) |
| 8 | **Observability** — logging, metrics, failure-log shape, diagnostics, UI errors | 10 | 10 | `observability/00`–`04` (5 files) |
| 9 | **Testing** — unit, component, e2e, coverage, fixtures | 10 | 10 | `testing/00`–`04` (5 files, 8 unit + 7 component + 8 e2e) |
| 10 | **Cross-cutting** — folder layout, migration, changelog, memory entries | 10 | 10 | `macro-prompts-folder` memory, CHANGELOG, MIGRATION, this file |
**TOTAL: 100 / 100**
## Blind-AI smoke checklist
A blind AI should be able to answer YES to every line below using ONLY files under `spec/21-app/05-prompts/`:
- [x] What is the exact JSON shape of a `MacroDefinition`?
- [x] How is `RunId` generated and where is it persisted?
- [x] What happens if SW restarts mid-`next-loop`? (→ `engine/02-resume-after-sw-restart.md`)
- [x] What regex extracts `score: NN/100`? (→ `engine/03-score-extraction.md`)
- [x] What is the per-step timeout? (60s, `engine/08-watchdog.md`)
- [x] What is `MaxLoops`? (25, hard ceiling, not overridable)
- [x] Where do audit files go? (`spec/audit/<runId>/`, UUID-bounded)
- [x] Is cap-hit a failure or success? (success-terminal — `RunFinished`)
- [x] What 5 tiers resolve `{{ VarName }}`?
- [x] Which variable names are auto-masked?
- [x] What 3 layers enforce no-Supabase?
- [x] What is `WEBHOOK_RESULT_SCHEMA_VERSION`? (2)
- [x] How do component tests query DOM? (RTL `findBy*` / `getByRole` only, no snapshots)
- [x] What does the diagnostics ZIP include from a run? (`_log.jsonl`, audit files, redacted variables, capped 5 MB)
## Sign-off
Subsystem is **READY FOR IMPLEMENTATION** by a blind AI. No outstanding ambiguities. Next action is engineering, not specification.
