# Prompt Macros — Spec Index

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)
**Status:** Authoring in progress (Block 1 of 10 — see `.lovable/plans/prompt-macros-50-step.md`).

A **Macro** is an ordered, declarative chain of typed prompt steps that the
extension auto-executes: it injects prompts, drives the `next` loop, runs
audits, writes gap analyses under `spec/audit/<runId>/`, and loops until a
target score is met. Macros are persisted as `.macro.json` and may reference
**macro-prompts** (template prompts with `{{ Variables }}`).

## Read order

1. [`00-concept.md`](./00-concept.md) — canonical concept (definitions + JSON shape).
2. [`01-step-kinds.md`](./01-step-kinds.md) — every step Kind with inputs/outputs/errors.
3. [`02-run-model.md`](./02-run-model.md) — runId, state diagram, SW-restart resume.
4. [`03-audit-artifacts.md`](./03-audit-artifacts.md) — files written under `spec/audit/<runId>/`.
5. [`04-loop-and-score.md`](./04-loop-and-score.md) — score parsing, `TargetScore`, `MaxLoops`.
6. [`05-failure-modes.md`](./05-failure-modes.md) — error paths with mandatory failure-log shape.
7. [`06-storage-contract.md`](./06-storage-contract.md) — `chrome.storage.local` keys.
8. [`07-permissions-and-scope.md`](./07-permissions-and-scope.md) — allowed/forbidden write paths.
9. [`folder-layout/`](./folder-layout/) — macro `.macro.json` filesystem layout (Block 4).
10. [`engine/`](./engine/) — runtime architecture (Block 7).
11. [`examples/`](./examples/) — worked examples (Block 8).
12. [`testing/`](./testing/) — unit / component / E2E plans (Block 8).
13. [`guards/`](./guards/) — forbidden writes, watchdogs (Block 9).

## Cross-references

- Variables & templating: [`../variables/`](../variables/)
- Macro-only template prompts: [`../macro-prompts/`](../macro-prompts/)
- JSON Save/Export/Import/Replace: [`../json/`](../json/)
- Prompts button & panel UX: [`../ui/`](../ui/)

## Invariants

- **No-Retry policy** — sequential fail-fast; never recursive backoff (`mem://constraints/no-retry-policy`).
- **No Supabase / No PascalCase storage migration** — `chrome.storage.local` only, identity-only mapping.
- **Failure logs** — every failure carries `Reason` + `ReasonDetail` + full `SelectorAttempts[]` + `VariableContext[]`.
- **`readme.txt` never auto-stamped** with time/clock/git values.
- **Dark-only theme** — HSL semantic tokens only.
