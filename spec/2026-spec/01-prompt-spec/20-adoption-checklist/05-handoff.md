# 05 — Handoff: where the next AI should start reading

**Date:** 2026-06-02
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

## Acceptance

- [ ] The implementation satisfies the `05 — Handoff: where the next AI should start reading` contract in this file and the folder-level acceptance target: pre-flight, wire-up, go-live, worked example, and handoff steps stay complete.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

