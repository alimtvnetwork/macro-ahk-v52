# C10 — Parallel "Concept" Docs Without Supersedes Chain

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Medium
**Files affected:** 2 pairs

---

## Rule violated

When two documents describe the same concept, the spec guide requires a `Supersedes:` or `Canonical:` metadata field so a blind AI can pick one. Currently neither pair has the field.

## Offending pairs

### Pair 1 — Concept vs Architecture

| File | Scope |
|------|-------|
| `macros/00-concept.md`             | "Canonical concept" (its own claim) |
| `macros/engine/00-architecture.md` | "Engine architecture" — but Section 1 redefines concept |

Both define `Macro := [Step₁ → Step₂ → … → Stepₙ]`. Different wording, no link between them.

### Pair 2 — Folder layout

| File | Scope |
|------|-------|
| `macros/folder-layout/00-overview.md` | Runtime folder layout |
| `macro-prompts/00-folder-structure.md` | Author-time folder layout |

Both name `standalone-scripts/macro-prompts/`. They drift over time without a cross-link.

## Why a blind AI fails

When two docs contradict, the AI either picks arbitrarily or refuses. Neither is acceptable.

## Fix outline

1. Add `**Canonical:** yes` to the chosen primary in each pair.
2. Add `**Supersedes:** <path>` or `**See also (canonical):** <path>` to the secondary.
3. Strip duplicate definitions from the secondary; replace with a 1-line summary + link.

## Atomic sub-tasks

4 file edits = 4 fix tasks.
