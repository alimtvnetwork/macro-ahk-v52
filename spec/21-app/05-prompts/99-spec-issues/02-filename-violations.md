# C2 — Filename Violates Kebab-Case / NN-Prefix

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Critical
**Files affected:** 6

---

## Rule violated

`spec/01-spec-authoring-guide/02-naming-conventions.md`:

- All file names MUST match `{NN}-{kebab-case}.md`.
- All lowercase, hyphens only — **no uppercase, no underscores, no missing prefix**.

## Offenders

| Current name                              | Problem                          | Should be (proposed)            |
|-------------------------------------------|----------------------------------|---------------------------------|
| `macros/README.md`                        | Uppercase, no `NN-` prefix       | `macros/00-overview.md`         |
| `macros/CHANGELOG.md`                     | Uppercase, no prefix             | `macros/98-changelog.md`        |
| `macros/MIGRATION.md`                     | Uppercase, no prefix             | `macros/95-migration.md`        |
| `macros/READINESS-SCORE.md`               | Uppercase, no prefix             | `macros/96-readiness-score.md`  |
| `variables/README.md`                     | Uppercase, no prefix             | `variables/00-overview.md`      |
| `macro-prompts/README.md`                 | Uppercase, no prefix             | `macro-prompts/00-overview.md`  |

> Note: `README.md` is **not** an allowed spec filename — the guide reserves `00-overview.md` for the module index.

## Why a blind AI fails

The scanner enumerates files by `^[0-9]{2}-.+\.md$`. `README.md`, `CHANGELOG.md`, `MIGRATION.md`, `READINESS-SCORE.md` are **invisible** to the scanner — they would not appear in the spec graph, table of contents, or AI prompt manifest. The AI would never read them.

## Fix outline

1. `git mv` each file to its proposed name.
2. Update inbound links across the spec tree and `.lovable/plans/prompt-macros-50-step.md`.
3. Add forwarding stubs only if external links exist (currently none known).

## Atomic sub-tasks

6 renames + 1 link-fix sweep = tasks 21–27.
