# 01 — Prompt Spec 2026 (generic, host-agnostic)

> **Canonical root:** `spec/01-prompt-spec-2026/` (renamed 2026-06-03 from `spec/01-prompt-spec-2026/`).
> Inner folders renumbered `10..200` → `01..20` (dense). Mapping: `.lovable/audits/2026-06-03-renumber/path-map.json`.

## Overview

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Status:** 120/120 tasks complete; hardening pass in `02-hardening-backlog.md`.

A host-agnostic specification for shipping a **Prompts feature** (prompt
library + Next/Plan automation loop) into any chat-style web app.
The spec deliberately contains no references to this project's
internals — every host integration point is an answered `???` question
(see `00-overview.md`, Q1–Q8).

## Read order (for humans and AIs)

Mirrors the T120 handoff. If you only have 30 minutes, stop at step 8.

1. `00-overview.md` — purpose, Q1–Q8 placeholders, non-goals.
2. `01-plan-tasks-1-20.md` — 120-task index + completion ledger.
3. `02-hardening-backlog.md` — post-T120 punch list (H1–H10).
4. `01-glossary/` — vocabulary + banlist (enforced by `check:spec-banlist`).
5. `02-data-model/` + `03-prompt-source-format/` — what a Prompt **is**.
6. `04-loader-contract/` → `05-ui-contract/` → `06-injection-contract/` + `07-editor-adapters/` — the read/paste happy path.
7. `08-save-create-edit/` — author flows.
8. `09-next-overview/` → `10-queue-model/` → `11-queue-lifecycle/` → `12-delay-engine/` — automation core.
9. `13-failure-handling/` — failure taxonomy + mandatory log shape.
10. `14-plan-mode/` — plan profile delta.
11. `15-settings/` + `16-observability/` — configuration & diagnostics.
12. `17-onboarding/` + `18-test-plan/` — bring-up + QA gates.
13. `19-reference-snippets/` — copy-pastable TS pseudo-code (~40–80 LOC each).
14. `20-adoption-checklist/` — pre-flight, wire-up order, go-live, worked example, handoff.

## Invariants (must not regress)

- No `chrome.*`, `MacroController`, `RiseupAsia*`, `Marco SDK`, or `Supabase` references inside the spec (other than the banlist itself and meta-docs that quote it).
- **No-Retry policy**: fail-fast everywhere; no exponential backoff.
- Failure logs always carry `Reason` + `ReasonDetail` + `SelectorAttempts[]` + `VariableContext[]`.
- `readme.txt` is never auto-stamped with time/clock/git values.
- Verbose logging defaults OFF; full prompt bodies only persisted when ON.

## Tooling

| Command | Purpose |
|---|---|
| `npm run check:spec-banlist` | Enforce vocabulary banlist (H1). |
| `npm run check:spec-prompts-xrefs` | Verify every `T###` reference resolves (H7). |
| `npm run spec:prompts:acceptance` | Extract all `- [ ]` bullets into one master checklist (H8). |
| `npm run spec:prompts:pdf` | Concatenate the spec into a single printable markdown bundle in `/mnt/documents/` (H6). |

## Extending the spec

Add a new top-level folder with a `NNN-` prefix continuing the numbering, then append a row to `01-plan-tasks-1-20.md`'s tracking table. Re-run the four commands above.

## Files
- See [`00-overview.md`](./00-overview.md) and the numbered subdirectories listed in **Read order** above.
