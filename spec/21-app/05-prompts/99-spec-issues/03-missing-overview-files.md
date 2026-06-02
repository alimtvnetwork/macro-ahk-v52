# C3 — Folder Missing `00-overview.md`

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Critical
**Files affected:** 9 folders

---

## Rule violated

`spec/01-spec-authoring-guide/02-naming-conventions.md` § "Reserved File Prefixes":

> `00` → `00-overview.md` — Module index — lists all files, provides metadata — ✅ **Always required**

## Offenders

```
spec/21-app/05-prompts/                       ← root of subsystem
spec/21-app/05-prompts/macros/                ← has README.md instead
spec/21-app/05-prompts/macros/engine/
spec/21-app/05-prompts/macros/examples/
spec/21-app/05-prompts/macros/testing/
spec/21-app/05-prompts/macros/guards/
spec/21-app/05-prompts/macros/observability/
spec/21-app/05-prompts/macro-prompts/         ← has README.md instead
spec/21-app/05-prompts/ui/
```

(`json/`, `variables/`, `macros/folder-layout/` DO have `00-overview.md` — compliant.)

## Why a blind AI fails

`00-overview.md` is the only file the onboarding prompt is guaranteed to read first in each folder. Without it, the AI has no manifest, no per-file purpose, no doc ordering — it would have to `ls` and guess.

## Fix outline

For each offender:

1. Create `00-overview.md` with the standard header + sectioned table:
   ```md
   ## Files in this folder
   | # | File | Purpose |
   |--:|------|---------|
   ```
2. Where a `README.md` exists with overlapping content, fold it into `00-overview.md` then delete (see C2).

## Atomic sub-tasks

9 folder overviews = tasks 28–36.
