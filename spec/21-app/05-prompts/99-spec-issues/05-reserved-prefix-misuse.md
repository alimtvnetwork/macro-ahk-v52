# C5 — Reserved-Prefix Files in Wrong Slot

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** High
**Files affected:** 3

---

## Rule violated

`spec/01-spec-authoring-guide/02-naming-conventions.md` reserves:

- `00-overview.md`
- `96-ai-context.md`
- `97-acceptance-criteria.md`
- `98-changelog.md`
- `99-consistency-report.md`

Any file claiming one of those slots MUST be that document type. Conversely, content equivalent to one of those types MUST live at that slot.

## Offenders

| File | Slot it should occupy | Currently |
|------|-----------------------|-----------|
| `macros/CHANGELOG.md` | `macros/98-changelog.md` | Wrong filename (also C2) |
| `macros/READINESS-SCORE.md` | Not a reserved slot — should be `macros/96-readiness-score.md` (since `96` is "AI-specific context notes", readiness fits) | Wrong filename (also C2) |
| `macros/MIGRATION.md` | No reserved slot; pick `95-migration.md` (free range) | Wrong filename (also C2) |

Also: `spec/21-app/05-prompts/00-all-prompts.md`, `01-start-prompt.md`, etc. occupy low numeric slots **but `00-all-prompts.md` is NOT the folder overview** — it's a prompt list. The actual overview slot at this folder root is empty (see C3).

## Why a blind AI fails

The AI's TOC builder maps reserved prefixes to fixed renderers (changelog → timeline view, consistency-report → health badge, etc.). A misplaced file either appears in the wrong widget or not at all.

## Fix outline

1. Rename per C2 plan.
2. Move `00-all-prompts.md` → e.g. `10-all-prompts.md`, and create a real `00-overview.md` at `05-prompts/` root (C3).

## Atomic sub-tasks

3 renames already counted in C2; 1 additional move + 1 overview-update = tasks 39–40.
