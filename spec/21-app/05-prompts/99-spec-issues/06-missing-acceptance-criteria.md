# C6 — Missing `97-acceptance-criteria.md` per Module

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** High
**Folders affected:** 9

---

## Rule violated

`spec/01-spec-authoring-guide/02-naming-conventions.md`:

> `97-acceptance-criteria.md` — Testable acceptance criteria — ✅ Recommended for all modules

The onboarding prompt (`04-ai-onboarding-prompt.md`) treats a module without acceptance criteria as "not implementation-ready".

## Offenders

| Folder | Has `97-…`? |
|--------|:-----------:|
| `05-prompts/`                        | ❌ |
| `05-prompts/macros/`                 | ❌ |
| `05-prompts/macros/engine/`          | ❌ |
| `05-prompts/macros/examples/`        | ❌ |
| `05-prompts/macros/testing/`         | ❌ |
| `05-prompts/macros/guards/`          | ❌ |
| `05-prompts/macros/observability/`   | ❌ |
| `05-prompts/macro-prompts/`          | ❌ |
| `05-prompts/ui/`                     | ❌ |

## Why a blind AI fails

`97-acceptance-criteria.md` is the file an AI uses to **write the first test**. Without it, the AI either invents criteria (drift) or refuses to implement (stall).

## Fix outline (do NOT execute)

Per folder: 8–15 numbered acceptance bullets, each starting with **"Given / When / Then"** or a measurable Pass/Fail clause.

## Atomic sub-tasks

9 files = tasks 28–36 in the fix-pass plan (not in this audit plan).
