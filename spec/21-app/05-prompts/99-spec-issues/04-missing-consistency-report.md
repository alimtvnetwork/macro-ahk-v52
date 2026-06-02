# C4 — Root Missing `99-consistency-report.md`

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** High
**Files affected:** 1 (folder root)

---

## Rule violated

`spec/01-spec-authoring-guide/02-naming-conventions.md`:

> `99` → `99-consistency-report.md` — Structural health report — ✅ **Always required at top-level**

## Evidence

```
$ ls spec/21-app/05-prompts/99-consistency-report.md
ls: cannot access … : No such file or directory
```

## Why a blind AI fails

The onboarding prompt cross-checks the consistency report's "Last verified" timestamp against the newest mtime in the folder. A missing report = the AI treats the entire subsystem as **unverified** and may refuse to act on it.

## Fix outline

Create `spec/21-app/05-prompts/99-consistency-report.md` with:

- Header (Version, Updated).
- Section "Inventory" — auto-generated `tree` output.
- Section "Compliance" — checklist of C1–C10 from `00-overview.md`.
- Section "Last verified" — ISO timestamp.

## Atomic sub-tasks

1 write + 1 verify = tasks 37–38.
