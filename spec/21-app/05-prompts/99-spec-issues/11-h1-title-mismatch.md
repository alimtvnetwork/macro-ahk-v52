# C11 — H1 Title vs Filename Slug Mismatch

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Low–Medium
**Files affected:** ~20 sampled, full count pending

---

## Rule (implied)

The H1 should be the human-readable form of the filename slug. Major drift indicates either a stale title or a misfiled doc.

## Sample evidence

| File | Filename slug | Current H1 | Verdict |
|------|---------------|-----------|---------|
| `macros/CHANGELOG.md`              | `changelog` (after C2 rename) | `Prompt Macros — CHANGELOG` | OK after rename |
| `macros/READINESS-SCORE.md`        | `readiness-score` | `Prompt Macros — Blind-AI Readiness Score` | OK |
| `macros/engine/00-architecture.md` | `architecture` | `Engine Architecture` | OK |
| `macros/engine/01-state-machine.md`| `state-machine` | `State Machine` | OK |
| `macros/00-concept.md`             | `concept` | `Prompt Macros — Concept (Canonical)` | Parenthetical drift |
| `ui/01-prompts-button.md` (TBD)    | `prompts-button` | TBD | TBD |

Looks **mostly OK** in the sample. Full sweep needed to confirm — defer to fix-pass.

## Why a blind AI fails (when it does)

Inconsistent H1s break breadcrumb generators and AI-built TOCs.

## Atomic sub-tasks

1 full-tree sweep + per-mismatch fix = 2–6 tasks once data is in.
